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
        Ok(LlmClient::anthropic(&config.api_key)?)
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
