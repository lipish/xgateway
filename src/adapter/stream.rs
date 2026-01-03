use std::pin::Pin;
use std::sync::{Arc, Mutex};
use std::task::{Context, Poll};
use futures::Stream;
use crate::db::{DatabasePool, NewRequestLog};

#[allow(dead_code)]
pub struct LoggingStream<S> {
    inner: S,
    collected_content: Arc<Mutex<String>>,
    db_pool: Arc<DatabasePool>,
    provider_id: i64,
    provider_name: String,
    model: String,
    request_content: Option<String>,
    latency_ms: i64,
    logged: bool,
}

#[allow(dead_code)]
impl<S> LoggingStream<S> {
    pub fn new(
        inner: S,
        collected_content: Arc<Mutex<String>>,
        db_pool: Arc<DatabasePool>,
        provider_id: i64,
        provider_name: String,
        model: String,
        request_content: Option<String>,
        latency_ms: i64,
    ) -> Self {
        Self {
            inner,
            collected_content,
            db_pool,
            provider_id,
            provider_name,
            model,
            request_content,
            latency_ms,
            logged: false,
        }
    }
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

#[allow(dead_code)]
pub fn extract_stream_content(chunk: &[u8], collected: &Arc<Mutex<String>>) {
    if let Ok(text) = std::str::from_utf8(chunk) {
        for line in text.lines() {
            if line.starts_with("data:") {
                let data = if line.starts_with("data: ") { &line[6..] } else { &line[5..] };
                if data != "[DONE]" {
                    if let Ok(json) = serde_json::from_str::<serde_json::Value>(data) {
                        let content = json.get("choices")
                            .and_then(|c| c.as_array())
                            .and_then(|arr| arr.first())
                            .and_then(|c| c.get("delta"))
                            .and_then(|d| d.get("content"))
                            .and_then(|c| c.as_str())
                            .or_else(|| {
                                json.get("choices")
                                    .and_then(|c| c.as_array())
                                    .and_then(|arr| arr.first())
                                    .and_then(|c| c.get("message"))
                                    .and_then(|m| m.get("content"))
                                    .and_then(|c| c.as_str())
                            });
                        
                        if let Some(content_str) = content {
                            if let Ok(mut c) = collected.lock() {
                                c.push_str(content_str);
                            }
                        }
                    }
                }
            }
        }
    }
}

pub fn extract_response_content(resp_body: &serde_json::Value) -> Option<String> {
    resp_body.get("choices")
        .and_then(|c| c.as_array())
        .and_then(|arr| arr.first())
        .and_then(|c| c.get("message"))
        .and_then(|m| m.get("content"))
        .and_then(|c| c.as_str())
        .map(|s| s.to_string())
}

pub fn extract_tokens_used(resp_body: &serde_json::Value) -> i64 {
    resp_body.get("usage")
        .and_then(|u| u.get("total_tokens"))
        .and_then(|t| t.as_i64())
        .unwrap_or(0)
}