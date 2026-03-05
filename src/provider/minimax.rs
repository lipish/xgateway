use super::{ApiType, Provider, ProviderConfig};
use anyhow::Result;
use llm_connector::LlmClient;

/// Minimax Provider implementation
#[allow(dead_code)]
pub struct MinimaxProvider;

impl Provider for MinimaxProvider {
    fn name() -> &'static str {
        "minimax"
    }
    
    fn create_client(config: &ProviderConfig) -> Result<LlmClient> {
        // Minimax uses OpenAI compatible API
        // China: api.minimaxi.com, International: api.minimax.io
        let base_url = config.base_url.as_deref()
            .unwrap_or_else(|| super::ProviderRegistry::get_default_base_url("minimax", config.region.as_deref()).unwrap_or("https://api.minimax.io/v1"));
        Ok(LlmClient::openai_compatible(&config.api_key, base_url, Self::name())?)
    }
    
    fn env_var_name() -> &'static str {
        "MINIMAX_API_KEY"
    }
    
    fn api_type() -> ApiType {
        ApiType::OpenAICompatible
    }
    
    fn requires_api_key() -> bool {
        true
    }
    
    fn requires_base_url() -> bool {
        false
    }
    
    fn default_base_url() -> Option<&'static str> {
        Some("https://api.minimaxi.com/v1")
    }
}