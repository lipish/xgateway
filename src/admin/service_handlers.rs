use axum::Json;
use serde::Deserialize;

use crate::db::{DatabasePool, Service};
use super::ApiResponse;

#[derive(Debug, Deserialize)]
pub struct CreateServiceRequest {
    pub id: String,
    pub name: String,
    pub enabled: Option<bool>,
    pub strategy: Option<String>,
    pub fallback_chain: Option<String>,
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
) -> Json<ApiResponse<Vec<Service>>> {
    match db_pool.list_services().await {
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
) -> Json<ApiResponse<Service>> {
    match db_pool.get_service(&service_id).await {
        Ok(Some(service)) => Json(ApiResponse {
            success: true,
            data: Some(service),
            message: "Service retrieved".to_string(),
        }),
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
    Json(req): Json<CreateServiceRequest>,
) -> Json<ApiResponse<Service>> {
    if req.id.trim().is_empty() || req.name.trim().is_empty() {
        return Json(ApiResponse {
            success: false,
            data: None,
            message: "id and name are required".to_string(),
        });
    }

    let enabled = req.enabled.unwrap_or(true);
    let strategy = req.strategy.unwrap_or_else(|| "Priority".to_string());

    match db_pool
        .create_service(
            &req.id,
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
        Ok(_) => {
            match db_pool.get_service(&req.id).await {
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
            }
        }
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            message: format!("Failed to create service: {}", e),
        }),
    }
}

pub async fn update_service_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
    axum::extract::Path(service_id): axum::extract::Path<String>,
    Json(req): Json<UpdateServiceRequest>,
) -> Json<ApiResponse<Service>> {
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
) -> Json<ApiResponse<()>> {
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
) -> Json<ApiResponse<Vec<crate::db::Provider>>> {
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
    Json(req): Json<BindProviderRequest>,
) -> Json<ApiResponse<()>> {
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
) -> Json<ApiResponse<()>> {
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
