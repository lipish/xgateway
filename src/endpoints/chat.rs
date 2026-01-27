use axum::http::StatusCode;
use axum::response::IntoResponse;
use crate::adapter::{send_to_provider, RequestResult};
use crate::pool::LoadBalanceStrategy;
use crate::pool::RateLimitResult;
use super::types::ProxyState;
use crate::db::NewRequestLog;

fn parse_fallback_chain(chain: Option<&str>) -> Vec<String> {
    chain
        .unwrap_or("")
        .split(',')
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string())
        .collect()
}

async fn write_gateway_log(
    db_pool: &crate::db::DatabasePool,
    service_id: Option<String>,
    api_key_id: Option<i64>,
    project_id: Option<i64>,
    org_id: Option<i64>,
    requested_model: String,
    request_content: Option<String>,
    status: &str,
    error_message: Option<String>,
) {
    let log = NewRequestLog {
        service_id,
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

    let requested_service_id_for_log = request
        .get("service_id")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

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
            Ok(Some(info)) => Some(info),
            _ => {
                write_gateway_log(
                    db_pool,
                    requested_service_id_for_log.clone(),
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

    let requested_service_id = request
        .get("service_id")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let requested_provider_id = request
        .get("provider_id")
        .and_then(|v| v.as_i64());

    // 2. STRICT MODE: Require explicit service_id in request
    let service_id = match requested_service_id {
        Some(id) => id,
        None => {
            // Backward compatibility: allow provider_id to infer service_id when unambiguous.
            if let Some(provider_id) = requested_provider_id {
                match db_pool.list_service_ids_by_provider_id(provider_id).await {
                    Ok(service_ids) => {
                        if service_ids.len() == 1 {
                            service_ids[0].clone()
                        } else if service_ids.is_empty() {
                            write_gateway_log(
                                db_pool,
                                None,
                                api_key_id,
                                project_id,
                                org_id,
                                requested_model_for_log.clone(),
                                request_content.clone(),
                                "error",
                                Some("missing_service_id".to_string()),
                            ).await;
                            return (
                                StatusCode::BAD_REQUEST,
                                axum::Json(serde_json::json!({
                                    "error": {
                                        "message": "service_id is required in request body",
                                        "type": "missing_service_id",
                                        "details": "provider_id is not bound to any service"
                                    }
                                }))
                            ).into_response();
                        } else {
                            write_gateway_log(
                                db_pool,
                                None,
                                api_key_id,
                                project_id,
                                org_id,
                                requested_model_for_log.clone(),
                                request_content.clone(),
                                "error",
                                Some("missing_service_id".to_string()),
                            ).await;
                            return (
                                StatusCode::BAD_REQUEST,
                                axum::Json(serde_json::json!({
                                    "error": {
                                        "message": "service_id is required in request body",
                                        "type": "missing_service_id",
                                        "details": "provider_id is bound to multiple services; please specify service_id"
                                    }
                                }))
                            ).into_response();
                        }
                    }
                    Err(e) => {
                        write_gateway_log(
                            db_pool,
                            None,
                            api_key_id,
                            project_id,
                            org_id,
                            requested_model_for_log.clone(),
                            request_content.clone(),
                            "error",
                            Some(format!("Failed to infer service_id: {}", e)),
                        ).await;
                        return (
                            StatusCode::INTERNAL_SERVER_ERROR,
                            axum::Json(serde_json::json!({
                                "error": {
                                    "message": format!("Failed to infer service_id: {}", e),
                                    "type": "server_error"
                                }
                            }))
                        ).into_response();
                    }
                }
            } else {
                write_gateway_log(
                    db_pool,
                    None,
                    api_key_id,
                    project_id,
                    org_id,
                    requested_model_for_log.clone(),
                    request_content.clone(),
                    "error",
                    Some("missing_service_id".to_string()),
                ).await;
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
        }
    };

    // 3. Check service access control
    if let Some(key_info) = &api_key_info {
        match db_pool.api_key_has_service_access(key_info, &service_id).await {
            Ok(true) => {}
            Ok(false) => {
                write_gateway_log(
                    db_pool,
                    Some(service_id.clone()),
                    api_key_id,
                    project_id,
                    org_id,
                    requested_model_for_log.clone(),
                    request_content.clone(),
                    "error",
                    Some("service_access_denied".to_string()),
                ).await;
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
                write_gateway_log(
                    db_pool,
                    Some(service_id.clone()),
                    api_key_id,
                    project_id,
                    org_id,
                    requested_model_for_log.clone(),
                    request_content.clone(),
                    "error",
                    Some(format!("Failed to check service access: {}", e)),
                ).await;
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

    // 4. API key limits (QPS + concurrency)
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

    let mut req_body = request.clone();
    if let Some(obj) = req_body.as_object_mut() {
        obj.remove("service_id");
    }

    let mut services_to_try = vec![service_id.clone()];
    let mut last_error: Option<(StatusCode, serde_json::Value)> = None;
    let mut visited: std::collections::HashSet<String> = std::collections::HashSet::new();

    while let Some(current_service_id) = services_to_try.pop() {
        if !visited.insert(current_service_id.clone()) {
            continue;
        }

        if let Some(key_info) = &api_key_info {
            match db_pool.api_key_has_service_access(key_info, &current_service_id).await {
                Ok(true) => {}
                Ok(false) => {
                    continue;
                }
                Err(e) => {
                    last_error = Some((
                        StatusCode::INTERNAL_SERVER_ERROR,
                        serde_json::json!({
                            "error": {
                                "message": format!("Failed to check service access: {}", e),
                                "type": "server_error"
                            }
                        }),
                    ));
                    continue;
                }
            }
        }

        let service = match db_pool.get_service(&current_service_id).await {
            Ok(Some(s)) => s,
            Ok(None) => {
                write_gateway_log(
                    db_pool,
                    Some(current_service_id.clone()),
                    api_key_id,
                    project_id,
                    org_id,
                    requested_model_for_log.clone(),
                    request_content.clone(),
                    "error",
                    Some("service_not_found".to_string()),
                ).await;
                last_error = Some((
                    StatusCode::NOT_FOUND,
                    serde_json::json!({
                        "error": {
                            "message": format!("Service {} not found", current_service_id),
                            "type": "service_not_found"
                        }
                    }),
                ));
                continue;
            }
            Err(e) => {
                write_gateway_log(
                    db_pool,
                    Some(current_service_id.clone()),
                    api_key_id,
                    project_id,
                    org_id,
                    requested_model_for_log.clone(),
                    request_content.clone(),
                    "error",
                    Some(format!("Failed to get service: {}", e)),
                ).await;
                last_error = Some((
                    StatusCode::INTERNAL_SERVER_ERROR,
                    serde_json::json!({
                        "error": {
                            "message": format!("Failed to get service: {}", e),
                            "type": "server_error"
                        }
                    }),
                ));
                continue;
            }
        };

        if let Some(key_info) = &api_key_info {
            if key_info.project_id != service.project_id {
                write_gateway_log(
                    db_pool,
                    Some(current_service_id.clone()),
                    api_key_id,
                    project_id,
                    org_id,
                    requested_model_for_log.clone(),
                    request_content.clone(),
                    "error",
                    Some("cross_project_service_access_denied".to_string()),
                )
                .await;
                return (
                    StatusCode::FORBIDDEN,
                    axum::Json(serde_json::json!({
                        "error": {
                            "message": "API key cannot access services across projects",
                            "type": "cross_project_service_access_denied"
                        }
                    })),
                )
                    .into_response();
            }
        }

        if !service.enabled {
            write_gateway_log(
                db_pool,
                Some(current_service_id.clone()),
                api_key_id,
                project_id,
                org_id,
                requested_model_for_log.clone(),
                request_content.clone(),
                "error",
                Some("service_disabled".to_string()),
            ).await;
            last_error = Some((
                StatusCode::NOT_FOUND,
                serde_json::json!({
                    "error": {
                        "message": format!("Service {} is disabled", current_service_id),
                        "type": "service_disabled"
                    }
                }),
            ));
            continue;
        }

        // Service hard limits (QPS + bounded queue + concurrency)
        let _service_concurrency_permit = match pool_manager.check_service_limit(&service).await {
            RateLimitResult::Denied { .. } => {
                write_gateway_log(
                    db_pool,
                    Some(current_service_id.clone()),
                    api_key_id,
                    project_id,
                    org_id,
                    requested_model_for_log.clone(),
                    request_content.clone(),
                    "error",
                    Some("service_rate_limit_exceeded".to_string()),
                ).await;
                last_error = Some((
                    StatusCode::SERVICE_UNAVAILABLE,
                    serde_json::json!({
                        "error": {
                            "message": "Service is busy. Please retry later.",
                            "type": "service_rate_limit_exceeded"
                        }
                    }),
                ));
                continue;
            }
            RateLimitResult::ConcurrencyExceeded | RateLimitResult::QueueFull | RateLimitResult::WaitTimeout => {
                write_gateway_log(
                    db_pool,
                    Some(current_service_id.clone()),
                    api_key_id,
                    project_id,
                    org_id,
                    requested_model_for_log.clone(),
                    request_content.clone(),
                    "error",
                    Some("service_overloaded".to_string()),
                ).await;
                last_error = Some((
                    StatusCode::SERVICE_UNAVAILABLE,
                    serde_json::json!({
                        "error": {
                            "message": "Service is busy. Please retry later.",
                            "type": "service_overloaded"
                        }
                    }),
                ));
                continue;
            }
            RateLimitResult::Allowed { concurrency_permit, .. } => concurrency_permit,
        };

        let providers = match db_pool.list_service_providers(&current_service_id).await {
            Ok(p) => p,
            Err(e) => {
                write_gateway_log(
                    db_pool,
                    Some(current_service_id.clone()),
                    api_key_id,
                    project_id,
                    org_id,
                    requested_model_for_log.clone(),
                    request_content.clone(),
                    "error",
                    Some(format!("Failed to get providers for service: {}", e)),
                ).await;
                last_error = Some((
                    StatusCode::INTERNAL_SERVER_ERROR,
                    serde_json::json!({
                        "error": {
                            "message": format!("Failed to get providers for service: {}", e),
                            "type": "server_error"
                        }
                    }),
                ));
                continue;
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

        let provider_id = match pool_manager
            .select_provider_from_candidates_with_strategy(strategy.clone(), &candidate_provider_ids, None)
            .await
        {
            Some(id) => id,
            None => {
                last_error = Some((
                    StatusCode::SERVICE_UNAVAILABLE,
                    serde_json::json!({
                        "error": {
                            "message": format!("No available model service for service {}", current_service_id),
                            "type": "no_available_model_service"
                        }
                    }),
                ));

                let mut fallbacks = parse_fallback_chain(service.fallback_chain.as_deref());
                fallbacks.reverse();
                for sid in fallbacks {
                    services_to_try.push(sid);
                }
                continue;
            }
        };

        let provider = match providers.iter().find(|p| p.id == provider_id) {
            Some(p) => p,
            None => {
                last_error = Some((
                    StatusCode::SERVICE_UNAVAILABLE,
                    serde_json::json!({
                        "error": {
                            "message": format!("Selected model service {} is not available", provider_id),
                            "type": "no_available_model_service"
                        }
                    }),
                ));
                let mut fallbacks = parse_fallback_chain(service.fallback_chain.as_deref());
                fallbacks.reverse();
                for sid in fallbacks {
                    services_to_try.push(sid);
                }
                continue;
            }
        };

        match send_to_provider(
            Some(&current_service_id),
            api_key_id,
            project_id,
            org_id,
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
            RequestResult::Failure { error, .. } => {
                let fallback_id = pool_manager
                    .select_provider_from_candidates_with_strategy(strategy, &candidate_provider_ids, Some(provider_id))
                    .await;

                if let Some(fid) = fallback_id {
                    if let Some(fallback_provider) = providers.iter().find(|p| p.id == fid) {
                        match send_to_provider(
                            Some(&current_service_id),
                            api_key_id,
                            project_id,
                            org_id,
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
                                last_error = Some((
                                    StatusCode::BAD_GATEWAY,
                                    serde_json::json!({
                                        "error": {
                                            "message": error,
                                            "type": "provider_error",
                                            "provider": fallback_provider.name
                                        }
                                    }),
                                ));
                            }
                        }
                    }
                } else {
                    last_error = Some((
                        StatusCode::BAD_GATEWAY,
                        serde_json::json!({
                            "error": {
                                "message": error,
                                "type": "provider_error",
                                "provider": provider.name
                            }
                        }),
                    ));
                }

                let mut fallbacks = parse_fallback_chain(service.fallback_chain.as_deref());
                fallbacks.reverse();
                for sid in fallbacks {
                    services_to_try.push(sid);
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
