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
        let base_url = config.base_url.as_deref().unwrap_or_else(|| {
            super::ProviderRegistry::get_default_base_url("openai", config.region.as_deref())
                .unwrap_or("https://api.openai.com/v1")
        });
        Ok(LlmClient::openai(&config.api_key, base_url)?)
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
        false // 可选
    }
}
