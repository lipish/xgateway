use std::sync::Arc;
use axum::http::StatusCode;
use axum::response::IntoResponse;
use futures::StreamExt;
use llm_connector::LlmConnectorError;
use llm_connector::types::{ChatRequest, Message, Role};
use crate::db::{self, DatabasePool, NewRequestLog};
use crate::pool::PoolManager;
use super::driver::{build_driver_config, DriverType};
use super::stream::{extract_response_content, extract_tokens_used};
use super::types::RequestResult;
use crate::xtrace::{self, XTraceRequestContext};

fn map_llm_error(e: &LlmConnectorError) -> (StatusCode, &'static str) {
    match e {
        LlmConnectorError::AuthenticationError(_) => (StatusCode::UNAUTHORIZED, "auth_error"),
        LlmConnectorError::PermissionError(_) => (StatusCode::FORBIDDEN, "permission_denied"),
        LlmConnectorError::RateLimitError(_) => {
            (StatusCode::TOO_MANY_REQUESTS, "rate_limit_exceeded")
        }
        LlmConnectorError::InvalidRequest(_)
        | LlmConnectorError::UnsupportedModel(_)
        | LlmConnectorError::ParseError(_)
        | LlmConnectorError::JsonError(_)
        | LlmConnectorError::ContextLengthExceeded(_) => {
            (StatusCode::BAD_REQUEST, "invalid_request")
        }
        LlmConnectorError::NotFoundError(_) => (StatusCode::NOT_FOUND, "not_found"),
        LlmConnectorError::StreamingNotSupported(_) | LlmConnectorError::UnsupportedOperation(_) => {
            (StatusCode::NOT_IMPLEMENTED, "not_supported")
        }
        LlmConnectorError::TimeoutError(_) => (StatusCode::REQUEST_TIMEOUT, "timeout"),
        LlmConnectorError::MaxRetriesExceeded(_) => {
            (StatusCode::SERVICE_UNAVAILABLE, "max_retries_exceeded")
        }
        LlmConnectorError::ConfigError(_) => {
            (StatusCode::INTERNAL_SERVER_ERROR, "provider_config_error")
        }
        LlmConnectorError::NetworkError(_)
        | LlmConnectorError::ConnectionError(_)
        | LlmConnectorError::ProviderError(_)
        | LlmConnectorError::ServerError(_)
        | LlmConnectorError::ApiError(_)
        | LlmConnectorError::StreamingError(_) => (StatusCode::BAD_GATEWAY, "upstream_error"),
        _ => (StatusCode::BAD_GATEWAY, "upstream_error"),
    }
}

fn extract_usage_tokens(usage: &serde_json::Value) -> i64 {
    usage
        .get("total_tokens")
        .and_then(|v| v.as_i64())
        .or_else(|| {
            let prompt = usage
                .get("prompt_tokens")
                .and_then(|v| v.as_i64())
                .unwrap_or(0);
            let completion = usage
                .get("completion_tokens")
                .and_then(|v| v.as_i64())
                .unwrap_or(0);
            let sum = prompt + completion;
            if sum > 0 {
                Some(sum)
            } else {
                None
            }
        })
        .unwrap_or(0)
}

#[cfg(test)]
mod tests {
    use super::{extract_usage_tokens, map_llm_error};
    use axum::http::StatusCode;
    use llm_connector::LlmConnectorError;

    #[test]
    fn test_map_llm_error_auth_and_rate_limit() {
        let (status, error_type) = map_llm_error(&LlmConnectorError::AuthenticationError("bad key".to_string()));
        assert_eq!(status, StatusCode::UNAUTHORIZED);
        assert_eq!(error_type, "auth_error");

        let (status, error_type) = map_llm_error(&LlmConnectorError::RateLimitError("quota".to_string()));
        assert_eq!(status, StatusCode::TOO_MANY_REQUESTS);
        assert_eq!(error_type, "rate_limit_exceeded");
    }

    #[test]
    fn test_map_llm_error_upstream() {
        let (status, error_type) = map_llm_error(&LlmConnectorError::ProviderError("upstream failed".to_string()));
        assert_eq!(status, StatusCode::BAD_GATEWAY);
        assert_eq!(error_type, "upstream_error");
    }

    #[test]
    fn test_extract_usage_tokens_prefers_total() {
        let usage = serde_json::json!({
            "prompt_tokens": 11,
            "completion_tokens": 22,
            "total_tokens": 40
        });
        assert_eq!(extract_usage_tokens(&usage), 40);
    }

    #[test]
    fn test_extract_usage_tokens_fallback_sum() {
        let usage = serde_json::json!({
            "prompt_tokens": 11,
            "completion_tokens": 22
        });
        assert_eq!(extract_usage_tokens(&usage), 33);
    }

    #[test]
    fn test_extract_usage_tokens_empty() {
        let usage = serde_json::json!({});
        assert_eq!(extract_usage_tokens(&usage), 0);
    }
}

fn parse_messages(req_body: &serde_json::Value) -> Vec<Message> {
    req_body.get("messages")
        .and_then(|m| m.as_array())
        .map(|arr| {
            arr.iter().filter_map(|msg| {
                let role_str = msg.get("role")?.as_str()?;
                let content = msg.get("content")?.as_str()?;
                let role = match role_str {
                    "system" => Role::System,
                    "user" => Role::User,
                    "assistant" => Role::Assistant,
                    "tool" => Role::Tool,
                    _ => Role::User,
                };
                Some(Message::text(role, content))
            }).collect()
        })
        .unwrap_or_default()
}

pub async fn send_to_provider(
    api_key_id: Option<i64>,
    project_id: Option<i64>,
    org_id: Option<i64>,
    provider: &db::Provider,
    req_body: &serde_json::Value,
    is_stream: bool,
    request_content: Option<String>,
    db_pool: &DatabasePool,
    pool_manager: &Arc<PoolManager>,
    xtrace_ctx: Option<XTraceRequestContext>,
) -> RequestResult {
    let start_time = std::time::Instant::now();
    let config: serde_json::Value = serde_json::from_str(&provider.config).unwrap_or_else(|e| {
        tracing::warn!(
            "Failed to parse provider config for '{}' (id={}): {}",
            provider.name, provider.id, e
        );
        serde_json::Value::default()
    });

    let api_key = config.get("api_key").and_then(|v| v.as_str());
    let base_url = provider.endpoint.as_deref()
        .or_else(|| config.get("base_url").and_then(|v| v.as_str()));
    let region = config.get("region").and_then(|v| v.as_str());

    let request_model = req_body.get("model").and_then(|v| v.as_str());
    let config_model = config.get("model").and_then(|v| v.as_str());

    let model = request_model
        .or(config_model)
        .unwrap_or("");

    pool_manager.record_request_start(provider.id).await;

    let driver_config = build_driver_config(
        db_pool,
        &provider.provider_type,
        api_key,
        provider.secret_id.as_deref(),
        provider.secret_key.as_deref(),
        base_url,
        region,
        model,
    ).await;

    tracing::info!(
        target: "xgateway::upstream",
        provider_id = provider.id,
        provider_name = %provider.name,
        provider_type = %provider.provider_type,
        req_model = %model,
        region = ?region,
        configured_base_url = ?base_url,
        resolved_base_url = ?driver_config.base_url,
        "Prepared upstream request"
    );

    let client = match driver_config.create_client() {
        Ok(c) => c,
        Err(e) => {
            let latency_ms = start_time.elapsed().as_millis() as i64;
            pool_manager.record_failure(provider.id, Some(&e.to_string())).await;
            let (status_code, error_type) = e
                .downcast_ref::<LlmConnectorError>()
                .map(map_llm_error)
                .unwrap_or((StatusCode::INTERNAL_SERVER_ERROR, "client_init_failed"));
            return RequestResult::Failure {
                error: format!("Failed to create client: {}", e),
                latency_ms,
                status_code,
                error_type,
            };
        }
    };

    let messages = parse_messages(req_body);
    let chat_request = driver_config.apply_request_overrides(ChatRequest {
        model: model.to_string(),
        messages,
        stream: Some(is_stream),
        ..Default::default()
    });

    if let Ok(payload) = serde_json::to_string(&chat_request) {
        tracing::info!(
            target: "xgateway::upstream",
            provider_id = provider.id,
            provider_name = %provider.name,
            provider_type = %provider.provider_type,
            payload = %payload,
            "Outbound chat payload"
        );
    }

    if is_stream {
        handle_stream_request(
            client,
            chat_request,
            provider,
            api_key_id,
            project_id,
            org_id,
            request_content,
            db_pool,
            pool_manager,
            start_time,
            driver_config.driver_type,
            xtrace_ctx,
        ).await
    } else {
        handle_non_stream_request(
            client,
            chat_request,
            provider,
            model,
            api_key_id,
            project_id,
            org_id,
            request_content,
            db_pool,
            pool_manager,
            start_time,
            xtrace_ctx,
        ).await
    }
}

async fn handle_stream_request(
    client: llm_connector::LlmClient,
    chat_request: ChatRequest,
    provider: &db::Provider,
    api_key_id: Option<i64>,
    project_id: Option<i64>,
    org_id: Option<i64>,
    request_content: Option<String>,
    db_pool: &DatabasePool,
    pool_manager: &Arc<PoolManager>,
    start_time: std::time::Instant,
    _driver_type: DriverType,
    xtrace_ctx: Option<XTraceRequestContext>,
) -> RequestResult {
    match client.chat_stream(&chat_request).await {
        Ok(mut stream) => {
            use tokio::sync::mpsc;

            let (tx, rx) = mpsc::unbounded_channel::<String>();
            let collected_content = Arc::new(std::sync::Mutex::new(String::new()));
            let content_clone = collected_content.clone();
            let stream_error = Arc::new(std::sync::Mutex::new(None::<String>));
            let stream_error_clone = stream_error.clone();
            let first_token_at = Arc::new(std::sync::Mutex::new(None::<std::time::Instant>));
            let first_token_clone = first_token_at.clone();
            let usage_snapshot = Arc::new(std::sync::Mutex::new(None::<serde_json::Value>));
            let usage_clone = usage_snapshot.clone();
            let provider_id = provider.id;
            let provider_name = provider.name.clone();
            let model_str = chat_request.model.clone();
    let api_key_id_clone = api_key_id;
            let project_id_clone = project_id;
            let org_id_clone = org_id;
            let db = db_pool.clone();
            let pm = pool_manager.clone();
            let xtrace_ctx_clone = xtrace_ctx.clone();

            tokio::spawn(async move {
                while let Some(chunk) = stream.next().await {
                    match chunk {
                        Ok(response) => {
                            if let Some(choice) = response.choices.first() {
                                if let Some(content) = &choice.delta.content {
                                    if let Ok(mut collected) = content_clone.lock() {
                                        collected.push_str(content);
                                    }
                                    if let Ok(mut first_token) = first_token_clone.lock() {
                                        if first_token.is_none() {
                                            *first_token = Some(std::time::Instant::now());
                                        }
                                    }
                                }
                            }
                            if let Ok(json) = serde_json::to_value(&response) {
                                if let Some(usage) = json.get("usage") {
                                    if let Ok(mut snapshot) = usage_clone.lock() {
                                        *snapshot = Some(usage.clone());
                                    }
                                }
                            }
                            let sse_data = format!("data: {}\n\n", serde_json::to_string(&response).unwrap_or_default());
                            let _ = tx.send(sse_data);
                        }
                        Err(e) => {
                            tracing::error!("Stream error: {}", e);
                            if let Ok(mut err) = stream_error_clone.lock() {
                                *err = Some(e.to_string());
                            }
                            break;
                        }
                    }
                }
                let _ = tx.send("data: [DONE]\n\n".to_string());

                let latency_ms = start_time.elapsed().as_millis() as i64;
                let err = stream_error.lock().ok().and_then(|e| e.clone());
                let (status, error_message) = if let Some(e) = err {
                    pm.record_failure(provider_id, Some(&e)).await;
                    ("error".to_string(), Some(e))
                } else {
                    pm.record_success(provider_id, start_time.elapsed()).await;
                    ("success".to_string(), None)
                };

                let response_content = content_clone.lock().ok().and_then(|c| {
                    if c.is_empty() { None } else { Some(c.clone()) }
                });
                let usage_value = usage_snapshot.lock().ok().and_then(|u| u.clone());
                let tokens_used = usage_value
                    .as_ref()
                    .map(extract_usage_tokens)
                    .unwrap_or(0);

                if let Some(ctx) = xtrace_ctx_clone {
                    let output = response_content.clone().map(serde_json::Value::String);
                    let usage_tokens = usage_value.as_ref().and_then(|u| xtrace::usage_from_value(u));
                    let completion_start = first_token_at.lock().ok().and_then(|t| *t);
                    ctx.client.report_generation(
                        &ctx,
                        provider_id,
                        &provider_name,
                        &model_str,
                        output,
                        usage_tokens,
                        error_message.clone(),
                        completion_start,
                        std::time::Instant::now(),
                    );
                }

            let log = NewRequestLog {
                api_key_id: api_key_id_clone,
                project_id: project_id_clone,
                org_id: org_id_clone,
                    provider_id: Some(provider_id),
                    provider_name,
                    model: model_str,
                    status,
                    latency_ms,
                    tokens_used,
                    error_message,
                    request_type: "chat".to_string(),
                    request_content,
                    response_content,
                };
                if let Err(e) = db.create_request_log(log).await {
                    tracing::error!("Failed to write request log (streaming): {}", e);
                }
            });

            let stream = tokio_stream::wrappers::UnboundedReceiverStream::new(rx);
            let body = axum::body::Body::from_stream(stream.map(Ok::<_, std::convert::Infallible>));

            let response = axum::response::Response::builder()
                .status(200)
                .header("content-type", "text/event-stream")
                .header("cache-control", "no-cache")
                .body(body)
                .unwrap_or_else(|_| StatusCode::INTERNAL_SERVER_ERROR.into_response());

            RequestResult::Success(response)
        }
        Err(e) => {
            let latency_ms = start_time.elapsed().as_millis() as i64;
            pool_manager.record_failure(provider.id, Some(&e.to_string())).await;
            let (status_code, error_type) = map_llm_error(&e);
            tracing::error!(
                target: "xgateway::upstream",
                provider_id = provider.id,
                provider_name = %provider.name,
                provider_type = %provider.provider_type,
                model = %chat_request.model,
                status_code = %status_code,
                error_type = %error_type,
                error = %e,
                "Upstream stream request failed"
            );
            if let Some(ctx) = xtrace_ctx {
                ctx.client.report_generation(
                    &ctx,
                    provider.id,
                    &provider.name,
                    &chat_request.model,
                    None,
                    None,
                    Some(format!("Stream error: {}", e)),
                    None,
                    std::time::Instant::now(),
                );
            }
            RequestResult::Failure {
                error: format!("Stream error: {}", e),
                latency_ms,
                status_code,
                error_type,
            }
        }
    }
}

async fn handle_non_stream_request(
    client: llm_connector::LlmClient,
    chat_request: ChatRequest,
    provider: &db::Provider,
    model: &str,
    api_key_id: Option<i64>,
    project_id: Option<i64>,
    org_id: Option<i64>,
    request_content: Option<String>,
    db_pool: &DatabasePool,
    pool_manager: &Arc<PoolManager>,
    start_time: std::time::Instant,
    xtrace_ctx: Option<XTraceRequestContext>,
) -> RequestResult {
    match client.chat(&chat_request).await {
        Ok(response) => {
            let latency = start_time.elapsed();
            let latency_ms = latency.as_millis() as i64;
            pool_manager.record_success(provider.id, latency).await;

            let response_json = serde_json::to_value(&response).unwrap_or_default();
            let response_content = extract_response_content(&response_json);
            let tokens_used = extract_tokens_used(&response_json);
            if let Some(ctx) = xtrace_ctx {
                let usage = xtrace::usage_from_response(&response_json);
                ctx.client.report_generation(
                    &ctx,
                    provider.id,
                    &provider.name,
                    model,
                    Some(response_json.clone()),
                    usage,
                    None,
                    None,
                    std::time::Instant::now(),
                );
            }

            let log = NewRequestLog {
                api_key_id,
                project_id,
                org_id,
                provider_id: Some(provider.id),
                provider_name: provider.name.clone(),
                model: model.to_string(),
                status: "success".to_string(),
                latency_ms,
                tokens_used,
                error_message: None,
                request_type: "chat".to_string(),
                request_content,
                response_content,
            };
            if let Err(e) = db_pool.create_request_log(log).await {
                tracing::error!("Failed to write request log (non-streaming success): {}", e);
            }

            RequestResult::Success(axum::Json(response_json).into_response())
        }
        Err(e) => {
            let latency_ms = start_time.elapsed().as_millis() as i64;
            pool_manager.record_failure(provider.id, Some(&e.to_string())).await;
            let (status_code, error_type) = map_llm_error(&e);
            tracing::error!(
                target: "xgateway::upstream",
                provider_id = provider.id,
                provider_name = %provider.name,
                provider_type = %provider.provider_type,
                model = %model,
                status_code = %status_code,
                error_type = %error_type,
                error = %e,
                "Upstream non-stream request failed"
            );
            if let Some(ctx) = xtrace_ctx {
                ctx.client.report_generation(
                    &ctx,
                    provider.id,
                    &provider.name,
                    model,
                    None,
                    None,
                    Some(e.to_string()),
                    None,
                    std::time::Instant::now(),
                );
            }

            let log = NewRequestLog {
                api_key_id,
                project_id,
                org_id,
                provider_id: Some(provider.id),
                provider_name: provider.name.clone(),
                model: model.to_string(),
                status: "error".to_string(),
                latency_ms,
                tokens_used: 0,
                error_message: Some(e.to_string()),
                request_type: "chat".to_string(),
                request_content,
                response_content: None,
            };
            if let Err(e) = db_pool.create_request_log(log).await {
                tracing::error!("Failed to write request log (non-streaming error): {}", e);
            }

            RequestResult::Failure {
                error: format!("API error: {}", e),
                latency_ms,
                status_code,
                error_type,
            }
        }
    }
}
