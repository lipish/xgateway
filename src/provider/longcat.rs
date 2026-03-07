use super::{ApiType, Provider, ProviderConfig};
use anyhow::Result;
use llm_connector::LlmClient;

/// Longcat Provider implementation
#[allow(dead_code)]
pub struct LongcatProvider;

impl Provider for LongcatProvider {
    fn name() -> &'static str {
        "longcat"
    }

    fn create_client(config: &ProviderConfig) -> Result<LlmClient> {
        let base_url = config.base_url.as_deref().unwrap_or_else(|| {
            super::ProviderRegistry::get_default_base_url("longcat", config.region.as_deref())
                .unwrap_or("https://api.longcat.chat/v1")
        });
        Ok(LlmClient::openai_compatible(
            &config.api_key,
            base_url,
            Self::name(),
        )?)
    }

    fn env_var_name() -> &'static str {
        "LONGCAT_API_KEY"
    }

    fn api_type() -> ApiType {
        ApiType::OpenAICompatible
    }

    fn requires_api_key() -> bool {
        true
    }

    fn requires_base_url() -> bool {
        false
    }

    fn default_base_url() -> Option<&'static str> {
        Some("https://api.longcat.chat/openai")
    }
}
