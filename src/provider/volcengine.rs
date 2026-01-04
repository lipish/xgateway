use super::{ApiType, Provider, ProviderConfig};
use anyhow::Result;
use llm_connector::LlmClient;

/// Volcengine Provider implementation
#[allow(dead_code)]
pub struct VolcengineProvider;

impl Provider for VolcengineProvider {
    fn name() -> &'static str {
        "volcengine"
    }
    
    fn create_client(config: &ProviderConfig) -> Result<LlmClient> {
        Ok(LlmClient::volcengine(&config.api_key)?)
    }
    
    fn env_var_name() -> &'static str {
        "VOLCENGINE_API_KEY"
    }
    
    fn api_type() -> ApiType {
        ApiType::Native
    }
    
    fn requires_api_key() -> bool {
        true
    }
    
    fn default_base_url() -> Option<&'static str> {
        Some("https://ark.cn-beijing.volces.com/api/v3")
    }
}
