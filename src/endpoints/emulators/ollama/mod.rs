use axum::{
    extract::State,
    http::{HeaderMap, StatusCode},
    response::Json,
    response::Response,
    body::Body,
    routing::{get, post},
    Router,
};
use serde_json::{json, Value};
use tracing::info;
use chrono::Utc;
use std::time::Instant;

use crate::endpoints::ProxyState;
use crate::endpoints::emulators::convert;
use crate::db::DatabasePool;
use crate::settings;

pub mod types;
pub mod minimax;
pub mod streaming;

pub use types::*;
pub use minimax::*;
pub use streaming::*;

/// Ollama Chat API - Internal implementation
async fn chat_impl(
    headers: HeaderMap,
    state: ProxyState,
    request: OllamaChatRequest,
) -> Result<Response, StatusCode> {
    let xtrace = state.xtrace.clone();
    let start_time = Instant::now();
    let start_timestamp = Utc::now();
    let request_payload = serde_json::to_value(&request).ok();
    let report = |status: StatusCode,
                  response_payload: Option<Value>,
                  error: Option<String>,
                  is_stream: bool| {
        if let Some(xtrace) = xtrace.as_ref() {
            xtrace.report_request(
                "POST",
                "/api/chat",
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
    // Check if this is a MiniMax request and use direct client
    let (is_minimax, minimax_api_key) = {
        let config = state.config.read().await;
        match &config.llm_backend {
            settings::LlmBackendSettings::Minimax { api_key, .. } => (true, Some(api_key.clone())),
            _ => (false, None),
        }
    };

    if is_minimax {
        let response = handle_minimax_chat(&request.model, request.messages, request.stream.unwrap_or(false), minimax_api_key).await;
        report(StatusCode::OK, None, None, request.stream.unwrap_or(false));
        return Ok(response);
    }

    // 验证模型
    if !request.model.is_empty() {
        let llm_service = state.llm_service.read().await;
        match llm_service.validate_model(&request.model).await {
            Ok(false) => {
                report(StatusCode::BAD_REQUEST, None, Some("model_not_found".to_string()), false);
                return Err(StatusCode::BAD_REQUEST);
            }
            Err(_) => {
                report(StatusCode::INTERNAL_SERVER_ERROR, None, Some("model_validation_failed".to_string()), false);
                return Err(StatusCode::INTERNAL_SERVER_ERROR);
            }
            Ok(true) => {}
        }
    }

    // 转换消息格式
    match convert::openai_messages_to_llm(request.messages) {
        Ok(messages) => {
            let model = if request.model.is_empty() { None } else { Some(request.model.as_str()) };
            let tools = handle_tool_caching(&request.model, request.tools);

            if request.stream.unwrap_or(false) {
                match handle_streaming_request(headers, state.clone(), model, messages.clone(), tools.clone()).await {
                    Ok(resp) => {
                        report(StatusCode::OK, None, None, true);
                        Ok(resp)
                    }
                    Err(_) => {
                        let msgs: Vec<llm_connector::types::Message> = messages;
                        let tls: Option<Vec<llm_connector::types::Tool>> = tools;
                        let resp = handle_generic_chat_nonstream(state, model.map(|s| s.to_string()), msgs, tls).await;
                        report(StatusCode::OK, None, None, false);
                        Ok(resp)
                    },
                }
            } else {
                let msgs: Vec<llm_connector::types::Message> = messages;
                let tls: Option<Vec<llm_connector::types::Tool>> = tools;
                let resp = handle_generic_chat_nonstream(state, model.map(|s| s.to_string()), msgs, tls).await;
                report(StatusCode::OK, None, None, false);
                Ok(resp)
            }
        }
        Err(_) => {
            report(StatusCode::BAD_REQUEST, None, Some("invalid_messages".to_string()), false);
            Err(StatusCode::BAD_REQUEST)
        }
    }
}

/// Ollama Chat API - Handler for Axum
pub async fn chat(
    State(state): State<ProxyState>,
    headers: HeaderMap,
    Json(request): Json<OllamaChatRequest>,
) -> Result<Response, StatusCode> {
    chat_impl(headers, state, request).await
}


async fn handle_generic_chat_nonstream(
    state: ProxyState,
    model_arg: Option<String>,
    messages: Vec<llm_connector::types::Message>,
    tools: Option<Vec<llm_connector::types::Tool>>,
) -> Response {
    let llm_service = state.llm_service.read().await;
    let model_ref = model_arg.as_deref();

    match llm_service.chat(model_ref, messages, tools).await {
        Ok(response) => {
            let ollama_response = convert::response_to_ollama(response);
            Response::builder()
                .status(200)
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_string(&ollama_response).unwrap()))
                .unwrap()
        }
        Err(e) => {
            info!("Chat request failed: {:?}", e);
            Response::builder()
                .status(500)
                .header("content-type", "application/json")
                .body(Body::from(json!({"error": "Chat request failed"}).to_string()))
                .unwrap()
        }
    }
}

pub async fn models(
    State(state): State<ProxyState>,
) -> Result<Json<Value>, StatusCode> {
    let start_time = Instant::now();
    let start_timestamp = Utc::now();
    let report = |status: StatusCode,
                  response_payload: Option<Value>,
                  error: Option<String>| {
        if let Some(xtrace) = state.xtrace.as_ref() {
            xtrace.report_request(
                "GET",
                "/api/tags",
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
    let llm_service = state.llm_service.read().await;
    let models_result = llm_service.list_models().await;

    match models_result {
        Ok(models) => {
            let ollama_models = convert::models_to_ollama(models);
            let config = state.config.read().await;
            let current_provider = match &config.llm_backend {
                settings::LlmBackendSettings::OpenAI { .. } => "openai",
                settings::LlmBackendSettings::Anthropic { .. } => "anthropic",
                settings::LlmBackendSettings::Zhipu { .. } => "zhipu",
                settings::LlmBackendSettings::Ollama { .. } => "ollama",
                settings::LlmBackendSettings::Aliyun { .. } => "aliyun",
                settings::LlmBackendSettings::Volcengine { .. } => "volcengine",
                settings::LlmBackendSettings::Tencent { .. } => "tencent",
                settings::LlmBackendSettings::Longcat { .. } => "longcat",
                settings::LlmBackendSettings::Moonshot { .. } => "moonshot",
                settings::LlmBackendSettings::Minimax { .. } => "minimax",
            };

            let response = json!({
                "models": ollama_models,
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

pub async fn show_handler(
    State(state): State<ProxyState>,
    Json(request): Json<Value>,
) -> Result<Json<Value>, StatusCode> {
    let start_time = Instant::now();
    let start_timestamp = Utc::now();
    let request_payload = Some(request.clone());
    let report = |status: StatusCode,
                  response_payload: Option<Value>,
                  error: Option<String>| {
        if let Some(xtrace) = state.xtrace.as_ref() {
            xtrace.report_request(
                "POST",
                "/api/show",
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
    let model_name = request.get("name")
        .or_else(|| request.get("model"))
        .and_then(|v| v.as_str())
        .unwrap_or("MiniMax-M2");

    let context_length = 4096;
    let response = json!({
        "license": "",
        "modelfile": format!("FROM {}", model_name),
        "parameters": format!("num_ctx {}", context_length),
        "template": "{{ if .System }}{{ .System }}{{ end }}{{ if .Prompt }}{{ .Prompt }}{{ end }}{{ .Response }}",
        "details": {
            "parent_model": "",
            "format": "gguf",
            "family": model_name.split('-').next().unwrap_or("unknown"),
            "families": [model_name.split('-').next().unwrap_or("unknown")],
            "parameter_size": "7B",
            "quantization_level": "Q4_K_M"
        },
        "model_info": {
            "llama.context_length": context_length,
            "general.architecture": "llama",
            "general.parameter_count": 7000000000u64,
        }
    });
    report(StatusCode::OK, Some(response.clone()), None);
    Ok(Json(response))
}

#[allow(dead_code)]
pub fn build_ollama_routes(state: ProxyState, ollama_config: &settings::OllamaApiSettings, db_pool: DatabasePool) -> Router {
  let state_for_chat = state.clone();
    Router::new()
        .route(&format!("{}/api/tags", ollama_config.path), get(move |axum::extract::State(s): axum::extract::State<ProxyState>| {
            let db = db_pool.clone();
            async move {
                let start_time = Instant::now();
                let start_timestamp = Utc::now();
                let provider_name = {
                    let cfg = s.config.read().await;
                    match &cfg.llm_backend {
                        settings::LlmBackendSettings::OpenAI { .. } => "openai",
                        settings::LlmBackendSettings::Anthropic { .. } => "anthropic",
                        settings::LlmBackendSettings::Zhipu { .. } => "zhipu",
                        settings::LlmBackendSettings::Ollama { .. } => "ollama",
                        settings::LlmBackendSettings::Aliyun { .. } => "aliyun",
                        settings::LlmBackendSettings::Volcengine { .. } => "volcengine",
                        settings::LlmBackendSettings::Tencent { .. } => "tencent",
                        settings::LlmBackendSettings::Longcat { .. } => "longcat",
                        settings::LlmBackendSettings::Moonshot { .. } => "moonshot",
                        settings::LlmBackendSettings::Minimax { .. } => "minimax",
                    }.to_string()
                };

                let provider_models = match db.get_provider_type(&provider_name).await {
                    Ok(Some(pt)) => serde_json::from_str(&pt.models).unwrap_or_default(),
                    _ => Vec::<crate::db::ModelInfo>::new(),
                };

                let ollama_models: Vec<Value> = provider_models.into_iter().map(|m| {
                    let family = m.id.split('-').next().unwrap_or("model");
                    let mut tags = Vec::new();
                    if m.supports_tools.unwrap_or(false) { tags.push("tools"); }
                    json!({
                        "name": m.id, "model": m.id, "modified_at": "2025-01-01T00:00:00Z",
                        "size": 0, "digest": m.id, "details": { "format": "remote", "family": family, "families": [family], "parameter_size": "", "quantization_level": "" },
                        "tags": tags
                    })
                }).collect();
                let response = json!({ "models": ollama_models });
                if let Some(xtrace) = s.xtrace.as_ref() {
                    xtrace.report_request(
                        "GET",
                        "/api/tags",
                        StatusCode::OK.as_u16(),
                        None,
                        Some(response.clone()),
                        None,
                        false,
                        start_time,
                        start_timestamp,
                    );
                }
                Json(response)
            }
        }))
        .route(&format!("{}/api/chat", ollama_config.path), post(move |axum::extract::State(s): axum::extract::State<ProxyState>, Json(req): Json<Value>| {
            async move {
                let xtrace = s.xtrace.clone();
                let start_time = Instant::now();
                let start_timestamp = Utc::now();
                let request_payload = Some(req.clone());
                let report = |status: StatusCode,
                              response_payload: Option<Value>,
                              error: Option<String>,
                              is_stream: bool| {
                    if let Some(xtrace) = xtrace.as_ref() {
                        xtrace.report_request(
                            "POST",
                            "/api/chat",
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
                let model = req.get("model").and_then(|v| v.as_str()).unwrap_or("MiniMax-M2").to_string();
                let messages_value = req.get("messages").and_then(|v| v.as_array()).cloned().unwrap_or_default();
                let stream = req.get("stream").and_then(|v| v.as_bool()).unwrap_or(false);
                let tools_value = req.get("tools").and_then(|v| v.as_array()).cloned();

                let config = s.config.read().await;
                let (is_minimax, minimax_api_key) = match &config.llm_backend {
                    settings::LlmBackendSettings::Minimax { api_key, .. } => (true, Some(api_key.clone())),
                    _ => (false, None),
                };
                drop(config);

                if is_minimax {
                    let response = handle_minimax_chat(&model, messages_value, stream, minimax_api_key).await;
                    report(StatusCode::OK, None, None, stream);
                    response
                } else {
                    let messages = match convert::openai_messages_to_llm(messages_value) {
                        Ok(messages) => messages,
                        Err(e) => {
                            info!("Failed to convert messages: {:?}", e);
                            report(StatusCode::BAD_REQUEST, None, Some("invalid_messages".to_string()), false);
                            return Response::builder()
                                .status(400)
                                .header("content-type", "application/json")
                                .body(Body::from(json!({"error": "Invalid messages format"}).to_string()))
                                .unwrap();
                        }
                    };
                    let tools = tools_value.map(|t| convert::openai_tools_to_llm(t));
                    
                    if stream {
                        let resp = handle_generic_chat_stream(s, Some(model), messages, tools).await;
                        report(StatusCode::OK, None, None, true);
                        resp
                    } else {
                        let msgs: Vec<llm_connector::types::Message> = messages;
                        let tls: Option<Vec<llm_connector::types::Tool>> = tools;
                        let resp = handle_generic_chat_nonstream(s, Some(model), msgs, tls).await;
                        report(StatusCode::OK, None, None, false);
                        resp
                    }
                }
            }
        }))
        .route(&format!("{}/api/show", ollama_config.path), post(show_handler))
        .route(&format!("{}/api/version", ollama_config.path), get(move |axum::extract::State(s): axum::extract::State<ProxyState>| async move {
            let start_time = Instant::now();
            let start_timestamp = Utc::now();
            let response = json!({ "version": "0.1.0", "build": "xgateway" });
            if let Some(xtrace) = s.xtrace.as_ref() {
                xtrace.report_request(
                    "GET",
                    "/api/version",
                    StatusCode::OK.as_u16(),
                    None,
                    Some(response.clone()),
                    None,
                    false,
                    start_time,
                    start_timestamp,
                );
            }
            Json(response)
        }))
        .with_state(state_for_chat)
}
