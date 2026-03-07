use anyhow::{anyhow, Result};
use futures_util::stream::Stream;
use reqwest::Client;
use serde_json::{json, Value};
use std::pin::Pin;

/// Direct MiniMax API client with special handling (e.g., thinking tag cleaning)
pub struct MinimaxClient {
    client: Client,
    pub(crate) api_key: String,
    base_url: String,
}

/// Type alias for streaming response
pub type StreamingResponse = Pin<Box<dyn Stream<Item = Result<String>> + Send>>;

impl MinimaxClient {
    pub fn new(api_key: &str) -> Self {
        Self {
            client: Client::new(),
            api_key: api_key.to_string(),
            base_url: "https://api.minimaxi.com/v1".to_string(),
        }
    }

    pub async fn chat(&self, model: &str, messages: Vec<Value>) -> Result<Value> {
        let url = format!("{}/chat/completions", self.base_url);

        let payload = json!({
            "model": model,
            "messages": messages,
            "stream": false,
        });

        tracing::debug!("Sending request to MiniMax: {}", url);
        tracing::debug!("Payload: {}", payload);

        let response = self
            .client
            .post(&url)
            .header("Content-Type", "application/json")
            .header("Authorization", format!("Bearer {}", self.api_key))
            .json(&payload)
            .send()
            .await?;

        let status = response.status();
        let body = response.text().await?;

        tracing::debug!("MiniMax response status: {}", status);
        tracing::debug!("MiniMax response body: {}", body);

        if !status.is_success() {
            return Err(anyhow!("MiniMax API error: {} - {}", status, body));
        }

        let mut json_response: Value = serde_json::from_str(&body)?;

        // Clean up the response by removing <think> tags from the content
        if let Some(choices) = json_response
            .get_mut("choices")
            .and_then(|c| c.as_array_mut())
        {
            for choice in choices {
                if let Some(message) = choice.get_mut("message") {
                    if let Some(content) = message.get_mut("content").and_then(|c| c.as_str()) {
                        let cleaned = Self::clean_think_tags(content);
                        message["content"] = Value::String(cleaned);
                    }
                }
            }
        }

        Ok(json_response)
    }

    /// Remove <think>...</think> tags from the response
    pub fn clean_think_tags(content: &str) -> String {
        // Use a simple approach: find and remove <think>...</think> blocks
        let mut result = content.to_string();

        // Keep removing <think>...</think> blocks until none are left
        loop {
            if let Some(start) = result.find("<think>") {
                if let Some(end) = result.find("</think>") {
                    if start < end {
                        // Remove from <think> to </think> inclusive
                        result.drain(start..=end + 7);
                        continue;
                    }
                }
            }
            break;
        }

        result.trim().to_string()
    }

    /// Send a streaming chat request to MiniMax
    pub async fn chat_stream(
        &self,
        model: &str,
        messages: Vec<Value>,
    ) -> Result<StreamingResponse> {
        use futures_util::StreamExt;

        let url = format!("{}/chat/completions", self.base_url);

        let payload = json!({
            "model": model,
            "messages": messages,
            "stream": true,
        });

        tracing::debug!("Sending streaming request to MiniMax: {}", url);

        let response = self
            .client
            .post(&url)
            .header("Content-Type", "application/json")
            .header("Authorization", format!("Bearer {}", self.api_key))
            .json(&payload)
            .send()
            .await?;

        let status = response.status();
        if !status.is_success() {
            let body = response.text().await?;
            return Err(anyhow!("MiniMax API error: {} - {}", status, body));
        }

        // Create a stream from the response
        let stream = response.bytes_stream();

        let stream = stream.map(|result| {
            match result {
                Ok(bytes) => {
                    let text = String::from_utf8_lossy(&bytes).to_string();
                    // Parse SSE format: "data: {...}\n\n"
                    let mut result_lines = Vec::new();
                    for line in text.lines() {
                        if let Some(json_str) = line.strip_prefix("data: ") {
                            // Remove "data: " prefix
                            if json_str == "[DONE]" {
                                continue;
                            }
                            result_lines.push(json_str.to_string());
                        }
                    }
                    Ok(result_lines.join("\n"))
                }
                Err(e) => Err(anyhow!("Stream error: {}", e)),
            }
        });

        Ok(Box::pin(stream))
    }
}
