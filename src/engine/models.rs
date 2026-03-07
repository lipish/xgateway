use super::Client;
use super::Model;
use crate::settings::LlmBackendSettings;
use anyhow::Result;
use llm_connector::Provider;

impl Client {
    /// List available models
    pub async fn list_models(&self) -> Result<Vec<Model>> {
        let provider_name = match &self.backend {
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
            LlmBackendSettings::DeepSeek { .. } => "deepseek",
        };

        // Special handling for Ollama - get actual installed models
        if provider_name == "ollama" {
            if let Some(ollama_client) = self.llm_client.as_ollama() {
                match ollama_client.models().await {
                    Ok(ollama_models) => {
                        let models: Vec<Model> = ollama_models
                            .into_iter()
                            .map(|model_name| Model { id: model_name })
                            .collect();

                        if !models.is_empty() {
                            return Ok(models);
                        }
                    }
                    Err(e) => {
                        eprintln!("Warning: Failed to get Ollama models: {}, falling back to current model", e);
                    }
                }
            }
        }

        // Fall back to current model from backend config
        let fallback_model = match &self.backend {
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
            LlmBackendSettings::DeepSeek { model, .. } => model.clone(),
        };

        Ok(vec![Model { id: fallback_model }])
    }
}
