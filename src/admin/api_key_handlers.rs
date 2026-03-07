use super::ApiResponse;
use crate::admin::auth_middleware::AdminUserContext;
use crate::db::DatabasePool;
use axum::Json;
use serde::Deserialize;

async fn api_key_belongs_to_org(
    db_pool: &DatabasePool,
    api_key_id: i64,
    org_id: i64,
) -> Result<bool, String> {
    match db_pool.get_api_key_by_id(api_key_id).await {
        Ok(Some(k)) => match db_pool.get_project_by_id(k.project_id).await {
            Ok(Some(p)) => Ok(p.org_id == org_id),
            Ok(None) => Err("project_not_found".to_string()),
            Err(e) => Err(format!("Failed to check project: {}", e)),
        },
        Ok(None) => Err("api_key_not_found".to_string()),
        Err(e) => Err(format!("Failed to get API key: {}", e)),
    }
}

async fn api_key_owned_by_user(
    db_pool: &DatabasePool,
    api_key_id: i64,
    user_id: i64,
) -> Result<bool, String> {
    match db_pool.get_api_key_by_id(api_key_id).await {
        Ok(Some(k)) => Ok(k.owner_id == Some(user_id)),
        Ok(None) => Err("api_key_not_found".to_string()),
        Err(e) => Err(format!("Failed to get API key: {}", e)),
    }
}

/// List API keys
pub async fn list_api_keys_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
    axum::extract::Query(q): axum::extract::Query<ListApiKeysQuery>,
    axum::extract::Extension(ctx): axum::extract::Extension<AdminUserContext>,
) -> Json<ApiResponse<Vec<serde_json::Value>>> {
    let effective_org_id = if ctx.is_admin {
        q.org_id
    } else {
        Some(ctx.org_id)
    };
    match db_pool
        .list_api_keys_filtered(q.project_id, effective_org_id)
        .await
    {
        Ok(mut keys) => {
            if !ctx.is_admin && ctx.org_role.as_deref() != Some("admin") {
                keys.retain(|k| k.owner_id == Some(ctx.user.id));
            }
            let mut keys_with_parsed_ids: Vec<serde_json::Value> = Vec::new();

            for key in keys {
                let mut json = serde_json::to_value(&key).unwrap_or(serde_json::json!({}));

                if let Some(provider_ids_str) = &key.provider_ids {
                    if let Ok(provider_ids) = serde_json::from_str::<Vec<i64>>(provider_ids_str) {
                        json["provider_ids"] = serde_json::json!(provider_ids);
                    }
                }

                keys_with_parsed_ids.push(json);
            }

            Json(ApiResponse {
                success: true,
                data: Some(keys_with_parsed_ids),
                message: "API keys retrieved".to_string(),
            })
        }
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            message: format!("Failed to list API keys: {}", e),
        }),
    }
}

#[derive(Debug, Deserialize)]
pub struct ListApiKeysQuery {
    pub project_id: Option<i64>,
    pub org_id: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateApiKeyRequest {
    pub name: String,
    pub scope: String,
    pub protocol: Option<String>,
    pub provider_ids: Option<Vec<i64>>,
    pub strategy: Option<String>,
    pub fallback_chain: Option<String>,
    pub qps_limit: Option<f64>,
    pub concurrency_limit: Option<i32>,
}

/// Update API key
pub async fn update_api_key_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
    axum::extract::Path(id): axum::extract::Path<i64>,
    axum::extract::Extension(ctx): axum::extract::Extension<AdminUserContext>,
    Json(req): Json<UpdateApiKeyRequest>,
) -> Json<ApiResponse<()>> {
    if !ctx.is_admin {
        match api_key_belongs_to_org(&db_pool, id, ctx.org_id).await {
            Ok(true) => {}
            Ok(false) => {
                return Json(ApiResponse {
                    success: false,
                    data: None,
                    message: "forbidden".to_string(),
                });
            }
            Err(msg) => {
                if msg == "api_key_not_found" {
                    return Json(ApiResponse {
                        success: false,
                        data: None,
                        message: "API key not found".to_string(),
                    });
                }
                return Json(ApiResponse {
                    success: false,
                    data: None,
                    message: msg,
                });
            }
        }
        if ctx.org_role.as_deref() != Some("admin") {
            match api_key_owned_by_user(&db_pool, id, ctx.user.id).await {
                Ok(true) => {}
                Ok(false) => {
                    return Json(ApiResponse {
                        success: false,
                        data: None,
                        message: "org_admin_required".to_string(),
                    });
                }
                Err(msg) => {
                    if msg == "api_key_not_found" {
                        return Json(ApiResponse {
                            success: false,
                            data: None,
                            message: "API key not found".to_string(),
                        });
                    }
                    return Json(ApiResponse {
                        success: false,
                        data: None,
                        message: msg,
                    });
                }
            }
        }
    }

    if req.scope != "global" && req.scope != "instance" {
        return Json(ApiResponse {
            success: false,
            data: None,
            message: "Invalid scope".to_string(),
        });
    }
    let protocol = req.protocol.clone().unwrap_or_else(|| "openai".to_string());
    if protocol != "openai" && protocol != "anthropic" {
        return Json(ApiResponse {
            success: false,
            data: None,
            message: "Invalid protocol".to_string(),
        });
    }

    let provider_ids = if req.scope == "global" {
        None
    } else {
        req.provider_ids.clone()
    };
    let strategy = req
        .strategy
        .clone()
        .unwrap_or_else(|| "Priority".to_string());
    let fallback_chain = req.fallback_chain.clone();

    let existing_limits = if req.qps_limit.is_none() || req.concurrency_limit.is_none() {
        match db_pool.get_api_key_by_id(id).await {
            Ok(Some(key)) => Some((key.qps_limit, key.concurrency_limit)),
            _ => None,
        }
    } else {
        None
    };

    let qps_limit = req
        .qps_limit
        .or_else(|| existing_limits.map(|(qps, _)| qps))
        .unwrap_or(1_000_000.0);
    let concurrency_limit = req
        .concurrency_limit
        .or_else(|| existing_limits.map(|(_, c)| c))
        .unwrap_or(1_000_000);

    let update_result = db_pool
        .update_api_key(
            id,
            &req.name,
            &req.scope,
            provider_ids.clone(),
            &strategy,
            fallback_chain.as_deref(),
            qps_limit,
            concurrency_limit,
            &protocol,
        )
        .await;

    match update_result {
        Ok(true) => Json(ApiResponse {
            success: true,
            data: Some(()),
            message: "API key updated".to_string(),
        }),
        Ok(false) => Json(ApiResponse {
            success: false,
            data: None,
            message: "API key not found".to_string(),
        }),
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            message: format!("Failed to update API key: {}", e),
        }),
    }
}

#[derive(Debug, Deserialize)]
pub struct CreateApiKeyRequest {
    pub name: String,
    pub scope: String,
    pub protocol: Option<String>,
    pub project_id: Option<i64>,
    pub provider_ids: Option<Vec<i64>>,
    pub strategy: Option<String>,
    pub fallback_chain: Option<String>,
    pub qps_limit: Option<f64>,
    pub concurrency_limit: Option<i32>,
    pub expires_in_days: Option<i64>,
}

/// Create API key
pub async fn create_api_key_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
    axum::extract::Extension(ctx): axum::extract::Extension<AdminUserContext>,
    Json(req): Json<CreateApiKeyRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    if !ctx.is_admin && ctx.org_role.is_none() {
        return Json(ApiResponse {
            success: false,
            data: None,
            message: "org_admin_required".to_string(),
        });
    }

    let key = format!(
        "sk-link-{}",
        uuid::Uuid::new_v4().to_string().replace("-", "")
    );
    // In a real system, we'd hash the key before storing
    let key_hash = key.clone();

    let expires_at = req
        .expires_in_days
        .map(|days| chrono::Utc::now() + chrono::Duration::days(days));

    let scope = req.scope.clone();
    let protocol = req.protocol.clone().unwrap_or_else(|| "openai".to_string());
    if protocol != "openai" && protocol != "anthropic" {
        return Json(ApiResponse {
            success: false,
            data: None,
            message: "Invalid protocol".to_string(),
        });
    }
    let provider_ids = if scope == "global" {
        None
    } else {
        req.provider_ids.clone()
    };
    if !ctx.is_admin {
        if let Some(ids) = &provider_ids {
            match db_pool.list_providers_for_user(ctx.user.id).await {
                Ok(providers) => {
                    let allowed: std::collections::HashSet<i64> =
                        providers.into_iter().map(|p| p.id).collect();
                    if ids.iter().any(|id| !allowed.contains(id)) {
                        return Json(ApiResponse {
                            success: false,
                            data: None,
                            message: "forbidden_provider".to_string(),
                        });
                    }
                }
                Err(_) => {
                    return Json(ApiResponse {
                        success: false,
                        data: None,
                        message: "forbidden_provider".to_string(),
                    });
                }
            }
        }
    }
    if !ctx.is_admin {
        if let Some(ids) = &provider_ids {
            match db_pool.list_providers_for_user(ctx.user.id).await {
                Ok(providers) => {
                    let allowed: std::collections::HashSet<i64> =
                        providers.into_iter().map(|p| p.id).collect();
                    if ids.iter().any(|id| !allowed.contains(id)) {
                        return Json(ApiResponse {
                            success: false,
                            data: None,
                            message: "forbidden_provider".to_string(),
                        });
                    }
                }
                Err(_) => {
                    return Json(ApiResponse {
                        success: false,
                        data: None,
                        message: "forbidden_provider".to_string(),
                    });
                }
            }
        }
    }

    let qps_limit = req.qps_limit.unwrap_or(1_000_000.0);
    let concurrency_limit = req.concurrency_limit.unwrap_or(1_000_000);

    let project_id = if let Some(pid) = req.project_id {
        pid
    } else if ctx.is_admin {
        1
    } else {
        match db_pool.get_default_project_id_for_org(ctx.org_id).await {
            Ok(Some(pid)) => pid,
            _ => 1,
        }
    };

    if !ctx.is_admin {
        match db_pool.get_project_by_id(project_id).await {
            Ok(Some(p)) => {
                if p.org_id != ctx.org_id {
                    return Json(ApiResponse {
                        success: false,
                        data: None,
                        message: "forbidden".to_string(),
                    });
                }
            }
            _ => {
                return Json(ApiResponse {
                    success: false,
                    data: None,
                    message: "project_not_found".to_string(),
                });
            }
        }
    }

    let new_key = crate::db::NewApiKey {
        owner_id: Some(ctx.user.id),
        project_id,
        key_hash,
        name: req.name,
        scope: scope.clone(),
        protocol,
        provider_ids: provider_ids.clone(),
        strategy: req.strategy.clone(),
        fallback_chain: req.fallback_chain.clone(),
        qps_limit,
        concurrency_limit,
        expires_at,
    };

    match db_pool.create_api_key(new_key).await {
        Ok(_api_key_id) => Json(ApiResponse {
            success: true,
            data: Some(serde_json::json!({
                "full_key": key,
                "message": "Please copy this key now, as it will not be shown again."
            })),
            message: "API key created successfully".to_string(),
        }),
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            message: format!("Failed to create API key: {}", e),
        }),
    }
}

/// Delete API key
pub async fn delete_api_key_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
    axum::extract::Path(id): axum::extract::Path<i64>,
    axum::extract::Extension(ctx): axum::extract::Extension<AdminUserContext>,
) -> Json<ApiResponse<()>> {
    if !ctx.is_admin {
        match api_key_belongs_to_org(&db_pool, id, ctx.org_id).await {
            Ok(true) => {}
            Ok(false) => {
                return Json(ApiResponse {
                    success: false,
                    data: None,
                    message: "forbidden".to_string(),
                });
            }
            Err(msg) => {
                if msg == "api_key_not_found" {
                    return Json(ApiResponse {
                        success: false,
                        data: None,
                        message: "API key not found".to_string(),
                    });
                }
                return Json(ApiResponse {
                    success: false,
                    data: None,
                    message: msg,
                });
            }
        }
        if ctx.org_role.as_deref() != Some("admin") {
            match api_key_owned_by_user(&db_pool, id, ctx.user.id).await {
                Ok(true) => {}
                Ok(false) => {
                    return Json(ApiResponse {
                        success: false,
                        data: None,
                        message: "org_admin_required".to_string(),
                    });
                }
                Err(msg) => {
                    if msg == "api_key_not_found" {
                        return Json(ApiResponse {
                            success: false,
                            data: None,
                            message: "API key not found".to_string(),
                        });
                    }
                    return Json(ApiResponse {
                        success: false,
                        data: None,
                        message: msg,
                    });
                }
            }
        }
    }

    match db_pool.delete_api_key(id).await {
        Ok(true) => Json(ApiResponse {
            success: true,
            data: Some(()),
            message: "API key deleted".to_string(),
        }),
        Ok(false) => Json(ApiResponse {
            success: false,
            data: None,
            message: "API key not found".to_string(),
        }),
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            message: format!("Failed to delete API key: {}", e),
        }),
    }
}

/// Toggle API key
pub async fn toggle_api_key_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
    axum::extract::Path(id): axum::extract::Path<i64>,
    axum::extract::Extension(ctx): axum::extract::Extension<AdminUserContext>,
) -> Json<ApiResponse<()>> {
    if !ctx.is_admin {
        match api_key_belongs_to_org(&db_pool, id, ctx.org_id).await {
            Ok(true) => {}
            Ok(false) => {
                return Json(ApiResponse {
                    success: false,
                    data: None,
                    message: "forbidden".to_string(),
                });
            }
            Err(msg) => {
                if msg == "api_key_not_found" {
                    return Json(ApiResponse {
                        success: false,
                        data: None,
                        message: "API key not found".to_string(),
                    });
                }
                return Json(ApiResponse {
                    success: false,
                    data: None,
                    message: msg,
                });
            }
        }
        if ctx.org_role.as_deref() != Some("admin") {
            match api_key_owned_by_user(&db_pool, id, ctx.user.id).await {
                Ok(true) => {}
                Ok(false) => {
                    return Json(ApiResponse {
                        success: false,
                        data: None,
                        message: "org_admin_required".to_string(),
                    });
                }
                Err(msg) => {
                    if msg == "api_key_not_found" {
                        return Json(ApiResponse {
                            success: false,
                            data: None,
                            message: "API key not found".to_string(),
                        });
                    }
                    return Json(ApiResponse {
                        success: false,
                        data: None,
                        message: msg,
                    });
                }
            }
        }
    }

    // Get current status first
    match db_pool.get_api_key_by_id(id).await {
        Ok(Some(key)) => {
            let new_status = if key.status == "active" {
                "disabled"
            } else {
                "active"
            };
            match db_pool.update_api_key_status(id, new_status).await {
                Ok(_) => Json(ApiResponse {
                    success: true,
                    data: Some(()),
                    message: format!("API key status updated to {}", new_status),
                }),
                Err(e) => Json(ApiResponse {
                    success: false,
                    data: None,
                    message: format!("Failed to toggle API key: {}", e),
                }),
            }
        }
        Ok(None) => Json(ApiResponse {
            success: false,
            data: None,
            message: "API key not found".to_string(),
        }),
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            message: format!("Failed to get API key: {}", e),
        }),
    }
}

pub async fn rotate_api_key_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
    axum::extract::Path(id): axum::extract::Path<i64>,
    axum::extract::Extension(ctx): axum::extract::Extension<AdminUserContext>,
) -> Json<ApiResponse<serde_json::Value>> {
    if !ctx.is_admin {
        match api_key_belongs_to_org(&db_pool, id, ctx.org_id).await {
            Ok(true) => {}
            Ok(false) => {
                return Json(ApiResponse {
                    success: false,
                    data: None,
                    message: "forbidden".to_string(),
                });
            }
            Err(msg) => {
                if msg == "api_key_not_found" {
                    return Json(ApiResponse {
                        success: false,
                        data: None,
                        message: "API key not found".to_string(),
                    });
                }
                return Json(ApiResponse {
                    success: false,
                    data: None,
                    message: msg,
                });
            }
        }
        if ctx.org_role.as_deref() != Some("admin") {
            match api_key_owned_by_user(&db_pool, id, ctx.user.id).await {
                Ok(true) => {}
                Ok(false) => {
                    return Json(ApiResponse {
                        success: false,
                        data: None,
                        message: "org_admin_required".to_string(),
                    });
                }
                Err(msg) => {
                    if msg == "api_key_not_found" {
                        return Json(ApiResponse {
                            success: false,
                            data: None,
                            message: "API key not found".to_string(),
                        });
                    }
                    return Json(ApiResponse {
                        success: false,
                        data: None,
                        message: msg,
                    });
                }
            }
        }
    }

    match db_pool.get_api_key_by_id(id).await {
        Ok(Some(_)) => {}
        Ok(None) => {
            return Json(ApiResponse {
                success: false,
                data: None,
                message: "API key not found".to_string(),
            })
        }
        Err(e) => {
            return Json(ApiResponse {
                success: false,
                data: None,
                message: format!("Failed to get API key: {}", e),
            })
        }
    }

    let key = format!(
        "sk-link-{}",
        uuid::Uuid::new_v4().to_string().replace("-", "")
    );
    let key_hash = key.clone();

    match db_pool.update_api_key_hash(id, &key_hash).await {
        Ok(true) => Json(ApiResponse {
            success: true,
            data: Some(serde_json::json!({
                "full_key": key,
                "message": "Please copy this key now, as it will not be shown again."
            })),
            message: "API key rotated".to_string(),
        }),
        Ok(false) => Json(ApiResponse {
            success: false,
            data: None,
            message: "API key not found".to_string(),
        }),
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            message: format!("Failed to rotate API key: {}", e),
        }),
    }
}
