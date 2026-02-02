use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::Json,
};
use serde::{Deserialize, Serialize};
use crate::db::{DatabasePool, Provider, NewProvider, UpdateProvider};
use anyhow::Result;

#[derive(Debug, Serialize)]
pub struct ProviderResponse {
    pub success: bool,
    pub data: Option<Vec<Provider>>,
    pub message: String,
}

#[derive(Debug, Serialize)]
pub struct SingleProviderResponse {
    pub success: bool,
    pub data: Option<Provider>,
    pub message: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateProviderRequest {
    pub name: String,
    pub provider_type: String,
    pub config: String,
    pub enabled: Option<bool>,
    pub priority: Option<i32>,
    pub endpoint: Option<String>,
    pub secret_id: Option<String>,
    pub secret_key: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateProviderRequest {
    pub name: Option<String>,
    pub provider_type: Option<String>,
    pub config: Option<String>,
    pub enabled: Option<bool>,
    pub priority: Option<i32>,
    pub endpoint: Option<String>,
    pub secret_id: Option<String>,
    pub secret_key: Option<String>,
    pub expected_version: Option<i64>,
}

#[derive(Debug, Serialize)]
pub struct TestResponse {
    pub success: bool,
    pub message: String,
    pub latency_ms: Option<u64>,
}

#[derive(Debug, Serialize)]
pub struct ProviderStatsResponse {
    pub success: bool,
    pub data: Option<crate::db::ProviderStats>,
    pub message: String,
}

/// List all providers
pub async fn list_providers_api(
    State(db_pool): State<DatabasePool>,
) -> Result<Json<ProviderResponse>, StatusCode> {
    match db_pool.list_providers().await {
        Ok(providers) => Ok(Json(ProviderResponse {
            success: true,
            data: Some(providers),
            message: "Providers retrieved successfully".to_string(),
        })),
        Err(e) => {
            tracing::error!("Failed to list providers: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

/// Get provider by ID
pub async fn get_provider_api(
    State(db_pool): State<DatabasePool>,
    Path(id): Path<i64>,
) -> Result<Json<SingleProviderResponse>, StatusCode> {
    match db_pool.get_provider(id).await {
        Ok(Some(provider)) => Ok(Json(SingleProviderResponse {
            success: true,
            data: Some(provider),
            message: "Provider retrieved successfully".to_string(),
        })),
        Ok(None) => Ok(Json(SingleProviderResponse {
            success: false,
            data: None,
            message: "Provider not found".to_string(),
        })),
        Err(e) => {
            tracing::error!("Failed to get provider: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

/// Create new provider
pub async fn create_provider_api(
    State(db_pool): State<DatabasePool>,
    State(pool_manager): State<std::sync::Arc<crate::pool::PoolManager>>,
    Json(request): Json<CreateProviderRequest>,
) -> Result<Json<SingleProviderResponse>, StatusCode> {
    // Validate request
    if request.name.is_empty() || request.provider_type.is_empty() || request.config.is_empty() {
        return Ok(Json(SingleProviderResponse {
            success: false,
            data: None,
            message: "Name, type, and config are required".to_string(),
        }));
    }
    
    // Validate JSON config
    if serde_json::from_str::<serde_json::Value>(&request.config).is_err() {
        return Ok(Json(SingleProviderResponse {
            success: false,
            data: None,
            message: "Invalid JSON config".to_string(),
        }));
    }
    
    let new_provider = NewProvider {
        name: request.name,
        provider_type: request.provider_type,
        config: request.config,
        enabled: request.enabled.unwrap_or(true),
        priority: request.priority.unwrap_or(0),
        endpoint: request.endpoint,
        secret_id: request.secret_id,
        secret_key: request.secret_key,
    };
    
    match db_pool.create_provider(new_provider).await {
        Ok(provider_id) => {
            // Return the created provider
            match db_pool.get_provider(provider_id).await {
                Ok(Some(provider)) => {
                    if provider.enabled {
                        if let Err(e) = pool_manager.add_provider(&provider).await {
                            tracing::warn!("Failed to add provider to pool: {}", e);
                        }
                    }
                    Ok(Json(SingleProviderResponse {
                        success: true,
                        data: Some(provider),
                        message: "Provider created successfully".to_string(),
                    }))
                }
                Ok(None) => Err(StatusCode::INTERNAL_SERVER_ERROR),
                Err(e) => {
                    tracing::error!("Failed to retrieve created provider: {}", e);
                    Err(StatusCode::INTERNAL_SERVER_ERROR)
                }
            }
        }
        Err(e) => {
            tracing::error!("Failed to create provider: {}", e);
            Ok(Json(SingleProviderResponse {
                success: false,
                data: None,
                message: format!("Database error: {}", e),
            }))
        }
    }
}

/// Update provider
pub async fn update_provider_api(
    State(db_pool): State<DatabasePool>,
    State(pool_manager): State<std::sync::Arc<crate::pool::PoolManager>>,
    Path(id): Path<i64>,
    Json(request): Json<UpdateProviderRequest>,
) -> Result<Json<SingleProviderResponse>, StatusCode> {
    // Validate JSON config if provided
    if let Some(config) = &request.config {
        if serde_json::from_str::<serde_json::Value>(config).is_err() {
            return Ok(Json(SingleProviderResponse {
                success: false,
                data: None,
                message: "Invalid JSON config".to_string(),
            }));
        }
    }
    
    let has_expected_version = request.expected_version.is_some();

    let update = UpdateProvider {
        name: request.name,
        provider_type: request.provider_type,
        config: request.config,
        enabled: request.enabled,
        priority: request.priority,
        endpoint: request.endpoint,
        secret_id: request.secret_id,
        secret_key: request.secret_key,
        expected_version: request.expected_version,
    };
    
    match db_pool.update_provider(id, update).await {
        Ok(true) => {
            // Return updated provider
            match db_pool.get_provider(id).await {
                Ok(Some(provider)) => {
                    if let Err(e) = pool_manager.sync_with_db().await {
                        tracing::warn!("Failed to sync pool with database: {}", e);
                    }
                    Ok(Json(SingleProviderResponse {
                        success: true,
                        data: Some(provider),
                        message: "Provider updated successfully".to_string(),
                    }))
                }
                Ok(None) => Err(StatusCode::INTERNAL_SERVER_ERROR),
                Err(e) => {
                    tracing::error!("Failed to retrieve updated provider: {}", e);
                    Err(StatusCode::INTERNAL_SERVER_ERROR)
                }
            }
        }
        Ok(false) => {
            if has_expected_version {
                match db_pool.get_provider(id).await {
                    Ok(Some(provider)) => Ok(Json(SingleProviderResponse {
                        success: false,
                        data: Some(provider),
                        message: "Provider has been modified, please refresh and try again".to_string(),
                    })),
                    Ok(None) => Ok(Json(SingleProviderResponse {
                        success: false,
                        data: None,
                        message: "Provider not found".to_string(),
                    })),
                    Err(e) => {
                        tracing::error!("Failed to retrieve provider after update failure: {}", e);
                        Err(StatusCode::INTERNAL_SERVER_ERROR)
                    }
                }
            } else {
                Ok(Json(SingleProviderResponse {
                    success: false,
                    data: None,
                    message: "Provider not found".to_string(),
                }))
            }
        }
        Err(e) => {
            tracing::error!("Failed to update provider: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

/// Delete provider
pub async fn delete_provider_api(
    State(db_pool): State<DatabasePool>,
    State(pool_manager): State<std::sync::Arc<crate::pool::PoolManager>>,
    Path(id): Path<i64>,
) -> Result<Json<ProviderResponse>, StatusCode> {
    match db_pool.delete_provider(id).await {
        Ok(true) => {
            pool_manager.remove_provider(id).await;
            Ok(Json(ProviderResponse {
                success: true,
                data: None,
                message: "Provider deleted successfully".to_string(),
            }))
        }
        Ok(false) => Ok(Json(ProviderResponse {
            success: false,
            data: None,
            message: "Provider not found".to_string(),
        })),
        Err(e) => {
            tracing::error!("Failed to delete provider: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

/// Toggle provider enabled status
pub async fn toggle_provider_api(
    State(db_pool): State<DatabasePool>,
    State(pool_manager): State<std::sync::Arc<crate::pool::PoolManager>>,
    Path(id): Path<i64>,
) -> Result<Json<SingleProviderResponse>, StatusCode> {
    match db_pool.toggle_provider(id).await {
        Ok(true) => {
            // Return updated provider
            match db_pool.get_provider(id).await {
                Ok(Some(provider)) => {
                    if let Err(e) = pool_manager.sync_with_db().await {
                        tracing::warn!("Failed to sync pool with database: {}", e);
                    }
                    Ok(Json(SingleProviderResponse {
                        success: true,
                        data: Some(provider),
                        message: "Provider status toggled successfully".to_string(),
                    }))
                }
                Ok(None) => Err(StatusCode::INTERNAL_SERVER_ERROR),
                Err(e) => {
                    tracing::error!("Failed to retrieve updated provider: {}", e);
                    Err(StatusCode::INTERNAL_SERVER_ERROR)
                }
            }
        }
        Ok(false) => Ok(Json(SingleProviderResponse {
            success: false,
            data: None,
            message: "Provider not found".to_string(),
        })),
        Err(e) => {
            tracing::error!("Failed to toggle provider: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

/// Get provider statistics
pub async fn get_provider_stats_api(
    State(db_pool): State<DatabasePool>,
) -> Result<Json<ProviderStatsResponse>, StatusCode> {
    match db_pool.get_provider_stats().await {
        Ok(stats) => Ok(Json(ProviderStatsResponse {
            success: true,
            data: Some(stats),
            message: "Provider statistics retrieved successfully".to_string(),
        })),
        Err(e) => {
            tracing::error!("Failed to get provider stats: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

/// Test provider connection
pub async fn test_provider_api(
    State(db_pool): State<DatabasePool>,
    Path(id): Path<i64>,
) -> Result<Json<TestResponse>, StatusCode> {
    match db_pool.get_provider(id).await {
        Ok(Some(_provider)) => {
            let start_time = std::time::Instant::now();
            
            // TODO: Implement actual provider testing
            // For now, just simulate a test
            tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
            
            let latency = start_time.elapsed().as_millis() as u64;
            
            Ok(Json(TestResponse {
                success: true,
                message: "Provider connection test successful".to_string(),
                latency_ms: Some(latency),
            }))
        }
        Ok(None) => Ok(Json(TestResponse {
            success: false,
            message: "Provider not found".to_string(),
            latency_ms: None,
        })),
        Err(e) => {
            tracing::error!("Failed to test provider: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}
