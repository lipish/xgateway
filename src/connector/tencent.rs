use std::sync::Arc;
use axum::response::IntoResponse;
use futures::StreamExt;
use crate::db::{self, DatabasePool, NewRequestLog};
use crate::pool::PoolManager;
use super::types::RequestResult;

pub async fn send_to_tencent(
    provider: &db::Provider,
    req_body: &serde_json::Value,
    is_stream: bool,
    request_content: Option<String>,
    db_pool: &DatabasePool,
    pool_manager: &Arc<PoolManager>,
) -> RequestResult {
    use llm_connector::LlmClient;
    use llm_connector::types::{ChatRequest, Message, Role};

    let start_time = std::time::Instant::now();
    let config: serde_json::Value = serde_json::from_str(&provider.config).unwrap_or_default();
    let model = config.get("model").and_then(|v| v.as_str()).unwrap_or("hunyuan-lite");

    pool_manager.record_request_start(provider.id).await;

    let secret_id = match &provider.secret_id {
        Some(id) => id.as_str(),
        None => {
            let latency_ms = start_time.elapsed().as_millis() as i64;
            pool_manager.record_failure(provider.id, Some("Missing secret_id")).await;
            return RequestResult::Failure {
                error: "Missing secret_id for Tencent provider".to_string(),
                latency_ms,
            };
        }
    };

    let secret_key = match &provider.secret_key {
        Some(key) => key.as_str(),
        None => {
            let latency_ms = start_time.elapsed().as_millis() as i64;
            pool_manager.record_failure(provider.id, Some("Missing secret_key")).await;
            return RequestResult::Failure {
                error: "Missing secret_key for Tencent provider".to_string(),
                latency_ms,
            };
        }
    };

    let client = match LlmClient::tencent(secret_id, secret_key) {
        Ok(c) => c,
        Err(e) => {
            let latency_ms = start_time.elapsed().as_millis() as i64;
            pool_manager.record_failure(provider.id, Some(&e.to_string())).await;
            return RequestResult::Failure {
                error: format!("Failed to create Tencent client: {}", e),
                latency_ms,
            };
        }
    };

    let messages: Vec<Message> = req_body.get("messages")
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
        .unwrap_or_default();

    let chat_request = ChatRequest {
        model: model.to_string(),
        messages,
        stream: Some(is_stream),
        ..Default::default()
    };

    if is_stream {
        match client.chat_stream(&chat_request).await {
            Ok(mut stream) => {
                use tokio::sync::mpsc;

                let (tx, rx) = mpsc::unbounded_channel::<String>();
                let collected_content = std::sync::Arc::new(std::sync::Mutex::new(String::new()));
                let content_clone = collected_content.clone();
                let provider_id = provider.id;
                let provider_name = provider.name.clone();
                let model_str = model.to_string();
                let db = db_pool.clone();
                let pm = pool_manager.clone();
                let start = start_time;

                tokio::spawn(async move {
                    while let Some(chunk) = stream.next().await {
                        match chunk {
                            Ok(response) => {
                                if let Some(choice) = response.choices.first() {
                                    if let Some(content) = &choice.delta.content {
                                        if let Ok(mut collected) = content_clone.lock() {
                                            collected.push_str(content);
                                        }
                                    }
                                }
                                let sse_data = format!("data: {}\n\n", serde_json::to_string(&response).unwrap_or_default());
                                let _ = tx.send(sse_data);
                            }
                            Err(e) => {
                                tracing::error!("Tencent stream error: {}", e);
                                break;
                            }
                        }
                    }
                    let _ = tx.send("data: [DONE]\n\n".to_string());

                    let latency_ms = start.elapsed().as_millis() as i64;
                    pm.record_success(provider_id, start.elapsed()).await;

                    let response_content = content_clone.lock().ok().and_then(|c| {
                        if c.is_empty() { None } else { Some(c.clone()) }
                    });

                    let log = NewRequestLog {
                        provider_id: Some(provider_id),
                        provider_name,
                        model: model_str,
                        status: "success".to_string(),
                        latency_ms,
                        tokens_used: 0,
                        error_message: None,
                        request_type: "chat".to_string(),
                        request_content,
                        response_content,
                    };
                    let _ = db.create_request_log(log).await;
                });

                let stream = tokio_stream::wrappers::UnboundedReceiverStream::new(rx);
                let body = axum::body::Body::from_stream(stream.map(Ok::<_, std::convert::Infallible>));

                let response = axum::response::Response::builder()
                    .status(200)
                    .header("content-type", "text/event-stream")
                    .header("cache-control", "no-cache")
                    .body(body)
                    .unwrap_or_else(|_| axum::http::StatusCode::INTERNAL_SERVER_ERROR.into_response());

                RequestResult::Success(response)
            }
            Err(e) => {
                let latency_ms = start_time.elapsed().as_millis() as i64;
                pool_manager.record_failure(provider.id, Some(&e.to_string())).await;
                RequestResult::Failure {
                    error: format!("Tencent stream error: {}", e),
                    latency_ms,
                }
            }
        }
    } else {
        match client.chat(&chat_request).await {
            Ok(response) => {
                let latency = start_time.elapsed();
                let latency_ms = latency.as_millis() as i64;
                pool_manager.record_success(provider.id, latency).await;

                let response_content = response.choices.first()
                    .map(|c| c.message.content_as_text());

                let log = NewRequestLog {
                    provider_id: Some(provider.id),
                    provider_name: provider.name.clone(),
                    model: model.to_string(),
                    status: "success".to_string(),
                    latency_ms,
                    tokens_used: 0,
                    error_message: None,
                    request_type: "chat".to_string(),
                    request_content,
                    response_content,
                };
                let _ = db_pool.create_request_log(log).await;

                let response_json = serde_json::to_value(&response).unwrap_or_default();
                RequestResult::Success(axum::Json(response_json).into_response())
            }
            Err(e) => {
                let latency_ms = start_time.elapsed().as_millis() as i64;
                pool_manager.record_failure(provider.id, Some(&e.to_string())).await;

                let log = NewRequestLog {
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
                let _ = db_pool.create_request_log(log).await;

                RequestResult::Failure {
                    error: format!("Tencent API error: {}", e),
                    latency_ms,
                }
            }
        }
    }
}
