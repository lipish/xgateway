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
    
    fn create_client(_config: &ProviderConfig) -> Result<LlmClient> {
        // Ollama doesn't use API key
        Ok(LlmClient::ollama()?)
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
