use axum::{
    http::{HeaderMap, StatusCode},
    response::Response,
    body::Body,
};
use futures::StreamExt;
use serde_json::Value;
use std::convert::Infallible;
use tracing::{info, warn};
use crate::tuner::{ClientTuner, FormatDetector};
use crate::endpoints::ProxyState;

pub async fn handle_streaming_request(
    headers: HeaderMap,
    state: ProxyState,
    model: Option<&str>,
    messages: Vec<llm_connector::types::Message>,
    tools: Option<Vec<llm_connector::types::Tool>>,
) -> Result<Response, StatusCode> {
    // 🎯 检测客户端类型（Zed.dev 或标准）
    let config = state.config.read().await;
    let client_adapter = detect_ollama_client(&headers, &config);
    let (stream_format, _) = FormatDetector::determine_format(&headers);
    drop(config); // 释放读锁

    // 使用检测到的格式或客户端偏好
    let final_format = if headers.get("accept").is_none_or(|v| v.to_str().unwrap_or("").contains("*/*")) {
        client_adapter.preferred_format()
    } else {
        stream_format
    };

    let content_type = FormatDetector::get_content_type(final_format);

    info!("Starting Ollama streaming response - Client: {:?}, Format: {:?} ({}), Tools: {}",
          client_adapter, final_format, content_type, tools.as_ref().map_or(0, |t| t.len()));

    let llm_service = state.llm_service.read().await;
    let stream_result = llm_service.chat_stream_ollama_with_tools(model, messages.clone(), tools.clone(), final_format).await;
    drop(llm_service); // 显式释放锁

    match stream_result {
        Ok(rx) => {
            info!("Ollama streaming response started successfully");

            // Get config before entering the map closure and clone it for the closure
            let config = state.config.read().await.clone();
            let adapted_stream = rx.map(move |data| {
                // 解析并适配响应数据
                if let Ok(mut json_data) = serde_json::from_str::<Value>(&data) {
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
            warn!("Ollama streaming failed, falling back to non-streaming: {:?}", e);
            // 这里我们不能直接调用 handle_non_streaming_request 因为循环依赖
            // 我们将在 mod.rs 中处理这种回退逻辑，或者通过传递闭包
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

pub async fn handle_generic_chat_stream(
    state: ProxyState,
    model_arg: Option<String>,
    messages: Vec<llm_connector::types::Message>,
    tools: Option<Vec<llm_connector::types::Tool>>,
) -> Response {
    use futures::StreamExt;

    let llm_service = state.llm_service.read().await;
    let model_ref = model_arg.as_deref();

    match llm_service
        .chat_stream_ollama_with_tools(model_ref, messages, tools, llm_connector::StreamFormat::NDJSON)
        .await
    {
        Ok(rx) => {
            info!("Chat streaming response started successfully");

            let body_stream = rx.map(|data| Ok::<_, Infallible>(axum::body::Bytes::from(data)));
            let body = Body::from_stream(body_stream);

            Response::builder()
                .status(200)
                .header("content-type", "application/x-ndjson")
                .body(body)
                .unwrap()
        }
        Err(e) => {
            info!("Chat streaming request failed: {:?}", e);
            Response::builder()
                .status(500)
                .header("content-type", "application/json")
                .body(Body::from(
                    serde_json::json!({"error": "Chat request failed"}).to_string(),
                ))
                .unwrap()
        }
    }
}

pub fn detect_ollama_client(headers: &HeaderMap, config: &crate::settings::Settings) -> ClientTuner {
    // 3. 检查 User-Agent 自动检测
    if let Some(user_agent) = headers.get("user-agent") {
        if let Ok(ua_str) = user_agent.to_str() {
            // 检测 Zed.dev 编辑器
            if ua_str.starts_with("Zed/") {
                if let Some(ref adapters) = config.client_adapters {
                    if let Some(ref zed_config) = adapters.zed {
                        if zed_config.enabled {
                            return ClientTuner::Zed;
                        }
                    }
                }
            }
        }
    }

    // 4. 使用默认适配器
    if let Some(ref adapters) = config.client_adapters {
        if let Some(default_adapter) = &adapters.default_adapter {
            match default_adapter.to_lowercase().as_str() {
                "zed" | "zed.dev" => return ClientTuner::Zed,
                "standard" => return ClientTuner::Standard,
                _ => {}
            }
        }
    }

    // 5. 最终默认
    ClientTuner::Standard
}
