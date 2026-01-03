use std::sync::Arc;
use axum::response::IntoResponse;
use futures::StreamExt;
use crate::db::{self, DatabasePool, NewRequestLog};
use crate::pool::PoolManager;
use super::types::RequestResult;
use super::tencent::send_to_tencent;

pub async fn send_to_provider(
    provider: &db::Provider,
    req_body: &serde_json::Value,
    is_stream: bool,
    request_content: Option<String>,
    db_pool: &DatabasePool,
    pool_manager: &Arc<PoolManager>,
) -> RequestResult {
    if provider.provider_type == "tencent" {
        return send_to_tencent(provider, req_body, is_stream, request_content, db_pool, pool_manager).await;
    }

    use axum::http::StatusCode;
    use std::pin::Pin;
    use std::task::{Context, Poll};
    use futures::Stream;

    let start_time = std::time::Instant::now();
    let config: serde_json::Value = serde_json::from_str(&provider.config).unwrap_or_default();
    let api_key = config.get("api_key").and_then(|v| v.as_str()).unwrap_or("");
    let base_url = config.get("base_url").and_then(|v| v.as_str()).unwrap_or("");
    
    let model = if let Some(endpoint) = &provider.endpoint {
        endpoint.as_str()
    } else {
        config.get("model").and_then(|v| v.as_str()).unwrap_or("")
    };

    pool_manager.record_request_start(provider.id).await;

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(120))
        .no_proxy()
        .build()
        .unwrap_or_else(|_| reqwest::Client::new());
    let url = format!("{}/chat/completions", base_url.trim_end_matches('/'));

    let mut body = req_body.clone();
    if body.get("model").is_none() || body.get("model").unwrap().as_str() == Some("") {
        body["model"] = serde_json::json!(model);
    }

    match client
        .post(&url)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
    {
        Ok(response) => {
            let status = StatusCode::from_u16(response.status().as_u16()).unwrap_or(StatusCode::OK);
            let latency = start_time.elapsed();
            let latency_ms = latency.as_millis() as i64;
            let is_success = status.is_success();

            if is_success {
                pool_manager.record_success(provider.id, latency).await;
            } else {
                pool_manager.record_failure(provider.id, Some(&format!("HTTP {}", status.as_u16()))).await;
                return RequestResult::Failure {
                    error: format!("HTTP {}", status.as_u16()),
                    latency_ms,
                };
            }

            if is_stream {
                let stream = response.bytes_stream();
                let collected_content = std::sync::Arc::new(std::sync::Mutex::new(String::new()));
                let content_clone = collected_content.clone();

                let collecting_stream = stream.map(move |chunk_result| {
                    if let Ok(ref chunk) = chunk_result {
                        if let Ok(text) = std::str::from_utf8(chunk) {
                            for line in text.lines() {
                                if line.starts_with("data: ") {
                                    let data = &line[6..];
                                    if data != "[DONE]" {
                                        if let Ok(json) = serde_json::from_str::<serde_json::Value>(data) {
                                            if let Some(content) = json.get("choices")
                                                .and_then(|c| c.as_array())
                                                .and_then(|arr| arr.first())
                                                .and_then(|c| c.get("delta"))
                                                .and_then(|d| d.get("content"))
                                                .and_then(|c| c.as_str())
                                            {
                                                if let Ok(mut collected) = content_clone.lock() {
                                                    collected.push_str(content);
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    chunk_result
                });

                struct LoggingStream<S> {
                    inner: S,
                    collected_content: std::sync::Arc<std::sync::Mutex<String>>,
                    db_pool: std::sync::Arc<DatabasePool>,
                    provider_id: i64,
                    provider_name: String,
                    model: String,
                    request_content: Option<String>,
                    latency_ms: i64,
                    logged: bool,
                }

                impl<S: Stream + Unpin> Stream for LoggingStream<S> {
                    type Item = S::Item;

                    fn poll_next(mut self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Option<Self::Item>> {
                        let result = Pin::new(&mut self.inner).poll_next(cx);
                        if let Poll::Ready(None) = &result {
                            if !self.logged {
                                self.logged = true;
                                let response_content = self.collected_content.lock()
                                    .map(|c| if c.is_empty() { None } else { Some(c.clone()) })
                                    .unwrap_or(None);

                                let log = NewRequestLog {
                                    provider_id: Some(self.provider_id),
                                    provider_name: self.provider_name.clone(),
                                    model: self.model.clone(),
                                    status: "success".to_string(),
                                    latency_ms: self.latency_ms,
                                    tokens_used: 0,
                                    error_message: None,
                                    request_type: "chat".to_string(),
                                    request_content: self.request_content.clone(),
                                    response_content,
                                };

                                let db_pool = self.db_pool.clone();
                                tokio::spawn(async move {
                                    let _ = db_pool.create_request_log(log).await;
                                });
                            }
                        }
                        result
                    }
                }

                let logging_stream = LoggingStream {
                    inner: Box::pin(collecting_stream),
                    collected_content,
                    db_pool: std::sync::Arc::new(db_pool.clone()),
                    provider_id: provider.id,
                    provider_name: provider.name.clone(),
                    model: model.to_string(),
                    request_content,
                    latency_ms,
                    logged: false,
                };

                let body = axum::body::Body::from_stream(logging_stream);

                RequestResult::Success(
                    axum::response::Response::builder()
                        .status(status)
                        .header("Content-Type", "text/event-stream")
                        .header("Cache-Control", "no-cache")
                        .header("Connection", "keep-alive")
                        .body(body)
                        .unwrap_or_else(|_| StatusCode::INTERNAL_SERVER_ERROR.into_response())
                )
            } else {
                match response.json::<serde_json::Value>().await {
                    Ok(resp_body) => {
                        let response_content = resp_body.get("choices")
                            .and_then(|c| c.as_array())
                            .and_then(|arr| arr.first())
                            .and_then(|c| c.get("message"))
                            .and_then(|m| m.get("content"))
                            .and_then(|c| c.as_str())
                            .map(|s| s.to_string());

                        let tokens_used = resp_body.get("usage")
                            .and_then(|u| u.get("total_tokens"))
                            .and_then(|t| t.as_i64())
                            .unwrap_or(0);

                        let log = NewRequestLog {
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
                        let _ = db_pool.create_request_log(log).await;

                        RequestResult::Success((status, axum::Json(resp_body)).into_response())
                    }
                    Err(e) => RequestResult::Failure {
                        error: format!("Failed to parse response: {}", e),
                        latency_ms,
                    }
                }
            }
        }
        Err(e) => {
            let latency = start_time.elapsed();
            let latency_ms = latency.as_millis() as i64;
            pool_manager.record_failure(provider.id, Some(&e.to_string())).await;

            RequestResult::Failure {
                error: e.to_string(),
                latency_ms,
            }
        }
    }
}