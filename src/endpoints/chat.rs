use axum::http::StatusCode;
use axum::response::IntoResponse;
use crate::adapter::{send_to_provider, RequestResult};
use crate::db::{NewRequestLog};
use crate::pool::RateLimitResult;
use super::types::ProxyState;

pub async fn handle_chat_completions(
    axum::extract::State(state): axum::extract::State<ProxyState>,
    axum::Json(request): axum::Json<serde_json::Value>,
) -> axum::response::Response {
    let db_pool = &state.db_pool;
    let pool_manager = &state.pool_manager;

    if let RateLimitResult::Denied { retry_after } = pool_manager.check_rate_limit(None).await {
        return (
            StatusCode::TOO_MANY_REQUESTS,
            [("Retry-After", retry_after.as_secs().to_string())],
            axum::Json(serde_json::json!({
                "error": {
                    "message": format!("Rate limit exceeded. Retry after {} seconds.", retry_after.as_secs()),
                    "type": "rate_limit_exceeded",
                    "retry_after_seconds": retry_after.as_secs()
                }
            }))
        ).into_response();
    }

    let is_stream = request
        .get("stream")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);
    let requested_provider_id = request.get("provider_id").and_then(|v| v.as_i64());

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

    if let Some(provider_id) = requested_provider_id {
        match providers.iter().find(|p| p.id == provider_id) {
            Some(provider) => {
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
                    RequestResult::Success(response) => return response,
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

                        return (
                            StatusCode::BAD_GATEWAY,
                            axum::Json(serde_json::json!({
                                "error": {
                                    "message": error,
                                    "type": "provider_error",
                                    "provider": provider.name
                                }
                            })),
                        )
                            .into_response();
                    }
                }
            }
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
        }
    }

    let max_attempts = 3;
    let mut attempted_providers: Vec<i64> = Vec::new();
    let mut last_error = String::new();

    for attempt in 0..max_attempts {
        let provider_id = if attempt == 0 {
            pool_manager.select_provider().await
        } else {
            let available: Vec<i64> = providers
                .iter()
                .filter(|p| p.enabled && !attempted_providers.contains(&p.id))
                .map(|p| p.id)
                .collect();
            if available.is_empty() {
                break;
            }
            pool_manager
                .select_fallback(*attempted_providers.last().unwrap_or(&0))
                .await
                .or_else(|| available.first().copied())
        };

        let provider = match provider_id {
            Some(id) => {
                match providers
                    .iter()
                    .find(|p| p.id == id && !attempted_providers.contains(&p.id))
                {
                    Some(p) => p.clone(),
                    None => {
                        match providers
                            .iter()
                            .find(|p| p.enabled && !attempted_providers.contains(&p.id))
                        {
                            Some(p) => p.clone(),
                            None => break,
                        }
                    }
                }
            }
            None => {
                match providers
                    .iter()
                    .find(|p| p.enabled && !attempted_providers.contains(&p.id))
                {
                    Some(p) => p.clone(),
                    None => break,
                }
            }
        };

        attempted_providers.push(provider.id);
        tracing::info!(
            "Attempt {} with provider {} (id={})",
            attempt + 1,
            provider.name,
            provider.id
        );

        match send_to_provider(
            &provider,
            &req_body,
            is_stream,
            request_content.clone(),
            db_pool,
            pool_manager,
        )
        .await
        {
            RequestResult::Success(response) => {
                if attempt > 0 {
                    tracing::info!(
                        "Failover successful on attempt {} with provider {}",
                        attempt + 1,
                        provider.name
                    );
                }
                return response;
            }
            RequestResult::Failure {
                error,
                latency_ms: _,
            } => {
                last_error = error;
                tracing::warn!(
                    "Provider {} failed: {}, attempting failover...",
                    provider.name,
                    last_error
                );
            }
        }
    }

    let log = NewRequestLog {
        provider_id: None,
        provider_name: "all_providers".to_string(),
        model: "".to_string(),
        status: "error".to_string(),
        latency_ms: 0,
        tokens_used: 0,
        error_message: Some(format!(
            "All {} providers failed. Last error: {}",
            attempted_providers.len(),
            last_error
        )),
        request_type: "chat".to_string(),
        request_content,
        response_content: None,
    };
    let _ = db_pool.create_request_log(log).await;

    (
        StatusCode::BAD_GATEWAY,
        axum::Json(serde_json::json!({
            "error": {
                "message": format!("All providers failed after {} attempts. Last error: {}", attempted_providers.len(), last_error),
                "type": "all_providers_failed",
                "attempted_count": attempted_providers.len()
            }
        }))
    ).into_response()
}