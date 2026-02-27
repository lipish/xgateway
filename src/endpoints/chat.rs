use std::sync::Arc;
use axum::http::StatusCode;
use axum::response::IntoResponse;
use crate::adapter::{send_to_provider, RequestResult};
use crate::pool::LoadBalanceStrategy;
use crate::pool::RateLimitResult;
use super::types::ProxyState;
use crate::db::NewRequestLog;
use crate::xtrace::XTraceRequestContext;

fn parse_fallback_provider_ids(chain: Option<&str>) -> Vec<i64> {
    chain
        .unwrap_or("")
        .split(',')
        .filter_map(|s| s.trim().parse::<i64>().ok())
        .collect()
}

fn parse_provider_ids(value: &Option<String>) -> Vec<i64> {
    value
        .as_ref()
        .and_then(|raw| serde_json::from_str::<Vec<i64>>(raw).ok())
        .unwrap_or_default()
}

async fn write_gateway_log(
    db_pool: &crate::db::DatabasePool,
    api_key_id: Option<i64>,
    project_id: Option<i64>,
    org_id: Option<i64>,
    requested_model: String,
    request_content: Option<String>,
    status: &str,
    error_message: Option<String>,
) {
    let log = NewRequestLog {
        api_key_id,
        project_id,
        org_id,
        provider_id: None,
        provider_name: "gateway".to_string(),
        model: requested_model,
        status: status.to_string(),
        latency_ms: 0,
        tokens_used: 0,
        error_message,
        request_type: "chat".to_string(),
        request_content,
        response_content: None,
    };
    let _ = db_pool.create_request_log(log).await;
}

pub async fn handle_chat_completions(
    axum::extract::State(state): axum::extract::State<ProxyState>,
    headers: axum::http::HeaderMap,
    axum::Json(request): axum::Json<serde_json::Value>,
) -> axum::response::Response {
    let db_pool = &state.db_pool;
    let pool_manager = &state.pool_manager;

    let request_content = request
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

    let requested_model_for_log = request
        .get("model")
        .and_then(|v| v.as_str())
        .unwrap_or("unknown")
        .to_string();

    // 1. Extract and Validate API Key
    let api_key = headers.get(axum::http::header::AUTHORIZATION)
        .and_then(|h| h.to_str().ok())
        .and_then(|s| s.strip_prefix("Bearer "));

    let api_key_info = if let Some(key) = api_key {
        match db_pool.get_api_key_by_hash(key).await {
            Ok(Some(info)) => {
                if info.protocol != "openai" {
                    write_gateway_log(
                        db_pool,
                        None,
                        None,
                        None,
                        requested_model_for_log.clone(),
                        request_content.clone(),
                        "error",
                        Some("invalid_protocol".to_string()),
                    ).await;
                    return (
                        StatusCode::FORBIDDEN,
                        axum::Json(serde_json::json!({
                            "error": {
                                "message": "API key protocol does not allow this endpoint",
                                "type": "invalid_protocol"
                            }
                        }))
                    ).into_response();
                }
                Some(info)
            }
            _ => {
                write_gateway_log(
                    db_pool,
                    None,
                    None,
                    None,
                    requested_model_for_log.clone(),
                    request_content.clone(),
                    "error",
                    Some("invalid_api_key".to_string()),
                ).await;
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

    let (api_key_id, project_id, org_id) = if let Some(key_info) = &api_key_info {
        let org_id = db_pool
            .get_org_id_by_project_id(key_info.project_id)
            .await
            .ok()
            .flatten();
        (Some(key_info.id), Some(key_info.project_id), org_id)
    } else {
        (None, None, None)
    };

    let is_stream = request
        .get("stream")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);

    let xtrace_context = state.xtrace.as_ref().map(|client| {
        XTraceRequestContext::new(
            Arc::clone(client),
            request.clone(),
            request.get("model").and_then(|v| v.as_str()).map(|s| s.to_string()),
            api_key_id,
            project_id,
            org_id,
            is_stream,
            std::time::Instant::now(),
            chrono::Utc::now(),
        )
    });

    let requested_provider_id = request
        .get("provider_id")
        .and_then(|v| v.as_i64());

    // 2. API key limits (QPS + concurrency)
    let _api_key_concurrency_permit = if let Some(key_info) = &api_key_info {
        match pool_manager.check_api_key_limit(key_info).await {
            RateLimitResult::Denied { retry_after } => {
                return (
                    StatusCode::TOO_MANY_REQUESTS,
                    [("Retry-After", retry_after.as_secs().to_string())],
                    axum::Json(serde_json::json!({
                        "error": {
                            "message": format!("API key rate limit exceeded. Retry after {} seconds.", retry_after.as_secs()),
                            "type": "api_key_rate_limit_exceeded"
                        }
                    })),
                )
                    .into_response();
            }
            RateLimitResult::ConcurrencyExceeded => {
                return (
                    StatusCode::TOO_MANY_REQUESTS,
                    axum::Json(serde_json::json!({
                        "error": {
                            "message": "API key concurrency limit exceeded. Please retry later.",
                            "type": "api_key_concurrency_exceeded"
                        }
                    })),
                )
                    .into_response();
            }
            RateLimitResult::Allowed { concurrency_permit, .. } => concurrency_permit,
            RateLimitResult::QueueFull | RateLimitResult::WaitTimeout => unreachable!(),
        }
    } else {
        // Backward-compat / internal mode: still apply global rate limit if no API key
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
                    })),
                )
                    .into_response();
            }
            RateLimitResult::ConcurrencyExceeded => unreachable!(),
            RateLimitResult::Allowed { concurrency_permit, .. } => concurrency_permit,
            RateLimitResult::QueueFull | RateLimitResult::WaitTimeout => unreachable!(),
        }
    };

    let req_body = request.clone();

    let mut providers = match db_pool.list_providers().await {
        Ok(p) => p.into_iter().filter(|p| p.enabled).collect::<Vec<_>>(),
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                axum::Json(serde_json::json!({
                    "error": {
                        "message": format!("Failed to list providers: {}", e),
                        "type": "server_error"
                    }
                })),
            )
                .into_response();
        }
    };

    let mut candidate_provider_ids = if let Some(key_info) = &api_key_info {
        if key_info.scope == "instance" {
            let ids = parse_provider_ids(&key_info.provider_ids);
            if ids.is_empty() {
                write_gateway_log(
                    db_pool,
                    api_key_id,
                    project_id,
                    org_id,
                    requested_model_for_log.clone(),
                    request_content.clone(),
                    "error",
                    Some("missing_provider_ids".to_string()),
                )
                .await;
                return (
                    StatusCode::BAD_REQUEST,
                    axum::Json(serde_json::json!({
                        "error": {
                            "message": "Instance-scoped API key requires provider_ids",
                            "type": "missing_provider_ids"
                        }
                    })),
                )
                    .into_response();
            }
            ids
        } else {
            providers.iter().map(|p| p.id).collect::<Vec<_>>()
        }
    } else if let Some(provider_id) = requested_provider_id {
        vec![provider_id]
    } else {
        providers.iter().map(|p| p.id).collect::<Vec<_>>()
    };

    if let Some(provider_id) = requested_provider_id {
        if let Some(key_info) = &api_key_info {
            if key_info.scope == "instance" && !candidate_provider_ids.contains(&provider_id) {
                write_gateway_log(
                    db_pool,
                    api_key_id,
                    project_id,
                    org_id,
                    requested_model_for_log.clone(),
                    request_content.clone(),
                    "error",
                    Some("provider_access_denied".to_string()),
                )
                .await;
                return (
                    StatusCode::FORBIDDEN,
                    axum::Json(serde_json::json!({
                        "error": {
                            "message": "API key does not have access to this provider",
                            "type": "provider_access_denied"
                        }
                    })),
                )
                    .into_response();
            }
        }
    }

    // Filter candidates if a specific provider was requested
    if let Some(provider_id) = requested_provider_id {
        candidate_provider_ids.retain(|&id| id == provider_id);
    }

    let candidate_set: std::collections::HashSet<i64> = candidate_provider_ids.iter().copied().collect();
    providers.retain(|p| candidate_set.contains(&p.id));
    candidate_provider_ids.retain(|id| candidate_set.contains(id));

    if candidate_provider_ids.is_empty() {
        return (
            StatusCode::SERVICE_UNAVAILABLE,
            axum::Json(serde_json::json!({
                "error": {
                    "message": "No available model service",
                    "type": "no_available_model_service"
                }
            })),
        )
            .into_response();
    }

    let strategy_name = api_key_info
        .as_ref()
        .map(|k| k.strategy.as_str())
        .unwrap_or("Priority");
    let strategy = match strategy_name {
        "RoundRobin" => LoadBalanceStrategy::RoundRobin,
        "LeastConnections" => LoadBalanceStrategy::LeastConnections,
        "Random" => LoadBalanceStrategy::Random,
        "Priority" => LoadBalanceStrategy::Priority,
        "LatencyBased" => LoadBalanceStrategy::LatencyBased,
        "LowestPrice" => LoadBalanceStrategy::LowestPrice,
        "QuotaAware" => LoadBalanceStrategy::QuotaAware,
        _ => LoadBalanceStrategy::Priority,
    };

    let fallback_provider_ids = api_key_info
        .as_ref()
        .map(|k| parse_fallback_provider_ids(k.fallback_chain.as_deref()))
        .unwrap_or_default()
        .into_iter()
        .filter(|id| candidate_set.contains(id))
        .collect::<Vec<_>>();

    let provider_map: std::collections::HashMap<i64, crate::db::Provider> = providers
        .into_iter()
        .map(|p| (p.id, p))
        .collect();

    let mut last_error: Option<(StatusCode, serde_json::Value)> = None;
    let mut tried: std::collections::HashSet<i64> = std::collections::HashSet::new();
    let mut fallback_queue = fallback_provider_ids;

    let mut next_provider_id = pool_manager
        .select_provider_from_candidates_with_strategy(strategy.clone(), &candidate_provider_ids, None)
        .await;

    while let Some(provider_id) = next_provider_id {
        if !tried.insert(provider_id) {
            next_provider_id = None;
            continue;
        }

        let provider = match provider_map.get(&provider_id) {
            Some(p) => p,
            None => {
                next_provider_id = None;
                continue;
            }
        };

        let xtrace_ctx = xtrace_context.as_ref().map(|ctx| XTraceRequestContext {
            trace_id: ctx.trace_id,
            start_time: ctx.start_time,
            start_timestamp: ctx.start_timestamp,
            request_payload: ctx.request_payload.clone(),
            messages: ctx.messages.clone(),
            requested_model: ctx.requested_model.clone(),
            api_key_id: ctx.api_key_id,
            project_id: ctx.project_id,
            org_id: ctx.org_id,
            is_stream: ctx.is_stream,
            trace_name: ctx.trace_name.clone(),
            client: Arc::clone(&ctx.client),
        });

        match send_to_provider(
            api_key_id,
            project_id,
            org_id,
            provider,
            &req_body,
            is_stream,
            request_content.clone(),
            db_pool,
            pool_manager,
            xtrace_ctx,
        )
        .await
        {
            RequestResult::Success(response) => return response,
            RequestResult::Failure {
                error,
                status_code,
                error_type,
                ..
            } => {
                last_error = Some((
                    status_code,
                    serde_json::json!({
                        "error": {
                            "message": error,
                            "type": error_type,
                            "provider": provider.name
                        }
                    }),
                ));

                next_provider_id = pool_manager
                    .select_provider_from_candidates_with_strategy(strategy.clone(), &candidate_provider_ids, Some(provider_id))
                    .await;

                if next_provider_id.is_none() {
                    while let Some(fallback_id) = fallback_queue.first().copied() {
                        fallback_queue.remove(0);
                        if !tried.contains(&fallback_id) {
                            next_provider_id = Some(fallback_id);
                            break;
                        }
                    }
                }
            }
        }
    }

    if let Some((status, body)) = last_error {
        return (status, axum::Json(body)).into_response();
    }

    (
        StatusCode::SERVICE_UNAVAILABLE,
        axum::Json(serde_json::json!({
            "error": {
                "message": "No available model service",
                "type": "no_available_model_service"
            }
        })),
    )
        .into_response()
}
