use axum::Json;
use serde::Deserialize;
use crate::db::DatabasePool;
use super::ApiResponse;

/// List API keys
pub async fn list_api_keys_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
) -> Json<ApiResponse<Vec<serde_json::Value>>> {
    match db_pool.list_api_keys().await {
        Ok(keys) => {
            let keys_with_parsed_ids: Vec<serde_json::Value> = keys.into_iter().map(|key| {
                let mut json = serde_json::to_value(&key).unwrap_or(serde_json::json!({}));
                
                if let Some(provider_ids_str) = &key.provider_ids {
                    if let Ok(provider_ids) = serde_json::from_str::<Vec<i64>>(provider_ids_str) {
                        json["provider_ids"] = serde_json::json!(provider_ids);
                    }
                }
                
                json
            }).collect();
            
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
pub struct CreateApiKeyRequest {
    pub name: String,
    pub scope: String,
    pub provider_id: Option<i64>,
    pub provider_ids: Option<Vec<i64>>,
    pub qps_limit: f64,
    pub concurrency_limit: i32,
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

    let new_key = crate::db::NewApiKey {
        owner_id: None, // TODO: Get from auth context
        key_hash,
        name: req.name,
        scope: req.scope,
        provider_id: req.provider_id,
        provider_ids: req.provider_ids,
        qps_limit: req.qps_limit,
        concurrency_limit: req.concurrency_limit,
        expires_at,
    };

    match db_pool.create_api_key(new_key).await {
        Ok(_) => Json(ApiResponse {
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
    axum::extract::Path(id): axum::extract::Path<i32>,
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
    axum::extract::Path(id): axum::extract::Path<i32>,
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
