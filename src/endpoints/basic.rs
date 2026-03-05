use axum::{extract::State, response::Json};
use serde_json::json;
use crate::endpoints::ProxyState;

/// Health check endpoint
pub async fn health_check() -> Json<serde_json::Value> {
    Json(json!({
        "status": "ok",
        "service": "xgateway",
        "version": env!("CARGO_PKG_VERSION"),
        "timestamp": chrono::Utc::now().to_rfc3339()
    }))
}

/// Get complete provider and model information
pub async fn info(
    State(state): State<ProxyState>,
) -> Json<serde_json::Value> {
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

    let mut api_endpoints = serde_json::Map::with_capacity(3);

    if let Some(ollama_config) = &config.apis.ollama {
        if ollama_config.enabled {
            api_endpoints.insert("ollama".to_string(), json!({
                "path": ollama_config.path,
                "enabled": true,
            }));
        }
    }

    if let Some(openai_config) = &config.apis.openai {
        if openai_config.enabled {
            api_endpoints.insert("openai".to_string(), json!({
                "path": openai_config.path,
                "enabled": true,
            }));
        }
    }

    if let Some(anthropic_config) = &config.apis.anthropic {
        if anthropic_config.enabled {
            api_endpoints.insert("anthropic".to_string(), json!({
                "path": anthropic_config.path,
                "enabled": true,
            }));
        }
    }

    Json(json!({
        "service": "xgateway",
        "version": env!("CARGO_PKG_VERSION"),
        "current_provider": current_provider,
        "api_endpoints": api_endpoints,
        "mode": "multi-provider",
    }))
}
