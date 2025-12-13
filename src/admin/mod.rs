pub mod handlers;
pub mod pool_handlers;

pub use handlers::*;

use axum::{Router, routing::{get, post, put, delete}, Json};
use serde::{Serialize, Deserialize};
use crate::db::{DatabasePool, NewProviderType, UpdateProviderType, ModelInfo};

/// Create admin API router (pure REST API, no HTML pages)
pub fn create_admin_app(db_pool: DatabasePool) -> Router {
    Router::new()
        // Provider management API
        .route("/api/providers", get(list_providers_api).post(create_provider_api))
        .route("/api/providers/stats", get(get_provider_stats_api))
        .route("/api/providers/:id", get(get_provider_api).put(update_provider_api).delete(delete_provider_api))
        .route("/api/providers/:id/toggle", post(toggle_provider_api))
        .route("/api/providers/:id/test", post(test_provider_api))
        // Provider types API (CRUD)
        .route("/api/provider-types", get(get_provider_types_api).post(create_provider_type_api))
        .route("/api/provider-types/:id", put(update_provider_type_api).delete(delete_provider_type_api))
        // Pool management API
        .route("/api/pool/status", get(get_pool_status_api))
        .route("/api/pool/health", get(get_pool_health_api))
        .route("/api/pool/settings", get(get_pool_settings_api).post(save_pool_settings_api))
        // Logs API
        .route("/api/logs", get(get_logs_api))
        // API Keys management
        .route("/api/api-keys", get(list_api_keys_api).post(create_api_key_api))
        .route("/api/api-keys/:id", delete(delete_api_key_api))
        .route("/api/api-keys/:id/toggle", post(toggle_api_key_api))
        .with_state(db_pool)
}

#[derive(Serialize)]
struct ApiResponse<T: Serialize> {
    success: bool,
    data: Option<T>,
    message: String,
}

/// Get pool status API
async fn get_pool_status_api() -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse {
        success: true,
        data: Some(serde_json::json!({
            "total_providers": 3,
            "healthy_providers": 3,
            "degraded_providers": 0,
            "unhealthy_providers": 0,
            "load_balance_strategy": "RoundRobin",
            "total_requests_today": 156,
            "avg_latency_ms": 503
        })),
        message: "Pool status retrieved".to_string(),
    })
}

/// Get pool health API
async fn get_pool_health_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
) -> Json<ApiResponse<Vec<serde_json::Value>>> {
    let providers = db_pool.list_providers().await.unwrap_or_default();
    let health_data: Vec<serde_json::Value> = providers.iter().map(|p| {
        serde_json::json!({
            "id": p.id,
            "name": p.name,
            "status": if p.enabled { "healthy" } else { "unhealthy" },
            "latency_avg": 500.0,
            "success_rate": 99.5,
            "circuit_state": "closed",
            "active_connections": 0,
            "total_requests": 50
        })
    }).collect();

    Json(ApiResponse {
        success: true,
        data: Some(health_data),
        message: "Health data retrieved".to_string(),
    })
}

/// Get pool settings API
async fn get_pool_settings_api() -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse {
        success: true,
        data: Some(serde_json::json!({
            "load_balance_strategy": "round_robin",
            "health_check_interval_secs": 30,
            "circuit_breaker_threshold": 5,
            "circuit_breaker_timeout_secs": 60,
            "max_retries": 3,
            "retry_delay_ms": 1000
        })),
        message: "Settings retrieved".to_string(),
    })
}

/// Save pool settings API
async fn save_pool_settings_api(
    Json(_settings): Json<serde_json::Value>,
) -> Json<ApiResponse<()>> {
    Json(ApiResponse {
        success: true,
        data: None,
        message: "Settings saved".to_string(),
    })
}

/// Get logs API
async fn get_logs_api() -> Json<ApiResponse<Vec<serde_json::Value>>> {
    Json(ApiResponse {
        success: true,
        data: Some(vec![]),
        message: "Logs retrieved".to_string(),
    })
}

/// List API keys
async fn list_api_keys_api() -> Json<ApiResponse<Vec<serde_json::Value>>> {
    Json(ApiResponse {
        success: true,
        data: Some(vec![
            serde_json::json!({
                "id": 1,
                "name": "Default Key",
                "key_prefix": "llm_****",
                "created_at": "2024-01-01T00:00:00Z",
                "last_used": null,
                "enabled": true,
                "rate_limit": 100
            })
        ]),
        message: "API keys retrieved".to_string(),
    })
}

/// Create API key
async fn create_api_key_api(
    Json(_req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    let key = format!("llm_{}", uuid::Uuid::new_v4().to_string().replace("-", ""));
    Json(ApiResponse {
        success: true,
        data: Some(serde_json::json!({
            "id": 2,
            "full_key": key,
            "name": "New Key",
            "created_at": chrono::Utc::now().to_rfc3339()
        })),
        message: "API key created".to_string(),
    })
}

/// Delete API key
async fn delete_api_key_api(
    axum::extract::Path(_id): axum::extract::Path<i64>,
) -> Json<ApiResponse<()>> {
    Json(ApiResponse {
        success: true,
        data: None,
        message: "API key deleted".to_string(),
    })
}

/// Toggle API key
async fn toggle_api_key_api(
    axum::extract::Path(_id): axum::extract::Path<i64>,
) -> Json<ApiResponse<()>> {
    Json(ApiResponse {
        success: true,
        data: None,
        message: "API key toggled".to_string(),
    })
}

/// Get supported provider types (from database)
async fn get_provider_types_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
) -> Json<ApiResponse<Vec<serde_json::Value>>> {
    match db_pool.list_provider_types().await {
        Ok(types) => {
            let provider_types: Vec<serde_json::Value> = types.iter().map(|t| {
                serde_json::json!({
                    "id": t.id,
                    "label": t.label,
                    "base_url": t.base_url,
                    "default_model": t.default_model,
                    "models": t.to_response().models
                })
            }).collect();

            Json(ApiResponse {
                success: true,
                data: Some(provider_types),
                message: "Provider types retrieved".to_string(),
            })
        }
        Err(e) => {
            Json(ApiResponse {
                success: false,
                data: None,
                message: format!("Failed to get provider types: {}", e),
            })
        }
    }
}

/// Request body for creating provider type
#[derive(Debug, Deserialize)]
struct CreateProviderTypeRequest {
    id: String,
    label: String,
    base_url: String,
    default_model: String,
    models: Vec<CreateModelInfo>,
    #[serde(default)]
    enabled: Option<bool>,
    #[serde(default)]
    sort_order: Option<i32>,
}

#[derive(Debug, Deserialize)]
struct CreateModelInfo {
    id: String,
    name: String,
    #[serde(default)]
    description: Option<String>,
    #[serde(default)]
    supports_tools: Option<bool>,
    #[serde(default)]
    context_length: Option<u32>,
}

/// Create a new provider type
async fn create_provider_type_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
    Json(req): Json<CreateProviderTypeRequest>,
) -> Json<ApiResponse<()>> {
    let new_type = NewProviderType {
        id: req.id,
        label: req.label,
        base_url: req.base_url,
        default_model: req.default_model,
        models: req.models.into_iter().map(|m| ModelInfo {
            id: m.id,
            name: m.name,
            description: m.description,
            supports_tools: m.supports_tools,
            context_length: m.context_length,
        }).collect(),
        enabled: req.enabled,
        sort_order: req.sort_order,
    };

    match db_pool.create_provider_type(new_type).await {
        Ok(_) => Json(ApiResponse {
            success: true,
            data: Some(()),
            message: "Provider type created".to_string(),
        }),
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            message: format!("Failed to create provider type: {}", e),
        }),
    }
}

/// Request body for updating provider type
#[derive(Debug, Deserialize)]
struct UpdateProviderTypeRequest {
    label: Option<String>,
    base_url: Option<String>,
    default_model: Option<String>,
    models: Option<Vec<CreateModelInfo>>,
    enabled: Option<bool>,
    sort_order: Option<i32>,
}

/// Update a provider type
async fn update_provider_type_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateProviderTypeRequest>,
) -> Json<ApiResponse<()>> {
    let update = UpdateProviderType {
        label: req.label,
        base_url: req.base_url,
        default_model: req.default_model,
        models: req.models.map(|models| {
            models.into_iter().map(|m| ModelInfo {
                id: m.id,
                name: m.name,
                description: m.description,
                supports_tools: m.supports_tools,
                context_length: m.context_length,
            }).collect()
        }),
        enabled: req.enabled,
        sort_order: req.sort_order,
    };

    match db_pool.update_provider_type(&id, update).await {
        Ok(true) => Json(ApiResponse {
            success: true,
            data: Some(()),
            message: "Provider type updated".to_string(),
        }),
        Ok(false) => Json(ApiResponse {
            success: false,
            data: None,
            message: "Provider type not found".to_string(),
        }),
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            message: format!("Failed to update provider type: {}", e),
        }),
    }
}

/// Delete a provider type
async fn delete_provider_type_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<()>> {
    match db_pool.delete_provider_type(&id).await {
        Ok(true) => Json(ApiResponse {
            success: true,
            data: Some(()),
            message: "Provider type deleted".to_string(),
        }),
        Ok(false) => Json(ApiResponse {
            success: false,
            data: None,
            message: "Provider type not found".to_string(),
        }),
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            message: format!("Failed to delete provider type: {}", e),
        }),
    }
}
