pub mod openai;
pub mod ollama;
pub mod anthropic;
pub mod convert;
pub mod config;

use crate::settings::{Settings, LlmBackendSettings};
use crate::service::Service as LlmService;
use axum::response::Json;
use axum::extract::State;
use axum::http::StatusCode;
use serde_json::json;
use std::sync::Arc;
use tokio::sync::RwLock;
use anyhow::Result;

/// Application state
#[derive(Clone)]
pub struct AppState {
    pub llm_service: Arc<RwLock<LlmService>>,
    pub config: Arc<RwLock<Settings>>,
}

impl AppState {
    pub fn new(llm_service: LlmService, config: Settings) -> Self {
        Self {
            llm_service: Arc::new(RwLock::new(llm_service)),
            config: Arc::new(RwLock::new(config)),
        }
    }

    /// Dynamically update LLM service configuration
    ///
    /// This method allows updating LLM backend configuration at runtime without restarting the service
    pub async fn update_llm_service(&self, new_backend: &LlmBackendSettings) -> Result<()> {
        // Create new LLM service
        let new_service = LlmService::new(new_backend)?;

        // Update service
        {
            let mut service = self.llm_service.write().await;
            *service = new_service;
        }

        // Update configuration
        {
            let mut config = self.config.write().await;
            config.llm_backend = new_backend.clone();
        }

        Ok(())
    }

    /// Get a copy of the current configuration
    pub async fn get_current_config(&self) -> Result<Settings> {
        let config = self.config.read().await;
        Ok(config.clone())
    }
}

/// Health check endpoint
pub async fn health_check() -> Json<serde_json::Value> {
    Json(json!({
        "status": "ok",
        "service": "llm-link",
        "version": "0.1.0"
    }))
}

/// Debug test endpoint
pub async fn debug_test() -> Json<serde_json::Value> {
    Json(json!({
        "debug": "test",
        "timestamp": "2025-10-15T16:00:00Z"
    }))
}

/// Get complete provider and model information
pub async fn info(
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let config = state.config.read().await;
    let current_provider = get_provider_name(&config.llm_backend);
    let current_model = get_current_model(&config.llm_backend);

    let mut api_endpoints = serde_json::Map::with_capacity(3);

    if let Some(ollama_config) = &config.apis.ollama {
        if ollama_config.enabled {
            api_endpoints.insert("ollama".to_string(), json!({
                "path": ollama_config.path,
                "enabled": true,
                "auth_required": ollama_config.api_key.is_some(),
            }));
        }
    }

    if let Some(openai_config) = &config.apis.openai {
        if openai_config.enabled {
            api_endpoints.insert("openai".to_string(), json!({
                "path": openai_config.path,
                "enabled": true,
                "auth_required": openai_config.api_key.is_some(),
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

    let response = json!({
        "service": "llm-link",
        "version": "0.3.3",
        "current_provider": current_provider,
        "current_model": current_model,
        "api_endpoints": api_endpoints,
    });

    Ok(Json(response))
}

fn get_provider_name(backend: &LlmBackendSettings) -> &str {
    match backend {
        LlmBackendSettings::OpenAI { .. } => "openai",
        LlmBackendSettings::Anthropic { .. } => "anthropic",
        LlmBackendSettings::Zhipu { .. } => "zhipu",
        LlmBackendSettings::Ollama { .. } => "ollama",
        LlmBackendSettings::Aliyun { .. } => "aliyun",
        LlmBackendSettings::Volcengine { .. } => "volcengine",
        LlmBackendSettings::Tencent { .. } => "tencent",
        LlmBackendSettings::Longcat { .. } => "longcat",
        LlmBackendSettings::Moonshot { .. } => "moonshot",
        LlmBackendSettings::Minimax { .. } => "minimax",
    }
}

fn get_current_model(backend: &LlmBackendSettings) -> String {
    match backend {
        LlmBackendSettings::OpenAI { model, .. } => model.clone(),
        LlmBackendSettings::Anthropic { model, .. } => model.clone(),
        LlmBackendSettings::Zhipu { model, .. } => model.clone(),
        LlmBackendSettings::Ollama { model, .. } => model.clone(),
        LlmBackendSettings::Aliyun { model, .. } => model.clone(),
        LlmBackendSettings::Volcengine { model, .. } => model.clone(),
        LlmBackendSettings::Tencent { model, .. } => model.clone(),
        LlmBackendSettings::Longcat { model, .. } => model.clone(),
        LlmBackendSettings::Moonshot { model, .. } => model.clone(),
        LlmBackendSettings::Minimax { model, .. } => model.clone(),
    }
}