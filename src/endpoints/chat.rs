use axum::http::StatusCode;
use axum::response::IntoResponse;
use crate::adapter::{send_to_provider, RequestResult};
use crate::db::{NewRequestLog};
use crate::pool::RateLimitResult;
use super::types::ProxyState;

pub async fn handle_chat_completions(
    axum::extract::State(state): axum::extract::State<ProxyState>,
    headers: axum::http::HeaderMap,
    axum::Json(request): axum::Json<serde_json::Value>,
) -> axum::response::Response {
    let db_pool = &state.db_pool;
    let pool_manager = &state.pool_manager;

    // 1. Extract and Validate API Key
    let api_key = headers.get(axum::http::header::AUTHORIZATION)
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
                    }))
                ).into_response();
            }
        }
    } else {
        None
    };

    // 2. Check Rate Limits (QPS and Concurrency)
    let _concurrency_permit = if let Some(key_info) = &api_key_info {
        match pool_manager.check_api_key_limit(key_info).await {
            RateLimitResult::Denied { retry_after } => {
                return (
                    StatusCode::TOO_MANY_REQUESTS,
                    [("Retry-After", retry_after.as_secs().to_string())],
                    axum::Json(serde_json::json!({
                        "error": {
                            "message": format!("Rate limit exceeded for API Key. Retry after {} seconds.", retry_after.as_secs()),
                            "type": "rate_limit_exceeded"
                        }
                    }))
                ).into_response();
            }
            RateLimitResult::ConcurrencyExceeded => {
                return (
                    StatusCode::TOO_MANY_REQUESTS,
                    axum::Json(serde_json::json!({
                        "error": {
                            "message": "Concurrency limit exceeded for API Key.",
                            "type": "concurrency_limit_exceeded"
                        }
                    }))
                ).into_response();
            }
            RateLimitResult::Allowed { concurrency_permit, .. } => concurrency_permit,
        }
    } else {
        match pool_manager.check_rate_limit(None).await {
            RateLimitResult::Denied { retry_after } => {
                return (
                    StatusCode::TOO_MANY_REQUESTS,
                    [("Retry-After", retry_after.as_secs().to_string())],
                    axum::Json(serde_json::json!({
                        "error": {
                            "message": format!("Global rate limit exceeded. Retry after {} seconds.", retry_after.as_secs()),
                            "type": "rate_limit_exceeded"
                        }
                    }))
                ).into_response();
            }
            RateLimitResult::ConcurrencyExceeded => unreachable!(),
            RateLimitResult::Allowed { concurrency_permit, .. } => concurrency_permit,
        }
    };

    let is_stream = request
        .get("stream")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);
    let requested_provider_id = request.get("provider_id").and_then(|v| v.as_i64());

    // 3. STRICT MODE: Require explicit provider_id in request
    let provider_id = match requested_provider_id {
        Some(id) => id,
        None => {
            return (
                StatusCode::BAD_REQUEST,
                axum::Json(serde_json::json!({
                    "error": {
                        "message": "provider_id is required in request body",
                        "type": "missing_provider_id"
                    }
                }))
            ).into_response();
        }
    };

    // 4. Check provider access control if API key is scoped to specific instances
    if let Some(key_info) = &api_key_info {
        if key_info.scope == "instance" {
            if let Some(ref provider_ids_json) = key_info.provider_ids {
                let allowed_provider_ids: Vec<i64> = serde_json::from_str(provider_ids_json).unwrap_or_default();
                
                if !allowed_provider_ids.contains(&provider_id) {
                    return (
                        StatusCode::FORBIDDEN,
                        axum::Json(serde_json::json!({
                            "error": {
                                "message": "API key does not have access to this provider",
                                "type": "provider_access_denied"
                            }
                        }))
                    ).into_response();
                }
            }
        }
    }

    let providers = match db_pool.list_providers().await {
        Ok(p) => p,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                axum::Json(serde_json::json!({
                    "error": {
                        "message": format!("Failed to get providers: {}", e),
                        "type": "server_error"
                    }
                })),
            )
                .into_response();
        }
    };

    let mut req_body = request.clone();
    if let Some(obj) = req_body.as_object_mut() {
        obj.remove("provider_id");
    }

    let request_content = req_body
        .get("messages")
        .and_then(|m| m.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|m| {
                    let role = m.get("role").and_then(|r| r.as_str()).unwrap_or("unknown");
                    let content = m.get("content").and_then(|c| c.as_str()).unwrap_or("");
                    if content.is_empty() {
                        None
                    } else {
                        Some(format!("[{}]: {}", role, content))
                    }
                })
                .collect::<Vec<_>>()
                .join("\n\n")
        })
        .filter(|s| !s.is_empty());

    // Find the requested provider
    let provider = match providers.iter().find(|p| p.id == provider_id) {
        Some(p) => p,
        None => {
            return (
                StatusCode::NOT_FOUND,
                axum::Json(serde_json::json!({
                    "error": {
                        "message": format!("Provider with id {} not found", provider_id),
                        "type": "provider_not_found"
                    }
                })),
            )
                .into_response();
        }
    };

    // Send request to the specified provider (NO RETRY, NO FAILOVER)
    match send_to_provider(
        provider,
        &req_body,
        is_stream,
        request_content.clone(),
        db_pool,
        pool_manager,
    )
    .await
    {
        RequestResult::Success(response) => response,
        RequestResult::Failure { error, latency_ms } => {
            let log = NewRequestLog {
                provider_id: Some(provider.id),
                provider_name: provider.name.clone(),
                model: "".to_string(),
                status: "error".to_string(),
                latency_ms,
                tokens_used: 0,
                error_message: Some(error.clone()),
                request_type: "chat".to_string(),
                request_content,
                response_content: None,
            };
            let _ = db_pool.create_request_log(log).await;

            (
                StatusCode::BAD_GATEWAY,
                axum::Json(serde_json::json!({
                    "error": {
                        "message": error,
                        "type": "provider_error",
                        "provider": provider.name
                    }
                })),
            )
                .into_response()
        }
    }
}
