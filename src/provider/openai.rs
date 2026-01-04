use super::{ApiType, Provider, ProviderConfig};
use anyhow::Result;
use llm_connector::LlmClient;

/// OpenAI Provider implementation
#[allow(dead_code)]
pub struct OpenAIProvider;

impl Provider for OpenAIProvider {
    fn name() -> &'static str {
        "openai"
    }
    
    fn create_client(config: &ProviderConfig) -> Result<LlmClient> {
        if let Some(base_url) = &config.base_url {
            Ok(LlmClient::openai_compatible(&config.api_key, base_url, Self::name())?)
        } else {
            Ok(LlmClient::openai(&config.api_key)?)
        }
    }
    
    fn env_var_name() -> &'static str {
        "OPENAI_API_KEY"
    }
    
    fn api_type() -> ApiType {
        ApiType::Native
    }
    
    fn requires_api_key() -> bool {
        true
    }
    
    fn requires_base_url() -> bool {
        false  // 可选
    }
}
