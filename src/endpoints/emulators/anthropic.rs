use axum::{
    extract::State,
    http::StatusCode,
    response::{IntoResponse, Response, Sse},
    Json,
};
use futures_util::stream::Stream;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::time::Instant;
use tracing::{error, info};
use chrono::Utc;

use crate::endpoints::ProxyState;
use crate::engine::Model;
use crate::service::Service as LlmService;
use llm_connector::types::{ImageSource, Message as LlmMessage, MessageBlock, Role as LlmRole};
use axum::http::header::AUTHORIZATION;

/// Anthropic Messages API Request
#[derive(Debug, Deserialize, Serialize)]
#[allow(dead_code)]
pub struct AnthropicMessagesRequest {
    #[allow(dead_code)]
    pub model: String,
    #[allow(dead_code)]
    pub messages: Vec<AnthropicMessage>,
    #[serde(default)]
    #[allow(dead_code)]
    pub max_tokens: Option<u32>,
    #[serde(default)]
    #[allow(dead_code)]
    pub temperature: Option<f32>,
    #[serde(default)]
    #[allow(dead_code)]
    pub stream: bool,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct AnthropicMessage {
    pub role: String,
    #[serde(deserialize_with = "deserialize_content")]
    pub content: Vec<MessageBlock>,
}

/// Anthropic content can be either a string or an array of content blocks
#[derive(Debug, Deserialize)]
#[serde(untagged)]
enum AnthropicContentInput {
    String(String),
    Array(Vec<AnthropicContentBlock>),
}

#[derive(Debug, Deserialize)]
struct AnthropicContentBlock {
    #[serde(rename = "type")]
    type_: String,
    #[serde(default)]
    text: Option<String>,
    #[serde(default)]
    source: Option<AnthropicImageSource>,
}

#[derive(Debug, Deserialize)]
struct AnthropicImageSource {
    #[serde(rename = "type")]
    #[allow(dead_code)]
    type_: String,
    media_type: String,
    data: String,
}

/// Custom deserializer for content field
/// Converts Anthropic format to llm-connector MessageBlock format
fn deserialize_content<'de, D>(deserializer: D) -> Result<Vec<MessageBlock>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    let content = AnthropicContentInput::deserialize(deserializer)?;
    match content {
        AnthropicContentInput::String(s) => {
            // Simple string → single text block
            Ok(vec![MessageBlock::Text { text: s }])
        }
        AnthropicContentInput::Array(blocks) => {
            // Array of blocks → convert each block
            let message_blocks: Vec<MessageBlock> = blocks
                .into_iter()
                .filter_map(|block| match block.type_.as_str() {
                    "text" => block.text.map(|text| MessageBlock::Text { text }),
                    "image" => block.source.map(|source| MessageBlock::Image {
                        source: ImageSource::Base64 {
                            media_type: source.media_type,
                            data: source.data,
                        },
                    }),
                    _ => {
                        tracing::warn!("Unsupported content block type: {}", block.type_);
                        None
                    }
                })
                .collect();

            if message_blocks.is_empty() {
                Ok(vec![MessageBlock::Text {
                    text: String::new(),
                }])
            } else {
                Ok(message_blocks)
            }
        }
    }
}

/// Anthropic Messages API Response
#[derive(Debug, Serialize)]
#[allow(dead_code)]
pub struct AnthropicMessagesResponse {
    pub id: String,
    #[serde(rename = "type")]
    pub type_: String,
    pub role: String,
    pub content: Vec<AnthropicContent>,
    pub model: String,
    pub stop_reason: Option<String>,
    pub usage: AnthropicUsage,
}

#[derive(Debug, Serialize)]
#[allow(dead_code)]
pub struct AnthropicContent {
    #[serde(rename = "type")]
    pub type_: String,
    pub text: String,
}

#[derive(Debug, Serialize)]
#[allow(dead_code)]
pub struct AnthropicUsage {
    pub input_tokens: u32,
    pub output_tokens: u32,
}

/// Anthropic Messages API Handler
#[allow(dead_code)]
pub async fn messages(
    State(state): State<ProxyState>,
    headers: axum::http::HeaderMap,
    Json(mut request): Json<AnthropicMessagesRequest>,
) -> Result<Response, StatusCode> {
    let start_time = Instant::now();
    let start_timestamp = Utc::now();
    let request_payload = serde_json::to_value(&request).ok();
    let report = |status: StatusCode,
                  response_payload: Option<serde_json::Value>,
                  error: Option<String>,
                  is_stream: bool| {
        if let Some(xtrace) = state.xtrace.as_ref() {
            xtrace.report_request(
                "POST",
                "/v1/messages",
                status.as_u16(),
                request_payload.clone(),
                response_payload,
                error,
                is_stream,
                start_time,
                start_timestamp,
            );
        }
    };
    info!("📨 Anthropic Messages API request: client_model={}, stream={}", request.model, request.stream);
    info!("📋 Request details: messages_count={}, max_tokens={:?}, temperature={:?}",
          request.messages.len(), request.max_tokens, request.temperature);
    
    let api_key = headers
        .get(AUTHORIZATION)
        .and_then(|h| h.to_str().ok())
        .and_then(|s| s.strip_prefix("Bearer "));
    if let Some(key) = api_key {
        match state.db_pool.get_api_key_by_hash(key).await {
            Ok(Some(info)) => {
                if info.protocol != "anthropic" {
                    report(StatusCode::FORBIDDEN, None, Some("invalid_protocol".to_string()), request.stream);
                    return Err(StatusCode::FORBIDDEN);
                }
            }
            _ => {
                report(StatusCode::UNAUTHORIZED, None, Some("invalid_api_key".to_string()), request.stream);
                return Err(StatusCode::UNAUTHORIZED);
            }
        }
    }

    // Check if client expects streaming via Accept header
    // Some clients (like Claude Code) may indicate streaming preference via headers
    let accept_header = headers.get("accept").and_then(|v| v.to_str().ok());
    let expects_sse = accept_header
        .map(|a| a.contains("text/event-stream"))
        .unwrap_or(false);

    if expects_sse && !request.stream {
        info!("Client expects SSE (Accept: text/event-stream), enabling streaming");
        request.stream = true;
    }

    info!("📋 Final streaming mode: {}", request.stream);

    // Convert Anthropic messages to llm-connector format
    let llm_messages: Vec<LlmMessage> = request
        .messages
        .into_iter()
        .map(|msg| {
            let role = match msg.role.as_str() {
                "user" => LlmRole::User,
                "assistant" => LlmRole::Assistant,
                "system" => LlmRole::System,
                _ => LlmRole::User, // Default to user
            };

            LlmMessage {
                role,
                content: msg.content,
                name: None,
                tool_calls: None,
                tool_call_id: None,
                reasoning_content: None,
                reasoning: None,
                thought: None,
                thinking: None,
            }
        })
        .collect();

    if request.stream {
        // Streaming response
        let llm_service = state.llm_service.read().await;
        let config = state.config.read().await;
        // Use configured model instead of client model to avoid mapping issues
        let configured_model = match &config.llm_backend {
            crate::settings::LlmBackendSettings::Aliyun { model, .. } => model,
            _ => &request.model,
        };
        info!("DEBUG: Using model for streaming: {} (client requested: {})", configured_model, request.model);
        let stream_result: Result<_, _> = llm_service.chat_stream_openai(Some(configured_model), llm_messages, None, llm_connector::StreamFormat::SSE).await;

        match stream_result {
            Ok(stream) => {
                info!("Starting Anthropic streaming response");
                let anthropic_stream = convert_to_anthropic_stream(stream, request.model.clone());
                let response = Sse::new(anthropic_stream).into_response();
                // Add required Anthropic API headers
                let mut response = response;
                response.headers_mut().insert("anthropic-version", "2023-06-01".parse().unwrap());
                response.headers_mut().insert("request-id", uuid::Uuid::new_v4().to_string().parse().unwrap());
                report(StatusCode::OK, None, None, true);
                Ok(response)
            }
            Err(e) => {
                error!("Streaming error: {}", e);
                report(StatusCode::INTERNAL_SERVER_ERROR, None, Some("streaming_failed".to_string()), true);
                Err(StatusCode::INTERNAL_SERVER_ERROR)
            }
        }
    } else {
        // Non-streaming response
        let llm_service = state.llm_service.read().await;
        let config = state.config.read().await;
        // Use configured model instead of client model to avoid mapping issues
        let configured_model = match &config.llm_backend {
            crate::settings::LlmBackendSettings::Aliyun { model, .. } => model,
            _ => &request.model,
        };
        info!("DEBUG: Using model: {} (client requested: {})", configured_model, request.model);
        let chat_result: Result<crate::engine::Response, _> = llm_service.chat(Some(configured_model), llm_messages, None).await;

        match chat_result {
            Ok(response) => {
                info!("Anthropic non-streaming response successful");

                let anthropic_response = AnthropicMessagesResponse {
                    id: uuid::Uuid::new_v4().to_string(),
                    type_: "message".to_string(),
                    role: "assistant".to_string(),
                    content: vec![AnthropicContent {
                        type_: "text".to_string(),
                        text: response.content,
                    }],
                    model: request.model,
                    stop_reason: Some("end_turn".to_string()),
                    usage: AnthropicUsage {
                        input_tokens: response.usage.prompt_tokens,
                        output_tokens: response.usage.completion_tokens,
                    },
                };

                let response_payload = serde_json::to_value(&anthropic_response).ok();
                let mut response = Json(anthropic_response).into_response();
                // Add required Anthropic API headers for non-streaming responses
                response.headers_mut().insert("anthropic-version", "2023-06-01".parse().unwrap());
                response.headers_mut().insert("request-id", uuid::Uuid::new_v4().to_string().parse().unwrap());
                report(StatusCode::OK, response_payload, None, false);
                Ok(response)
            }
            Err(e) => {
                error!("Chat error: {}", e);
                report(StatusCode::INTERNAL_SERVER_ERROR, None, Some("chat_failed".to_string()), false);
                Err(StatusCode::INTERNAL_SERVER_ERROR)
            }
        }
    }
}

/// Convert OpenAI stream to Anthropic SSE format
#[allow(dead_code)]
fn convert_to_anthropic_stream(
    stream: tokio_stream::wrappers::UnboundedReceiverStream<String>,
    model: String,
) -> impl Stream<Item = Result<axum::response::sse::Event, std::convert::Infallible>> {
    use futures_util::{StreamExt, stream};
    
    let message_id = uuid::Uuid::new_v4().to_string();
    let model_clone = model.clone();

    // Create message_start event
    let start_event = json!({
        "type": "message_start",
        "message": {
            "id": message_id,
            "type": "message",
            "role": "assistant",
            "content": [],
            "model": model_clone,
            "stop_reason": null,
            "stop_sequence": null,
            "usage": {
                "input_tokens": 0,
                "output_tokens": 0
            }
        }
    });

    // Create content_block_start event
    let block_start_event = json!({
        "type": "content_block_start",
        "index": 0,
        "content_block": {
            "type": "text",
            "text": ""
        }
    });

    // Process main stream
    let content_stream = stream.map(move |data| {
        // Parse the SSE data
        let json_str = if data.starts_with("data: ") {
            &data[6..]
        } else {
            &data
        };

        // Skip empty lines and [DONE] markers
        if json_str.trim().is_empty() || json_str.trim() == "[DONE]" {
            let stop_event = json!({
                "type": "message_stop"
            });
            return Ok(axum::response::sse::Event::default()
                .event("message_stop")
                .data(stop_event.to_string()));
        }

        // Try to parse as OpenAI chunk
        if let Ok(chunk) = serde_json::from_str::<serde_json::Value>(json_str) {
            if let Some(content) = chunk["choices"][0]["delta"]["content"].as_str() {
                let event = json!({
                    "type": "content_block_delta",
                    "index": 0,
                    "delta": {
                        "type": "text_delta",
                        "text": content
                    }
                });
                return Ok(axum::response::sse::Event::default()
                    .event("content_block_delta")
                    .data(event.to_string()));
            }
        }

        // If parsing fails, return empty event
        Ok(axum::response::sse::Event::default().data(""))
    });

    // Chain all events together: start -> block_start -> content -> stop
    stream::once(async move {
        Ok(axum::response::sse::Event::default()
            .event("message_start")
            .data(start_event.to_string()))
    })
    .chain(stream::once(async move {
        Ok(axum::response::sse::Event::default()
            .event("content_block_start")
            .data(block_start_event.to_string()))
    }))
    .chain(content_stream)
    .chain(stream::once(async move {
        let block_stop_event = json!({
            "type": "content_block_stop",
            "index": 0
        });
        Ok(axum::response::sse::Event::default()
            .event("content_block_stop")
            .data(block_stop_event.to_string()))
    }))
    .chain(stream::once(async move {
        let message_delta_event = json!({
            "type": "message_delta",
            "delta": {
                "stop_reason": "end_turn",
                "stop_sequence": null
            },
            "usage": {
                "output_tokens": 0
            }
        });
        Ok(axum::response::sse::Event::default()
            .event("message_delta")
            .data(message_delta_event.to_string()))
    }))
    .chain(stream::once(async move {
        let stop_event = json!({
            "type": "message_stop"
        });
        Ok(axum::response::sse::Event::default()
            .event("message_stop")
            .data(stop_event.to_string()))
    }))
}

/// Anthropic Models API (占位符)
///
/// 用于列出可用的 Anthropic 模型
#[allow(dead_code)]
pub async fn models(
    State(state): State<ProxyState>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let start_time = Instant::now();
    let start_timestamp = Utc::now();
    let report = |status: StatusCode,
                  response_payload: Option<serde_json::Value>,
                  error: Option<String>| {
        if let Some(xtrace) = state.xtrace.as_ref() {
            xtrace.report_request(
                "GET",
                "/v1/models",
                status.as_u16(),
                None,
                response_payload,
                error,
                false,
                start_time,
                start_timestamp,
            );
        }
    };
    let llm_service: tokio::sync::RwLockReadGuard<'_, LlmService> = state.llm_service.read().await;
    let models_result: Result<Vec<Model>, _> = llm_service.list_models().await;

    match models_result {
        Ok(models) => {
            let anthropic_models: Vec<serde_json::Value> = models.into_iter().map(|model| {
                json!({
                    "id": model.id,
                    "type": "model",
                    "display_name": model.id,
                    "created_at": chrono::Utc::now().to_rfc3339(),
                })
            }).collect();

            let config = state.config.read().await;
            let current_provider = match &config.llm_backend {
                crate::settings::LlmBackendSettings::OpenAI { .. } => "openai",
                crate::settings::LlmBackendSettings::Anthropic { .. } => "anthropic",
                crate::settings::LlmBackendSettings::Zhipu { .. } => "zhipu",
                crate::settings::LlmBackendSettings::Ollama { .. } => "ollama",
                crate::settings::LlmBackendSettings::Aliyun { .. } => "aliyun",
                crate::settings::LlmBackendSettings::Volcengine { .. } => "volcengine",
                crate::settings::LlmBackendSettings::Tencent { .. } => "tencent",
                crate::settings::LlmBackendSettings::Longcat { .. } => "longcat",
                crate::settings::LlmBackendSettings::Moonshot { .. } => "moonshot",
                crate::settings::LlmBackendSettings::Minimax { .. } => "minimax",
            };

            let response = json!({
                "data": anthropic_models,
                "provider": current_provider,
            });
            report(StatusCode::OK, Some(response.clone()), None);
            Ok(Json(response))
        }
        Err(_) => {
            report(StatusCode::INTERNAL_SERVER_ERROR, None, Some("model_list_failed".to_string()));
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

/// Anthropic Count Tokens API
/// 
/// Claude Code 使用此端点来计算 token 数量
/// 我们返回一个模拟的 token 计数响应
#[allow(dead_code)]
pub async fn count_tokens(
    State(state): State<ProxyState>,
    Json(request): Json<serde_json::Value>,
) -> Result<Response, StatusCode> {
    let start_time = Instant::now();
    let start_timestamp = Utc::now();
    let request_payload = Some(request.clone());
    let report = |status: StatusCode,
                  response_payload: Option<serde_json::Value>,
                  error: Option<String>| {
        if let Some(xtrace) = state.xtrace.as_ref() {
            xtrace.report_request(
                "POST",
                "/v1/messages/count_tokens",
                status.as_u16(),
                request_payload.clone(),
                response_payload,
                error,
                false,
                start_time,
                start_timestamp,
            );
        }
    };
    info!("📊 Anthropic Count Tokens API request received");
    
    // 计算整个请求的字符数来估算 token
    let request_str = serde_json::to_string(&request).unwrap_or_default();
    let total_chars = request_str.len();
    
    // 简单估算：每4个字符约等于1个token
    let estimated_tokens = (total_chars / 4).max(1);
    
    info!("📊 Estimated tokens: {} (from {} chars)", estimated_tokens, total_chars);
    
    let response = json!({
        "input_tokens": estimated_tokens
    });
    
    let mut response = Json(response).into_response();
    // Add required Anthropic API headers
    response.headers_mut().insert("anthropic-version", "2023-06-01".parse().unwrap());
    response.headers_mut().insert("request-id", uuid::Uuid::new_v4().to_string().parse().unwrap());
    report(StatusCode::OK, Some(json!({
        "input_tokens": estimated_tokens
    })), None);
    Ok(response)
}
