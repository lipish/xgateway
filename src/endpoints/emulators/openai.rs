use axum::{
    extract::{Query, State},
    http::{HeaderMap, StatusCode},
    response::{IntoResponse, Json},
    response::Response,
    body::Body,
};
use futures::StreamExt;
use serde::Deserialize;
use serde_json::{json, Value};
use std::convert::Infallible;
use std::time::Instant;
use tracing::{info, warn, error};
use chrono::Utc;

use crate::tuner::{ClientTuner, FormatDetector};
use crate::endpoints::ProxyState;
use crate::engine::Model;
use crate::service::Service as LlmService;
use super::convert;
use super::errors::{json_error_response, status_from_anyhow};

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
pub struct OpenAIChatRequest {
    #[allow(dead_code)]
    pub model: String,
    #[allow(dead_code)]
    pub messages: Vec<Value>,
    #[allow(dead_code)]
    pub stream: Option<bool>,
    #[allow(dead_code)]
    pub max_tokens: Option<u32>,
    #[allow(dead_code)]
    pub temperature: Option<f32>,
    #[allow(dead_code)]
    pub tools: Option<Vec<Value>>,
    #[allow(dead_code)]
    pub tool_choice: Option<Value>,
}

#[derive(Debug, Deserialize)]
pub struct OpenAIModelsParams {
    // OpenAI models endpoint parameters (if any)
}

/// OpenAI Chat Completions API
#[allow(dead_code)]
pub async fn chat(
    headers: HeaderMap,
    State(state): State<ProxyState>,
    Json(request): Json<OpenAIChatRequest>,
) -> Response {
    let xtrace = state.xtrace.clone();
    let start_time = Instant::now();
    let start_timestamp = Utc::now();
    let request_payload = Some(json!({
        "model": request.model,
        "messages": request.messages,
        "stream": request.stream,
        "max_tokens": request.max_tokens,
        "temperature": request.temperature,
        "tools": request.tools,
        "tool_choice": request.tool_choice,
    }));
    let report = |status: StatusCode,
                  response_payload: Option<Value>,
                  error: Option<String>,
                  is_stream: bool| {
        if let Some(xtrace) = xtrace.as_ref() {
            xtrace.report_request(
                "POST",
                "/openai/v1/chat/completions",
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
    // API Key 校验
    if let Err(err) = enforce_api_key(&headers, &state).await {
        report(err, None, Some("unauthorized".to_string()), false);
        return json_error_response(err, "OpenAI API key authentication failed", Some("unauthorized"));
    }

    info!("📝 Received request - model: {}, stream: {:?}, messages count: {}",
          request.model, request.stream, request.messages.len());

    // 验证模型
    if !request.model.is_empty() {
        let validation_result = {
            let llm_service = state.llm_service.read().await;
            llm_service.validate_model(&request.model).await
        };

        match validation_result {
            Ok(false) => {
                error!("Model validation failed: model '{}' not found", request.model);
                report(StatusCode::BAD_REQUEST, None, Some("model_not_found".to_string()), false);
                return json_error_response(
                    StatusCode::BAD_REQUEST,
                    format!("Model '{}' not found", request.model),
                    Some("model_not_found"),
                );
            }
            Err(e) => {
                error!("Model validation error: {:?}", e);
                report(StatusCode::INTERNAL_SERVER_ERROR, None, Some("model_validation_failed".to_string()), false);
                return json_error_response(
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "Model validation failed",
                    Some("model_validation_failed"),
                );
            }
            Ok(true) => {
                info!("Model '{}' validated successfully", request.model);
            }
        }
    }

    // 转换消息格式
    match convert::openai_messages_to_llm(request.messages) {
        Ok(messages) => {
            info!("Successfully converted {} messages", messages.len());
            let model = if request.model.is_empty() { None } else { Some(request.model.as_str()) };

            // 转换 tools 格式
            let tools = request.tools.map(convert::openai_tools_to_llm);
            if let Some(ref tools_ref) = tools {
                info!("Request includes {} tools", tools_ref.len());
                // Debug: log the first tool
                if let Some(first_tool) = tools_ref.first() {
                    info!("First tool: {:?}", serde_json::to_value(first_tool).ok());
                }
            }

            // 使用流式模式（llm-connector 0.7.0 统一流式能力）
            let use_streaming = request.stream.unwrap_or(false);
            if use_streaming {
                info!("🌊 Using streaming mode");
                if let Some(ref tools_ref) = tools {
                    info!("Streaming with {} tools (llm-connector 0.7.0)", tools_ref.len());
                }
                match handle_streaming_request(headers, state, model, messages, tools).await {
                    Ok(resp) => {
                        report(StatusCode::OK, None, None, true);
                        resp
                    }
                    Err(err) => {
                        report(err, None, Some("streaming_failed".to_string()), true);
                        json_error_response(err, "Streaming request failed", Some("streaming_failed"))
                    }
                }
            } else {
                info!("📝 Using non-streaming mode");
                match handle_non_streaming_request(state, model, messages, tools).await {
                    Ok(resp) => {
                        report(StatusCode::OK, None, None, false);
                        resp
                    }
                    Err(err) => {
                        report(err, None, Some("chat_failed".to_string()), false);
                        json_error_response(err, "Chat request failed", Some("chat_failed"))
                    }
                }
            }
        }
        Err(e) => {
            error!("Failed to convert OpenAI messages: {:?}", e);
            report(StatusCode::BAD_REQUEST, None, Some("invalid_messages".to_string()), false);
            json_error_response(
                StatusCode::BAD_REQUEST,
                "Invalid messages payload",
                Some("invalid_messages"),
            )
        }
    }
}

/// 处理流式请求
#[allow(dead_code)]
async fn handle_streaming_request(
    headers: HeaderMap,
    state: ProxyState,
    model: Option<&str>,
    messages: Vec<llm_connector::types::Message>,
    tools: Option<Vec<llm_connector::types::Tool>>,
) -> Result<Response, StatusCode> {
    // 🎯 检测客户端类型（默认使用 OpenAI 适配器）
    let config = state.config.read().await;
    let client_adapter = detect_openai_client(&headers, &config);
    let (_stream_format, _) = FormatDetector::determine_format(&headers);
    drop(config); // 释放读锁
    
    // 使用客户端偏好格式（SSE）
    let final_format = client_adapter.preferred_format();
    let content_type = FormatDetector::get_content_type(final_format);

    info!("Starting OpenAI streaming response - Format: {:?} ({})", final_format, content_type);

    let llm_service = state.llm_service.read().await;
    let stream_result: Result<_, _> = llm_service.chat_stream_openai(model, messages.clone(), tools.clone(), final_format).await;
    drop(llm_service); // 显式释放锁

    match stream_result {
        Ok(rx) => {
            info!("OpenAI streaming response started successfully");

            // Get config before entering the map closure and clone it for the closure
            let config = state.config.read().await.clone();
            let adapted_stream = rx.map(move |data| {
                // SSE 格式的数据以 "data: " 开头，需要先提取 JSON 部分
                let json_str = if data.starts_with("data: ") {
                    &data[6..] // 去掉 "data: " 前缀
                } else {
                    &data
                };

                // 跳过空行和 [DONE] 标记
                if json_str.trim().is_empty() || json_str.trim() == "[DONE]" {
                    return data.to_string();
                }

                // 解析并适配响应数据
                if let Ok(mut json_data) = serde_json::from_str::<Value>(json_str) {
                    tracing::debug!("📝 Parsed JSON chunk, applying adaptations...");
                    client_adapter.apply_response_adaptations(&config, &mut json_data);

                    match final_format {
                        llm_connector::StreamFormat::SSE => {
                            format!("data: {}\n\n", json_data)
                        }
                        llm_connector::StreamFormat::NDJSON => {
                            format!("{}\n", json_data)
                        }
                        llm_connector::StreamFormat::Json => {
                            json_data.to_string()
                        }
                    }
                } else {
                    tracing::debug!("Failed to parse chunk as JSON: {}", json_str);
                    data.to_string()
                }
            });

            let body_stream = adapted_stream.map(Ok::<_, Infallible>);
            let body = Body::from_stream(body_stream);

            let response = Response::builder()
                .status(200)
                .header("content-type", content_type)
                .header("cache-control", "no-cache")
                .body(body)
                .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

            Ok(response)
        }
        Err(e) => {
            warn!("OpenAI streaming failed, returning streaming error without non-stream fallback: {:?}", e);
            Err(status_from_anyhow(&e))
        }
    }
}

/// 处理非流式请求
#[allow(dead_code)]
async fn handle_non_streaming_request(
    state: ProxyState,
    model: Option<&str>,
    messages: Vec<llm_connector::types::Message>,
    tools: Option<Vec<llm_connector::types::Tool>>,
) -> Result<Response, StatusCode> {
    let llm_service = state.llm_service.read().await;
    let chat_result: Result<crate::engine::Response, _> = llm_service.chat(model, messages, tools).await;

    match chat_result {
        Ok(response) => {
            let openai_response = convert::response_to_openai(response);
            Ok(Json(openai_response).into_response())
        }
        Err(e) => {
            error!("OpenAI chat request failed: {:?}", e);
            Err(status_from_anyhow(&e))
        }
    }
}

/// OpenAI Models API
#[allow(dead_code)]
pub async fn models(
    headers: HeaderMap,
    State(state): State<ProxyState>,
    Query(_params): Query<OpenAIModelsParams>,
) -> Response {
    let xtrace = state.xtrace.clone();
    let start_time = Instant::now();
    let start_timestamp = Utc::now();
    let report = |status: StatusCode,
                  response_payload: Option<Value>,
                  error: Option<String>| {
        if let Some(xtrace) = xtrace.as_ref() {
            xtrace.report_request(
                "GET",
                "/openai/v1/models",
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
    if let Err(err) = enforce_api_key(&headers, &state).await {
        report(err, None, Some("unauthorized".to_string()));
        return json_error_response(err, "OpenAI API key authentication failed", Some("unauthorized"));
    }

    let llm_service: tokio::sync::RwLockReadGuard<'_, LlmService> = state.llm_service.read().await;
    let models_result: Result<Vec<Model>, _> = llm_service.list_models().await;

    match models_result {
        Ok(models) => {
            let openai_models: Vec<Value> = models.into_iter().map(|model| {
                json!({
                    "id": model.id,
                    "object": "model",
                    "created": chrono::Utc::now().timestamp(),
                    "owned_by": "system"
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
                crate::settings::LlmBackendSettings::DeepSeek { .. } => "deepseek",
            };

            let response = json!({
                "object": "list",
                "data": openai_models,
                "provider": current_provider,
            });
            report(StatusCode::OK, Some(response.clone()), None);
            Json(response).into_response()
        }
        Err(e) => {
            error!("OpenAI models request failed: {:?}", e);
            report(StatusCode::INTERNAL_SERVER_ERROR, None, Some("model_list_failed".to_string()));
            json_error_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                "Failed to list models",
                Some("model_list_failed"),
            )
        }
    }
}

/// OpenAI API Key 认证
#[allow(dead_code)]
async fn enforce_api_key(headers: &HeaderMap, state: &ProxyState) -> Result<(), StatusCode> {
    let config = state.config.read().await;
    if let Some(cfg) = &config.apis.openai {
        if cfg.enabled {
            if let Some(expected_key) = cfg.api_key.as_ref() {
                let header_name = cfg.api_key_header.as_deref().unwrap_or("authorization").to_ascii_lowercase();
                
                let value_opt = if header_name == "authorization" {
                    headers.get(axum::http::header::AUTHORIZATION)
                } else {
                    match axum::http::HeaderName::from_bytes(header_name.as_bytes()) {
                        Ok(name) => headers.get(name),
                        Err(_) => None,
                    }
                };

                if let Some(value) = value_opt {
                    if let Ok(value_str) = value.to_str() {
                        let token = if value_str.starts_with("Bearer ") {
                            &value_str[7..]
                        } else {
                            value_str
                        };

                        if token == expected_key {
                            info!("OpenAI API key authentication successful");
                            return Ok(());
                        }
                    }
                }

                warn!("🚫 OpenAI API key authentication failed");
                return Err(StatusCode::UNAUTHORIZED);
            }
        }
    }
    Ok(())
}

/// 检测 OpenAI 客户端类型
#[allow(dead_code)]
fn detect_openai_client(headers: &HeaderMap, _config: &crate::settings::Settings) -> ClientTuner {
    if let Some(ua) = headers.get("user-agent") {
        let ua_str = ua.to_str().unwrap_or("").to_lowercase();
        if ua_str.contains("zed") {
            return ClientTuner::Zed;
        }
    }
    ClientTuner::OpenAI
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_json_error_response_has_type_and_code() {
        let response = json_error_response(
            StatusCode::TOO_MANY_REQUESTS,
            "rate limited",
            Some("rate_limit_exceeded"),
        );

        let status = response.status();
        let body = axum::body::to_bytes(response.into_body(), usize::MAX)
            .await
            .expect("read response body");
        let payload: serde_json::Value = serde_json::from_slice(&body).expect("parse json");

        assert_eq!(status, StatusCode::TOO_MANY_REQUESTS);
        assert_eq!(payload["error"]["type"], "rate_limit_exceeded");
        assert_eq!(payload["error"]["code"], "rate_limit_exceeded");
        assert_eq!(payload["error"]["message"], "rate limited");
    }
}
