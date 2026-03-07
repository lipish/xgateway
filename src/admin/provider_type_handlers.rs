use super::ApiResponse;
use crate::adapter::types::DriverType;
use crate::db::{DatabasePool, ModelInfo, NewProviderType, UpdateProviderType};
use axum::Json;
use serde::Deserialize;

/// Get supported provider types (from database)
pub async fn get_provider_types_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
) -> Json<ApiResponse<Vec<serde_json::Value>>> {
    match db_pool.list_provider_types().await {
        Ok(types) => {
            let provider_types: Vec<serde_json::Value> = types
                .iter()
                .map(|t| {
                    // Parse models JSON to return full model info
                    let models: Vec<serde_json::Value> =
                        serde_json::from_str(&t.models).unwrap_or_default();

                    serde_json::json!({
                        "id": t.id,
                        "label": t.label,
                        "base_url": t.base_url,
                        "driver_type": t.driver_type,
                        "models": models,
                        "enabled": t.enabled,
                        "sort_order": t.sort_order,
                        "docs_url": t.docs_url
                    })
                })
                .collect();

            Json(ApiResponse {
                success: true,
                data: Some(provider_types),
                message: "Provider types retrieved".to_string(),
            })
        }
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            message: format!("Failed to get provider types: {}", e),
        }),
    }
}

/// Request body for creating provider type
#[derive(Debug, Deserialize)]
pub struct CreateProviderTypeRequest {
    pub id: String,
    pub label: String,
    #[serde(default)]
    pub base_url: String,
    #[serde(default)]
    pub driver_type: String,
    #[serde(default)]
    pub models: Vec<CreateModelInfo>,
    #[serde(default)]
    pub enabled: Option<bool>,
    #[serde(default)]
    pub sort_order: Option<i32>,
    #[serde(default)]
    pub docs_url: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateModelInfo {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub supports_tools: Option<bool>,
    #[serde(default)]
    pub context_length: Option<u32>,
    #[serde(default)]
    pub input_price: Option<f64>,
    #[serde(default)]
    pub output_price: Option<f64>,
}

/// Create a new provider type
pub async fn create_provider_type_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
    Json(req): Json<CreateProviderTypeRequest>,
) -> Json<ApiResponse<()>> {
    // Validate driver_type
    if let Err(_) = serde_json::from_str::<DriverType>(&format!("\"{}\"", req.driver_type)) {
        return Json(ApiResponse {
            success: false,
            data: None,
            message: format!("Invalid driver_type: {}. Valid types are: openai, openai_compatible, xinference, anthropic, aliyun, volcengine, tencent, ollama", req.driver_type),
        });
    }

    let new_type = NewProviderType {
        id: req.id,
        label: req.label,
        base_url: req.base_url,
        driver_type: req.driver_type,
        models: req
            .models
            .into_iter()
            .map(|m| ModelInfo {
                id: m.id,
                name: m.name,
                description: m.description,
                supports_tools: m.supports_tools,
                context_length: m.context_length,
                input_price: m.input_price,
                output_price: m.output_price,
            })
            .collect(),
        enabled: req.enabled,
        sort_order: req.sort_order,
        docs_url: req.docs_url,
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
pub struct UpdateProviderTypeRequest {
    pub label: Option<String>,
    pub base_url: Option<String>,
    pub driver_type: Option<String>,
    pub models: Option<Vec<CreateModelInfo>>,
    pub enabled: Option<bool>,
    pub sort_order: Option<i32>,
    pub docs_url: Option<String>,
}

/// Update a provider type
pub async fn update_provider_type_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateProviderTypeRequest>,
) -> Json<ApiResponse<()>> {
    // Validate driver_type if provided
    if let Some(ref dt) = req.driver_type {
        if let Err(_) = serde_json::from_str::<DriverType>(&format!("\"{}\"", dt)) {
            return Json(ApiResponse {
                success: false,
                data: None,
                message: format!("Invalid driver_type: {}. Valid types are: openai, openai_compatible, xinference, anthropic, aliyun, volcengine, tencent, ollama", dt),
            });
        }
    }

    let update = UpdateProviderType {
        label: req.label,
        base_url: req.base_url,
        driver_type: req.driver_type,
        models: req.models.map(|models| {
            models
                .into_iter()
                .map(|m| ModelInfo {
                    id: m.id,
                    name: m.name,
                    description: m.description,
                    supports_tools: m.supports_tools,
                    context_length: m.context_length,
                    input_price: m.input_price,
                    output_price: m.output_price,
                })
                .collect()
        }),
        enabled: req.enabled,
        sort_order: req.sort_order,
        docs_url: req.docs_url,
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
pub async fn delete_provider_type_api(
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
