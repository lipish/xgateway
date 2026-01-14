use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::Json;
use crate::adapter::{send_to_provider, RequestResult};
use crate::db::DatabasePool;
use crate::pool::PoolManager;
use std::sync::Arc;

pub async fn handle_admin_chat_completions(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
    axum::extract::State(pool_manager): axum::extract::State<Arc<PoolManager>>,
    headers: axum::http::HeaderMap,
    axum::Json(request): axum::Json<serde_json::Value>,
) -> axum::response::Response {
    let token = headers
        .get(axum::http::header::AUTHORIZATION)
        .and_then(|h| h.to_str().ok())
        .and_then(|s| s.strip_prefix("Bearer "));

    let token = match token {
        Some(t) if !t.trim().is_empty() => t,
        _ => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(serde_json::json!({
                    "error": {
                        "message": "Missing or invalid Authorization header",
                        "type": "unauthorized"
                    }
                })),
            )
                .into_response();
        }
    };

    let user = match db_pool.get_user_by_token(token).await {
        Ok(Some(u)) => u,
        Ok(None) => {
            tracing::warn!("Token lookup failed for token prefix: {}", &token[..std::cmp::min(20, token.len())]);
            return (
                StatusCode::UNAUTHORIZED,
                Json(serde_json::json!({
                    "error": {
                        "message": format!("Invalid token (prefix: {}...)", &token[..std::cmp::min(12, token.len())]),
                        "type": "unauthorized"
                    }
                })),
            )
                .into_response();
        }
        Err(e) => {
            tracing::error!("Failed to verify token: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": {
                        "message": format!("Failed to verify token: {}", e),
                        "type": "server_error"
                    }
                })),
            )
                .into_response();
        }
    };

    if user.role_id.as_deref() != Some("admin") {
        return (
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({
                "error": {
                    "message": "Admin privileges required",
                    "type": "forbidden"
                }
            })),
        )
            .into_response();
    }

    let is_stream = request
        .get("stream")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);

    let provider_id = match request.get("provider_id").and_then(|v| v.as_i64()) {
        Some(id) => id,
        None => {
            return (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({
                    "error": {
                        "message": "provider_id is required in request body",
                        "type": "missing_provider_id"
                    }
                })),
            )
                .into_response();
        }
    };

    let provider = match db_pool.get_provider(provider_id).await {
        Ok(Some(p)) => p,
        Ok(None) => {
            return (
                StatusCode::NOT_FOUND,
                Json(serde_json::json!({
                    "error": {
                        "message": format!("Provider with id {} not found", provider_id),
                        "type": "provider_not_found"
                    }
                })),
            )
                .into_response();
        }
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": {
                        "message": format!("Failed to get provider: {}", e),
                        "type": "server_error"
                    }
                })),
            )
                .into_response();
        }
    };

    match send_to_provider(None, &provider, &request, is_stream, None, &db_pool, &pool_manager).await {
        RequestResult::Success(response) => response,
        RequestResult::Failure { error, .. } => (
            StatusCode::BAD_GATEWAY,
            Json(serde_json::json!({
                "error": {
                    "message": error,
                    "type": "upstream_error"
                }
            })),
        )
            .into_response(),
    }
}
