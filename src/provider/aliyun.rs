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
        let base_url = config.base_url.as_deref().unwrap_or_else(|| {
            super::ProviderRegistry::get_default_base_url("aliyun", config.region.as_deref())
                .unwrap_or("https://dashscope.aliyuncs.com/compatible-mode/v1")
        });
        Ok(LlmClient::aliyun(&config.api_key, base_url)?)
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
