use crate::db::{DatabasePool, NewRequestLog};
use futures::Stream;
use std::pin::Pin;
use std::sync::{Arc, Mutex};
use std::task::{Context, Poll};

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
                let response_content = self
                    .collected_content
                    .lock()
                    .map(|c| if c.is_empty() { None } else { Some(c.clone()) })
                    .unwrap_or(None);

                let log = NewRequestLog {
                    api_key_id: None,
                    project_id: None,
                    org_id: None,
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
                let data = if line.starts_with("data: ") {
                    &line[6..]
                } else {
                    &line[5..]
                };
                if data != "[DONE]" {
                    if let Ok(json) = serde_json::from_str::<serde_json::Value>(data) {
                        let content = json
                            .get("choices")
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
    let choice0 = resp_body
        .get("choices")
        .and_then(|c| c.as_array())
        .and_then(|arr| arr.first());

    fn value_to_text(v: &serde_json::Value) -> Option<String> {
        if let Some(s) = v.as_str() {
            let s = s.trim();
            return if s.is_empty() {
                None
            } else {
                Some(s.to_string())
            };
        }

        // Some providers use rich content blocks: [{"type":"text","text":"..."}, ...]
        if let Some(arr) = v.as_array() {
            let parts: Vec<String> = arr
                .iter()
                .filter_map(|item| {
                    item.get("text")
                        .and_then(|t| t.as_str())
                        .map(|s| s.trim().to_string())
                        .filter(|s| !s.is_empty())
                })
                .collect();
            if !parts.is_empty() {
                return Some(parts.join("\n"));
            }
        }

        // Sometimes content is an object with text
        if let Some(obj) = v.as_object() {
            if let Some(t) = obj.get("text").and_then(|t| t.as_str()) {
                let t = t.trim();
                return if t.is_empty() {
                    None
                } else {
                    Some(t.to_string())
                };
            }
        }

        None
    }

    // OpenAI compatible: choices[0].message.content
    let content = choice0
        .and_then(|c| c.get("message"))
        .and_then(|m| m.get("content"))
        .and_then(value_to_text)
        .or_else(|| {
            // Some providers: choices[0].delta.content (non-stream edge cases)
            choice0
                .and_then(|c| c.get("delta"))
                .and_then(|d| d.get("content"))
                .and_then(value_to_text)
        })
        .or_else(|| {
            // Some SDKs: choices[0].text
            choice0.and_then(|c| c.get("text")).and_then(value_to_text)
        })
        .or_else(|| {
            // Fallback: choices[0].content
            choice0
                .and_then(|c| c.get("content"))
                .and_then(value_to_text)
        });

    content
}

pub fn extract_tokens_used(resp_body: &serde_json::Value) -> i64 {
    resp_body
        .get("usage")
        .and_then(|u| u.get("total_tokens"))
        .and_then(|t| t.as_i64())
        .unwrap_or(0)
}
