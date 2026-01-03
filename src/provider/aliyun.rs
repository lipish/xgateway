use super::{ApiType, Provider, ProviderConfig};
use anyhow::Result;
use llm_connector::LlmClient;

/// Aliyun Provider implementation
#[allow(dead_code)]
pub struct AliyunProvider;

impl Provider for AliyunProvider {
    fn name() -> &'static str {
        "aliyun"
    }
    
    fn create_client(config: &ProviderConfig) -> Result<LlmClient> {
        Ok(LlmClient::aliyun(&config.api_key)?)
    }
    
    fn default_model() -> &'static str {
        "qwen-max"
    }
    
    fn env_var_name() -> &'static str {
        "ALIYUN_API_KEY"
    }
    
    fn api_type() -> ApiType {
        ApiType::Native
    }
    
    fn requires_api_key() -> bool {
        true
    }

    fn default_base_url() -> Option<&'static str> {
        Some("https://dashscope.aliyuncs.com/compatible-mode/v1")
    }
}

