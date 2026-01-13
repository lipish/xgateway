use axum::Json;
use serde::Deserialize;
use crate::db::DatabasePool;
use super::ApiResponse;

fn unique_strings(mut v: Vec<String>) -> Vec<String> {
    v.sort();
    v.dedup();
    v
}

async fn derive_service_ids_from_legacy(
    db_pool: &DatabasePool,
    provider_id: Option<i64>,
    provider_ids: Option<&Vec<i64>>,
) -> Result<Vec<String>, anyhow::Error> {
    let providers = db_pool.list_providers().await?;
    let mut ids: Vec<i64> = Vec::new();
    if let Some(id) = provider_id {
        ids.push(id);
    }
    if let Some(more) = provider_ids {
        ids.extend(more.iter().copied());
    }
    ids.sort();
    ids.dedup();

    if ids.is_empty() {
        return Ok(Vec::new());
    }

    let mut service_ids = Vec::new();
    for id in ids {
        match providers.iter().find(|p| p.id == id) {
            Some(p) => service_ids.push(p.name.clone()),
            None => {
                return Err(anyhow::anyhow!("Provider {} not found", id));
            }
        }
    }

    Ok(unique_strings(service_ids))
}

/// List API keys
pub async fn list_api_keys_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
) -> Json<ApiResponse<Vec<serde_json::Value>>> {
    match db_pool.list_api_keys().await {
        Ok(keys) => {
            let mut keys_with_parsed_ids: Vec<serde_json::Value> = Vec::new();

            for key in keys {
                let mut json = serde_json::to_value(&key).unwrap_or(serde_json::json!({}));

                if let Some(provider_ids_str) = &key.provider_ids {
                    if let Ok(provider_ids) = serde_json::from_str::<Vec<i64>>(provider_ids_str) {
                        json["provider_ids"] = serde_json::json!(provider_ids);
                    }
                }

                if key.scope == "instance" {
                    if let Ok(service_ids) = db_pool.list_api_key_service_ids(key.id).await {
                        json["service_ids"] = serde_json::json!(service_ids);
                    }
                }

                keys_with_parsed_ids.push(json);
            }
            
            Json(ApiResponse {
                success: true,
                data: Some(keys_with_parsed_ids),
                message: "API keys retrieved".to_string(),
            })
        },
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            message: format!("Failed to list API keys: {}", e),
        }),
    }
}

#[derive(Debug, Deserialize)]
pub struct UpdateApiKeyRequest {
    pub name: String,
    pub scope: String,
    pub provider_id: Option<i64>,
    pub provider_ids: Option<Vec<i64>>,
    pub service_ids: Option<Vec<String>>,
    pub qps_limit: Option<f64>,
    pub concurrency_limit: Option<i32>,
}

/// Update API key
pub async fn update_api_key_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
    axum::extract::Path(id): axum::extract::Path<i64>,
    Json(req): Json<UpdateApiKeyRequest>,
) -> Json<ApiResponse<()>> {
    if req.scope != "global" && req.scope != "instance" {
        return Json(ApiResponse {
            success: false,
            data: None,
            message: "Invalid scope".to_string(),
        });
    }

    let (provider_id, provider_ids) = if req.scope == "global" {
        (None, None)
    } else {
        (req.provider_id, req.provider_ids.clone())
    };

    let existing_limits = if req.qps_limit.is_none() || req.concurrency_limit.is_none() {
        match db_pool.get_api_key_by_id(id).await {
            Ok(Some(key)) => Some((key.qps_limit, key.concurrency_limit)),
            _ => None,
        }
    } else {
        None
    };

    let qps_limit = req.qps_limit.or_else(|| existing_limits.map(|(qps, _)| qps)).unwrap_or(1_000_000.0);
    let concurrency_limit = req
        .concurrency_limit
        .or_else(|| existing_limits.map(|(_, c)| c))
        .unwrap_or(1_000_000);

    let update_result = db_pool
        .update_api_key(id, &req.name, &req.scope, provider_id, provider_ids.clone(), qps_limit, concurrency_limit)
        .await;

    match update_result {
        Ok(true) => {
            // Update api_key_services
            if req.scope == "global" {
                if let Err(e) = db_pool.replace_api_key_services(id, &Vec::new()).await {
                    return Json(ApiResponse {
                        success: false,
                        data: None,
                        message: format!("API key updated but failed to clear services: {}", e),
                    });
                }
            } else {
                let derived = match &req.service_ids {
                    Some(service_ids) => Ok(unique_strings(service_ids.clone())),
                    None => derive_service_ids_from_legacy(&db_pool, req.provider_id, provider_ids.as_ref()).await,
                };

                let service_ids = match derived {
                    Ok(ids) => ids,
                    Err(e) => {
                        return Json(ApiResponse {
                            success: false,
                            data: None,
                            message: format!("API key updated but invalid service mapping: {}", e),
                        })
                    }
                };

                if service_ids.is_empty() {
                    return Json(ApiResponse {
                        success: false,
                        data: None,
                        message: "Instance-scoped API key requires service_ids (or legacy provider_id/provider_ids)".to_string(),
                    });
                }

                if let Err(e) = db_pool.replace_api_key_services(id, &service_ids).await {
                    return Json(ApiResponse {
                        success: false,
                        data: None,
                        message: format!("API key updated but failed to set services: {}", e),
                    });
                }
            }

            Json(ApiResponse {
                success: true,
                data: Some(()),
                message: "API key updated".to_string(),
            })
        }
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
    pub provider_id: Option<i64>,
    pub provider_ids: Option<Vec<i64>>,
    pub service_ids: Option<Vec<String>>,
    pub qps_limit: Option<f64>,
    pub concurrency_limit: Option<i32>,
    pub expires_in_days: Option<i64>,
}

/// Create API key
pub async fn create_api_key_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
    Json(req): Json<CreateApiKeyRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let key = format!("sk-link-{}", uuid::Uuid::new_v4().to_string().replace("-", ""));
    // In a real system, we'd hash the key before storing
    let key_hash = key.clone(); 
    
    let expires_at = req.expires_in_days.map(|days| {
        chrono::Utc::now() + chrono::Duration::days(days)
    });

    let scope = req.scope.clone();
    let (provider_id, provider_ids) = if scope == "global" {
        (None, None)
    } else {
        (req.provider_id, req.provider_ids.clone())
    };
    let service_ids = req.service_ids.clone();

    let qps_limit = req.qps_limit.unwrap_or(1_000_000.0);
    let concurrency_limit = req.concurrency_limit.unwrap_or(1_000_000);

    let new_key = crate::db::NewApiKey {
        owner_id: None, // TODO: Get from auth context
        key_hash,
        name: req.name,
        scope: scope.clone(),
        provider_id,
        provider_ids: provider_ids.clone(),
        qps_limit,
        concurrency_limit,
        expires_at,
    };

    match db_pool.create_api_key(new_key).await {
        Ok(api_key_id) => {
            if scope == "instance" {
                let derived = match &service_ids {
                    Some(service_ids) => Ok(unique_strings(service_ids.clone())),
                    None => derive_service_ids_from_legacy(&db_pool, provider_id, provider_ids.as_ref()).await,
                };

                let service_ids = match derived {
                    Ok(ids) => ids,
                    Err(e) => {
                        return Json(ApiResponse {
                            success: false,
                            data: None,
                            message: format!("Failed to create API key services mapping: {}", e),
                        })
                    }
                };

                if service_ids.is_empty() {
                    return Json(ApiResponse {
                        success: false,
                        data: None,
                        message: "Instance-scoped API key requires service_ids (or legacy provider_id/provider_ids)".to_string(),
                    });
                }

                if let Err(e) = db_pool.replace_api_key_services(api_key_id, &service_ids).await {
                    return Json(ApiResponse {
                        success: false,
                        data: None,
                        message: format!("API key created but failed to set services: {}", e),
                    });
                }
            }

            Json(ApiResponse {
            success: true,
            data: Some(serde_json::json!({
                "full_key": key,
                "message": "Please copy this key now, as it will not be shown again."
            })),
            message: "API key created successfully".to_string(),
            })
        }
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
) -> Json<ApiResponse<()>> {
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
) -> Json<ApiResponse<()>> {
    // Get current status first
    match db_pool.get_api_key_by_id(id).await {
        Ok(Some(key)) => {
            let new_status = if key.status == "active" { "disabled" } else { "active" };
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
) -> Json<ApiResponse<serde_json::Value>> {
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

    let key = format!("sk-link-{}", uuid::Uuid::new_v4().to_string().replace("-", ""));
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
