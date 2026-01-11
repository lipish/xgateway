use super::types::ProxyState;
use axum::http::StatusCode;
use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct ModelsQuery {
    pub service_id: Option<String>,
}

pub async fn handle_list_models(
    axum::extract::State(state): axum::extract::State<ProxyState>,
    axum::extract::Query(query): axum::extract::Query<ModelsQuery>,
    headers: axum::http::HeaderMap,
) -> (StatusCode, axum::Json<serde_json::Value>) {
    let db_pool = &state.db_pool;

    let service_id = match query.service_id {
        Some(id) => id,
        None => {
            return (
                StatusCode::BAD_REQUEST,
                axum::Json(serde_json::json!({
                    "error": {
                        "message": "service_id is required",
                        "type": "missing_service_id"
                    }
                })),
            );
        }
    };

    let api_key = headers
        .get(axum::http::header::AUTHORIZATION)
        .and_then(|h| h.to_str().ok())
        .and_then(|s| s.strip_prefix("Bearer "));

    let api_key_info = if let Some(key) = api_key {
        match db_pool.get_api_key_by_hash(key).await {
            Ok(Some(info)) => Some(info),
            _ => {
                return (
                    StatusCode::UNAUTHORIZED,
                    axum::Json(serde_json::json!({
                        "error": {
                            "message": "Invalid API Key",
                            "type": "invalid_api_key"
                        }
                    })),
                );
            }
        }
    } else {
        None
    };

    if let Some(key_info) = &api_key_info {
        match db_pool.api_key_has_service_access(key_info, &service_id).await {
            Ok(true) => {}
            Ok(false) => {
                return (
                    StatusCode::FORBIDDEN,
                    axum::Json(serde_json::json!({
                        "error": {
                            "message": "API key does not have access to this service",
                            "type": "service_access_denied"
                        }
                    })),
                );
            }
            Err(e) => {
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    axum::Json(serde_json::json!({
                        "error": {
                            "message": format!("Failed to check service access: {}", e),
                            "type": "server_error"
                        }
                    })),
                );
            }
        }
    }

    let service = match db_pool.get_service(&service_id).await {
        Ok(Some(s)) => s,
        Ok(None) => {
            return (
                StatusCode::NOT_FOUND,
                axum::Json(serde_json::json!({
                    "error": {
                        "message": format!("Service with id {} not found", service_id),
                        "type": "service_not_found"
                    }
                })),
            );
        }
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                axum::Json(serde_json::json!({
                    "error": {
                        "message": format!("Failed to get service: {}", e),
                        "type": "server_error"
                    }
                })),
            );
        }
    };

    if !service.enabled {
        return (
            StatusCode::FORBIDDEN,
            axum::Json(serde_json::json!({
                "error": {
                    "message": format!("Service {} is disabled", service_id),
                    "type": "service_disabled"
                }
            })),
        );
    }

    let providers = db_pool.list_service_providers(&service_id).await.unwrap_or_default();
    let models: Vec<serde_json::Value> = providers
        .iter()
        .filter(|p| p.enabled)
        .map(|p| {
            let config: serde_json::Value = serde_json::from_str(&p.config).unwrap_or_default();
            let model = config
                .get("model")
                .and_then(|v| v.as_str())
                .unwrap_or("unknown");
            serde_json::json!({
                "id": model,
                "object": "model",
                "owned_by": p.provider_type,
                "provider": p.name
            })
        })
        .collect();

    (
        StatusCode::OK,
        axum::Json(serde_json::json!({
            "object": "list",
            "data": models
        })),
    )
}

pub async fn handle_get_model(
    axum::extract::Path(model_id): axum::extract::Path<String>,
    axum::extract::Query(query): axum::extract::Query<ModelsQuery>,
    axum::extract::State(state): axum::extract::State<ProxyState>,
    headers: axum::http::HeaderMap,
) -> (StatusCode, axum::Json<serde_json::Value>) {
    let db_pool = &state.db_pool;

    let service_id = match query.service_id {
        Some(id) => id,
        None => {
            return (
                StatusCode::BAD_REQUEST,
                axum::Json(serde_json::json!({
                    "error": {
                        "message": "service_id is required",
                        "type": "missing_service_id"
                    }
                })),
            );
        }
    };

    let api_key = headers
        .get(axum::http::header::AUTHORIZATION)
        .and_then(|h| h.to_str().ok())
        .and_then(|s| s.strip_prefix("Bearer "));

    let api_key_info = if let Some(key) = api_key {
        match db_pool.get_api_key_by_hash(key).await {
            Ok(Some(info)) => Some(info),
            _ => {
                return (
                    StatusCode::UNAUTHORIZED,
                    axum::Json(serde_json::json!({
                        "error": {
                            "message": "Invalid API Key",
                            "type": "invalid_api_key"
                        }
                    })),
                );
            }
        }
    } else {
        None
    };

    if let Some(key_info) = &api_key_info {
        match db_pool.api_key_has_service_access(key_info, &service_id).await {
            Ok(true) => {}
            Ok(false) => {
                return (
                    StatusCode::FORBIDDEN,
                    axum::Json(serde_json::json!({
                        "error": {
                            "message": "API key does not have access to this service",
                            "type": "service_access_denied"
                        }
                    })),
                );
            }
            Err(e) => {
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    axum::Json(serde_json::json!({
                        "error": {
                            "message": format!("Failed to check service access: {}", e),
                            "type": "server_error"
                        }
                    })),
                );
            }
        }
    }

    let service = match db_pool.get_service(&service_id).await {
        Ok(Some(s)) => s,
        Ok(None) => {
            return (
                StatusCode::NOT_FOUND,
                axum::Json(serde_json::json!({
                    "error": {
                        "message": format!("Service with id {} not found", service_id),
                        "type": "service_not_found"
                    }
                })),
            );
        }
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                axum::Json(serde_json::json!({
                    "error": {
                        "message": format!("Failed to get service: {}", e),
                        "type": "server_error"
                    }
                })),
            );
        }
    };

    if !service.enabled {
        return (
            StatusCode::FORBIDDEN,
            axum::Json(serde_json::json!({
                "error": {
                    "message": format!("Service {} is disabled", service_id),
                    "type": "service_disabled"
                }
            })),
        );
    }

    (
        StatusCode::OK,
        axum::Json(serde_json::json!({
            "id": model_id,
            "object": "model",
            "owned_by": "llm-link"
        })),
    )
}