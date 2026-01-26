use axum::Json;
use serde::Deserialize;
use uuid::Uuid;

use crate::admin::auth_middleware::AdminUserContext;
use crate::db::{DatabasePool, Service};
use super::ApiResponse;

async fn service_belongs_to_org(db_pool: &DatabasePool, service: &Service, org_id: i64) -> Result<bool, String> {
    match db_pool.get_project_by_id(service.project_id).await {
        Ok(Some(p)) => Ok(p.org_id == org_id),
        Ok(None) => Err("project_not_found".to_string()),
        Err(e) => Err(format!("Failed to check project: {}", e)),
    }
}

#[derive(Debug, Deserialize)]
pub struct ListServicesQuery {
    pub project_id: Option<i64>,
    pub org_id: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct CreateServiceRequest {
    pub id: Option<String>,
    pub project_id: Option<i64>,
    pub name: String,
    pub enabled: Option<bool>,
    pub strategy: Option<String>,
    pub fallback_chain: Option<String>,
    pub bound_provider_ids: Option<Vec<i64>>,
    pub qps_limit: Option<f64>,
    pub concurrency_limit: Option<i32>,
    pub max_queue_size: Option<i32>,
    pub max_queue_wait_ms: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateServiceRequest {
    pub name: Option<String>,
    pub enabled: Option<bool>,
    pub strategy: Option<String>,
    pub fallback_chain: Option<String>,
    pub qps_limit: Option<f64>,
    pub concurrency_limit: Option<i32>,
    pub max_queue_size: Option<i32>,
    pub max_queue_wait_ms: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct BindProviderRequest {
    pub provider_id: i64,
}

#[derive(Debug, Deserialize)]
pub struct SetApiKeyServicesRequest {
    pub service_ids: Vec<String>,
}

pub async fn list_services_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
    axum::extract::Query(q): axum::extract::Query<ListServicesQuery>,
    axum::extract::Extension(ctx): axum::extract::Extension<AdminUserContext>,
) -> Json<ApiResponse<Vec<Service>>> {
    let effective_org_id = if ctx.is_admin { q.org_id } else { Some(ctx.org_id) };
    match db_pool.list_services_filtered(q.project_id, effective_org_id).await {
        Ok(services) => Json(ApiResponse {
            success: true,
            data: Some(services),
            message: "Services retrieved".to_string(),
        }),
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            message: format!("Failed to list services: {}", e),
        }),
    }
}

pub async fn get_service_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
    axum::extract::Path(service_id): axum::extract::Path<String>,
    axum::extract::Extension(ctx): axum::extract::Extension<AdminUserContext>,
) -> Json<ApiResponse<Service>> {
    match db_pool.get_service(&service_id).await {
        Ok(Some(service)) => {
            if !ctx.is_admin {
                match service_belongs_to_org(&db_pool, &service, ctx.org_id).await {
                    Ok(true) => {}
                    Ok(false) => {
                        return Json(ApiResponse { success: false, data: None, message: "forbidden".to_string() });
                    }
                    Err(msg) => {
                        return Json(ApiResponse { success: false, data: None, message: msg });
                    }
                }
            }
            Json(ApiResponse {
                success: true,
                data: Some(service),
                message: "Service retrieved".to_string(),
            })
        }
        Ok(None) => Json(ApiResponse {
            success: false,
            data: None,
            message: "Service not found".to_string(),
        }),
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            message: format!("Failed to get service: {}", e),
        }),
    }
}

pub async fn create_service_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
    axum::extract::Extension(ctx): axum::extract::Extension<AdminUserContext>,
    Json(req): Json<CreateServiceRequest>,
) -> Json<ApiResponse<Service>> {
    if !ctx.is_admin && ctx.org_role.as_deref() != Some("admin") {
        return Json(ApiResponse {
            success: false,
            data: None,
            message: "org_admin_required".to_string(),
        });
    }

    if req.name.trim().is_empty() {
        return Json(ApiResponse {
            success: false,
            data: None,
            message: "name is required".to_string(),
        });
    }

    let bound_provider_ids = req
        .bound_provider_ids
        .as_deref()
        .unwrap_or(&[])
        .iter()
        .copied()
        .collect::<Vec<i64>>();

    if bound_provider_ids.is_empty() {
        return Json(ApiResponse {
            success: false,
            data: None,
            message: "bound_provider_ids is required".to_string(),
        });
    }

    let enabled = req.enabled.unwrap_or(true);
    let strategy = req.strategy.unwrap_or_else(|| "Priority".to_string());

    fn slugify(input: &str) -> String {
        let mut out = String::with_capacity(input.len());
        let mut last_dash = false;
        for ch in input.chars() {
            let c = ch.to_ascii_lowercase();
            if c.is_ascii_alphanumeric() {
                out.push(c);
                last_dash = false;
            } else if !last_dash {
                out.push('-');
                last_dash = true;
            }
        }
        let out = out.trim_matches('-').to_string();
        if out.is_empty() { "service".to_string() } else { out }
    }

    let explicit_id = req.id.as_ref().map(|s| s.trim()).filter(|s| !s.is_empty()).map(|s| s.to_string());
    let base_id = explicit_id.clone().unwrap_or_else(|| slugify(&req.name));

    let mut id_to_use = base_id.clone();
    let max_attempts: usize = if explicit_id.is_some() { 1 } else { 5 };

    let project_id = if let Some(pid) = req.project_id {
        pid
    } else if ctx.is_admin {
        1
    } else {
        match db_pool.get_default_project_id_for_org(ctx.org_id).await {
            Ok(Some(pid)) => pid,
            Ok(None) => {
                return Json(ApiResponse {
                    success: false,
                    data: None,
                    message: "no_default_project".to_string(),
                })
            }
            Err(e) => {
                return Json(ApiResponse {
                    success: false,
                    data: None,
                    message: format!("Failed to resolve default project: {}", e),
                })
            }
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
            Ok(None) => {
                return Json(ApiResponse {
                    success: false,
                    data: None,
                    message: "project_not_found".to_string(),
                })
            }
            Err(e) => {
                return Json(ApiResponse {
                    success: false,
                    data: None,
                    message: format!("Failed to check project: {}", e),
                })
            }
        }
    }

    for attempt in 0..max_attempts {
        if attempt > 0 {
            let suffix = Uuid::new_v4().simple().to_string();
            id_to_use = format!("{}-{}", base_id, &suffix[..8]);
        }

        match db_pool
            .create_service_with_project_id(
                project_id,
                &id_to_use,
                &req.name,
                enabled,
                &strategy,
                req.fallback_chain.as_deref(),
                req.qps_limit,
                req.concurrency_limit,
                req.max_queue_size,
                req.max_queue_wait_ms,
            )
            .await
        {
            Ok(true) => {
                for provider_id in &bound_provider_ids {
                    if let Err(e) = db_pool.bind_service_provider(&id_to_use, *provider_id).await {
                        let _ = db_pool.delete_service(&id_to_use).await;
                        return Json(ApiResponse {
                            success: false,
                            data: None,
                            message: format!("Failed to bind model service: {}", e),
                        });
                    }
                }
                return match db_pool.get_service(&id_to_use).await {
                    Ok(Some(service)) => Json(ApiResponse {
                        success: true,
                        data: Some(service),
                        message: "Service created".to_string(),
                    }),
                    Ok(None) => Json(ApiResponse {
                        success: false,
                        data: None,
                        message: "Service created but cannot be retrieved".to_string(),
                    }),
                    Err(e) => Json(ApiResponse {
                        success: false,
                        data: None,
                        message: format!("Failed to retrieve created service: {}", e),
                    }),
                };
            }
            Ok(false) => {
                if explicit_id.is_some() {
                    return Json(ApiResponse {
                        success: false,
                        data: None,
                        message: "service id already exists".to_string(),
                    });
                }
                continue;
            }
            Err(e) => {
                return Json(ApiResponse {
                    success: false,
                    data: None,
                    message: format!("Failed to create service: {}", e),
                });
            }
        }
    }

    Json(ApiResponse {
        success: false,
        data: None,
        message: "Failed to generate a unique service id".to_string(),
    })
}

pub async fn update_service_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
    axum::extract::Path(service_id): axum::extract::Path<String>,
    axum::extract::Extension(ctx): axum::extract::Extension<AdminUserContext>,
    Json(req): Json<UpdateServiceRequest>,
) -> Json<ApiResponse<Service>> {
    if !ctx.is_admin && ctx.org_role.as_deref() != Some("admin") {
        return Json(ApiResponse { success: false, data: None, message: "org_admin_required".to_string() });
    }

    if !ctx.is_admin {
        match db_pool.get_service(&service_id).await {
            Ok(Some(service)) => {
                match service_belongs_to_org(&db_pool, &service, ctx.org_id).await {
                    Ok(true) => {}
                    Ok(false) => {
                        return Json(ApiResponse { success: false, data: None, message: "forbidden".to_string() });
                    }
                    Err(msg) => {
                        return Json(ApiResponse { success: false, data: None, message: msg });
                    }
                }
            }
            Ok(None) => {
                return Json(ApiResponse { success: false, data: None, message: "Service not found".to_string() });
            }
            Err(e) => {
                return Json(ApiResponse { success: false, data: None, message: format!("Failed to get service: {}", e) });
            }
        }
    }

    match db_pool
        .update_service(
            &service_id,
            req.name.as_deref(),
            req.enabled,
            req.strategy.as_deref(),
            req.fallback_chain.as_deref(),
            req.qps_limit,
            req.concurrency_limit,
            req.max_queue_size,
            req.max_queue_wait_ms,
        )
        .await
    {
        Ok(true) => match db_pool.get_service(&service_id).await {
            Ok(Some(service)) => Json(ApiResponse {
                success: true,
                data: Some(service),
                message: "Service updated".to_string(),
            }),
            Ok(None) => Json(ApiResponse {
                success: false,
                data: None,
                message: "Service not found".to_string(),
            }),
            Err(e) => Json(ApiResponse {
                success: false,
                data: None,
                message: format!("Failed to retrieve updated service: {}", e),
            }),
        },
        Ok(false) => Json(ApiResponse {
            success: false,
            data: None,
            message: "Service not found".to_string(),
        }),
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            message: format!("Failed to update service: {}", e),
        }),
    }
}

pub async fn delete_service_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
    axum::extract::Path(service_id): axum::extract::Path<String>,
    axum::extract::Extension(ctx): axum::extract::Extension<AdminUserContext>,
) -> Json<ApiResponse<()>> {
    if !ctx.is_admin && ctx.org_role.as_deref() != Some("admin") {
        return Json(ApiResponse { success: false, data: None, message: "org_admin_required".to_string() });
    }

    if !ctx.is_admin {
        match db_pool.get_service(&service_id).await {
            Ok(Some(service)) => {
                match service_belongs_to_org(&db_pool, &service, ctx.org_id).await {
                    Ok(true) => {}
                    Ok(false) => {
                        return Json(ApiResponse { success: false, data: None, message: "forbidden".to_string() });
                    }
                    Err(msg) => {
                        return Json(ApiResponse { success: false, data: None, message: msg });
                    }
                }
            }
            Ok(None) => {}
            Err(e) => {
                return Json(ApiResponse { success: false, data: None, message: format!("Failed to get service: {}", e) });
            }
        }
    }

    match db_pool.delete_service(&service_id).await {
        Ok(true) => Json(ApiResponse {
            success: true,
            data: Some(()),
            message: "Service deleted".to_string(),
        }),
        Ok(false) => Json(ApiResponse {
            success: false,
            data: None,
            message: "Service not found".to_string(),
        }),
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            message: format!("Failed to delete service: {}", e),
        }),
    }
}

pub async fn list_service_model_services_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
    axum::extract::Path(service_id): axum::extract::Path<String>,
    axum::extract::Extension(ctx): axum::extract::Extension<AdminUserContext>,
) -> Json<ApiResponse<Vec<crate::db::Provider>>> {
    if !ctx.is_admin {
        match db_pool.get_service(&service_id).await {
            Ok(Some(service)) => {
                match service_belongs_to_org(&db_pool, &service, ctx.org_id).await {
                    Ok(true) => {}
                    Ok(false) => {
                        return Json(ApiResponse { success: false, data: None, message: "forbidden".to_string() });
                    }
                    Err(msg) => {
                        return Json(ApiResponse { success: false, data: None, message: msg });
                    }
                }
            }
            Ok(None) => {}
            Err(e) => {
                return Json(ApiResponse { success: false, data: None, message: format!("Failed to get service: {}", e) });
            }
        }
    }

    match db_pool.list_service_providers(&service_id).await {
        Ok(providers) => Json(ApiResponse {
            success: true,
            data: Some(providers),
            message: "Service model services retrieved".to_string(),
        }),
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            message: format!("Failed to list service model services: {}", e),
        }),
    }
}

pub async fn bind_service_model_service_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
    axum::extract::Path(service_id): axum::extract::Path<String>,
    axum::extract::Extension(ctx): axum::extract::Extension<AdminUserContext>,
    Json(req): Json<BindProviderRequest>,
) -> Json<ApiResponse<()>> {
    if !ctx.is_admin && ctx.org_role.as_deref() != Some("admin") {
        return Json(ApiResponse { success: false, data: None, message: "org_admin_required".to_string() });
    }

    if !ctx.is_admin {
        match db_pool.get_service(&service_id).await {
            Ok(Some(service)) => {
                match service_belongs_to_org(&db_pool, &service, ctx.org_id).await {
                    Ok(true) => {}
                    Ok(false) => {
                        return Json(ApiResponse { success: false, data: None, message: "forbidden".to_string() });
                    }
                    Err(msg) => {
                        return Json(ApiResponse { success: false, data: None, message: msg });
                    }
                }
            }
            Ok(None) => {}
            Err(e) => {
                return Json(ApiResponse { success: false, data: None, message: format!("Failed to get service: {}", e) });
            }
        }
    }

    match db_pool.bind_service_provider(&service_id, req.provider_id).await {
        Ok(_) => Json(ApiResponse {
            success: true,
            data: Some(()),
            message: "Model service bound".to_string(),
        }),
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            message: format!("Failed to bind model service: {}", e),
        }),
    }
}

pub async fn unbind_service_model_service_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
    axum::extract::Path((service_id, provider_id)): axum::extract::Path<(String, i64)>,
    axum::extract::Extension(ctx): axum::extract::Extension<AdminUserContext>,
) -> Json<ApiResponse<()>> {
    if !ctx.is_admin && ctx.org_role.as_deref() != Some("admin") {
        return Json(ApiResponse { success: false, data: None, message: "org_admin_required".to_string() });
    }

    if !ctx.is_admin {
        match db_pool.get_service(&service_id).await {
            Ok(Some(service)) => {
                match service_belongs_to_org(&db_pool, &service, ctx.org_id).await {
                    Ok(true) => {}
                    Ok(false) => {
                        return Json(ApiResponse { success: false, data: None, message: "forbidden".to_string() });
                    }
                    Err(msg) => {
                        return Json(ApiResponse { success: false, data: None, message: msg });
                    }
                }
            }
            Ok(None) => {}
            Err(e) => {
                return Json(ApiResponse { success: false, data: None, message: format!("Failed to get service: {}", e) });
            }
        }
    }

    match db_pool.unbind_service_provider(&service_id, provider_id).await {
        Ok(true) => Json(ApiResponse {
            success: true,
            data: Some(()),
            message: "Model service unbound".to_string(),
        }),
        Ok(false) => Json(ApiResponse {
            success: false,
            data: None,
            message: "Binding not found".to_string(),
        }),
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            message: format!("Failed to unbind model service: {}", e),
        }),
    }
}

pub async fn list_api_key_services_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
    axum::extract::Path(api_key_id): axum::extract::Path<i64>,
) -> Json<ApiResponse<Vec<String>>> {
    match db_pool.list_api_key_service_ids(api_key_id).await {
        Ok(service_ids) => Json(ApiResponse {
            success: true,
            data: Some(service_ids),
            message: "API key services retrieved".to_string(),
        }),
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            message: format!("Failed to list API key services: {}", e),
        }),
    }
}

pub async fn set_api_key_services_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
    axum::extract::Path(api_key_id): axum::extract::Path<i64>,
    Json(req): Json<SetApiKeyServicesRequest>,
) -> Json<ApiResponse<()>> {
    match db_pool.get_api_key_by_id(api_key_id).await {
        Ok(Some(key)) => {
            if key.scope != "instance" {
                return Json(ApiResponse {
                    success: false,
                    data: None,
                    message: "Only instance-scoped API keys can be authorized to services".to_string(),
                });
            }
        }
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

    if req.service_ids.len() > 1 {
        return Json(ApiResponse {
            success: false,
            data: None,
            message: "API key can only bind to one service".to_string(),
        });
    }

    match db_pool.replace_api_key_services(api_key_id, &req.service_ids).await {
        Ok(_) => Json(ApiResponse {
            success: true,
            data: Some(()),
            message: "API key services updated".to_string(),
        }),
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            message: format!("Failed to update API key services: {}", e),
        }),
    }
}
