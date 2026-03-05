use super::{ApiType, Provider, ProviderConfig};
use anyhow::Result;
use llm_connector::LlmClient;

/// Anthropic Provider implementation
#[allow(dead_code)]
pub struct AnthropicProvider;

impl Provider for AnthropicProvider {
    fn name() -> &'static str {
        "anthropic"
    }
    
    fn create_client(config: &ProviderConfig) -> Result<LlmClient> {
        let base_url = config.base_url.as_deref().unwrap_or_else(|| super::ProviderRegistry::get_default_base_url("anthropic", config.region.as_deref()).unwrap_or("https://api.anthropic.com/v1"));
        Ok(LlmClient::anthropic(&config.api_key, base_url)?)
    }
    
    fn env_var_name() -> &'static str {
        "ANTHROPIC_API_KEY"
    }
    
    fn api_type() -> ApiType {
        ApiType::Native
    }
    
    fn requires_api_key() -> bool {
        true
    }
}
