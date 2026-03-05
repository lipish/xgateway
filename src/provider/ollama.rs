use super::{ApiType, Provider, ProviderConfig};
use anyhow::Result;
use llm_connector::LlmClient;

/// Ollama Provider implementation
#[allow(dead_code)]
pub struct OllamaProvider;

impl Provider for OllamaProvider {
    fn name() -> &'static str {
        "ollama"
    }
    
    fn create_client(config: &ProviderConfig) -> Result<LlmClient> {
        let base_url = config.base_url.as_deref().unwrap_or_else(|| super::ProviderRegistry::get_default_base_url("ollama", config.region.as_deref()).unwrap_or("http://localhost:11434"));
        Ok(LlmClient::ollama(base_url)?)
    }
    
    fn env_var_name() -> &'static str {
        ""  // Ollama doesn't require API key
    }
    
    fn api_type() -> ApiType {
        ApiType::Native
    }
    
    fn requires_api_key() -> bool {
        false
    }
}
