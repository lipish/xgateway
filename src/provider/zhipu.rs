use super::{ApiType, Provider, ProviderConfig};
use anyhow::Result;
use llm_connector::LlmClient;

/// Zhipu Provider implementation
#[allow(dead_code)]
pub struct ZhipuProvider;

impl Provider for ZhipuProvider {
    fn name() -> &'static str {
        "zhipu"
    }

    fn create_client(config: &ProviderConfig) -> Result<LlmClient> {
        let base_url = config.base_url.as_deref().unwrap_or_else(|| {
            super::ProviderRegistry::get_default_base_url("zhipu", config.region.as_deref())
                .unwrap_or("https://open.bigmodel.cn/api/paas/v4")
        });
        Ok(LlmClient::zhipu_openai_compatible(
            &config.api_key,
            base_url,
        )?)
    }

    fn env_var_name() -> &'static str {
        "ZHIPU_API_KEY"
    }

    fn api_type() -> ApiType {
        ApiType::OpenAICompatible
    }

    fn requires_api_key() -> bool {
        true
    }

    fn requires_base_url() -> bool {
        true
    }

    fn default_base_url() -> Option<&'static str> {
        Some("https://open.bigmodel.cn/api/paas/v4")
    }
}
