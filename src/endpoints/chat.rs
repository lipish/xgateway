use axum::http::StatusCode;
use axum::response::IntoResponse;
use crate::adapter::{send_to_provider, RequestResult};
use crate::pool::LoadBalanceStrategy;
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

    let requested_service_id = request
        .get("service_id")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    // 3. STRICT MODE: Require explicit service_id in request
    let service_id = match requested_service_id {
        Some(id) => id,
        None => {
            return (
                StatusCode::BAD_REQUEST,
                axum::Json(serde_json::json!({
                    "error": {
                        "message": "service_id is required in request body",
                        "type": "missing_service_id"
                    }
                }))
            ).into_response();
        }
    };

    // 4. Check service access control
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
                )
                    .into_response();
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
                )
                    .into_response();
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
            )
                .into_response();
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
            )
                .into_response();
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
        )
            .into_response();
    }

    let providers = match db_pool.list_service_providers(&service_id).await {
        Ok(p) => p,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                axum::Json(serde_json::json!({
                    "error": {
                        "message": format!("Failed to get service providers: {}", e),
                        "type": "server_error"
                    }
                })),
            )
                .into_response();
        }
    };

    let candidate_provider_ids: Vec<i64> = providers.iter().map(|p| p.id).collect();

    let strategy = match service.strategy.as_str() {
        "RoundRobin" => LoadBalanceStrategy::RoundRobin,
        "LeastConnections" => LoadBalanceStrategy::LeastConnections,
        "Random" => LoadBalanceStrategy::Random,
        "Priority" => LoadBalanceStrategy::Priority,
        "LatencyBased" => LoadBalanceStrategy::LatencyBased,
        "LowestPrice" => LoadBalanceStrategy::LowestPrice,
        "QuotaAware" => LoadBalanceStrategy::QuotaAware,
        _ => LoadBalanceStrategy::Priority,
    };

    let mut req_body = request.clone();
    if let Some(obj) = req_body.as_object_mut() {
        obj.remove("service_id");
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

    let provider_id = match pool_manager
        .select_provider_from_candidates_with_strategy(strategy.clone(), &candidate_provider_ids, None)
        .await
    {
        Some(id) => id,
        None => {
            return (
                StatusCode::SERVICE_UNAVAILABLE,
                axum::Json(serde_json::json!({
                    "error": {
                        "message": format!("No available model service for service {}", service_id),
                        "type": "no_available_model_service"
                    }
                })),
            )
                .into_response();
        }
    };

    let provider = match providers.iter().find(|p| p.id == provider_id) {
        Some(p) => p,
        None => {
            return (
                StatusCode::SERVICE_UNAVAILABLE,
                axum::Json(serde_json::json!({
                    "error": {
                        "message": format!("Selected model service {} is not available", provider_id),
                        "type": "no_available_model_service"
                    }
                })),
            )
                .into_response();
        }
    };

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
        RequestResult::Failure { error, .. } => {
            let fallback_id = pool_manager
                .select_provider_from_candidates_with_strategy(strategy, &candidate_provider_ids, Some(provider_id))
                .await;

            if let Some(fid) = fallback_id {
                if let Some(fallback_provider) = providers.iter().find(|p| p.id == fid) {
                    match send_to_provider(
                        fallback_provider,
                        &req_body,
                        is_stream,
                        request_content.clone(),
                        db_pool,
                        pool_manager,
                    )
                    .await
                    {
                        RequestResult::Success(response) => return response,
                        RequestResult::Failure { error, .. } => {
                            return (
                                StatusCode::BAD_GATEWAY,
                                axum::Json(serde_json::json!({
                                    "error": {
                                        "message": error,
                                        "type": "provider_error",
                                        "provider": fallback_provider.name
                                    }
                                })),
                            )
                                .into_response();
                        }
                    }
                }
            }

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
