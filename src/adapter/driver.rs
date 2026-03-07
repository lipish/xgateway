use anyhow::Result;
use llm_connector::LlmClient;
use once_cell::sync::Lazy;
use std::collections::HashMap;
use std::sync::RwLock;

pub use super::types::{AuthStrategy, DriverType};

#[derive(Debug, Clone)]
pub struct DriverConfig {
    pub driver_type: DriverType,
    pub auth: AuthStrategy,
    pub base_url: Option<String>,
    pub region: Option<String>,
    #[allow(dead_code)]
    pub model: String,
    pub provider_name: String,
}

static CLIENT_CACHE: Lazy<RwLock<HashMap<String, LlmClient>>> =
    Lazy::new(|| RwLock::new(HashMap::new()));

impl DriverConfig {
    fn cache_key(&self) -> String {
        let region = self.region.as_deref().unwrap_or("");
        match &self.auth {
            AuthStrategy::ApiKey { .. } => {
                format!(
                    "{:?}:{}:{}:{}",
                    self.driver_type,
                    self.provider_name,
                    self.base_url.as_deref().unwrap_or(""),
                    region,
                )
            }
            AuthStrategy::AkSk {
                secret_id,
                secret_key,
            } => {
                format!(
                    "{:?}:{}:{}:{}:{}:{}",
                    self.driver_type,
                    self.provider_name,
                    self.base_url.as_deref().unwrap_or(""),
                    region,
                    secret_id,
                    secret_key
                )
            }
            AuthStrategy::None => {
                format!(
                    "{:?}:{}:{}:{}",
                    self.driver_type,
                    self.provider_name,
                    self.base_url.as_deref().unwrap_or(""),
                    region,
                )
            }
        }
    }

    fn create_template_client(&self) -> Result<LlmClient> {
        match (&self.driver_type, &self.auth) {
            (DriverType::OpenAI, AuthStrategy::ApiKey { api_key }) => {
                let base_url = self
                    .base_url
                    .as_deref()
                    .unwrap_or("https://api.openai.com/v1");
                Ok(LlmClient::openai(api_key, base_url)?)
            }
            (DriverType::OpenAICompatible, AuthStrategy::ApiKey { api_key }) => {
                let base_url = self
                    .base_url
                    .as_deref()
                    .unwrap_or("https://api.openai.com/v1");
                Ok(LlmClient::openai_compatible(
                    api_key,
                    base_url,
                    &self.provider_name,
                )?)
            }
            (DriverType::Xinference, AuthStrategy::ApiKey { api_key }) => {
                let base_url = self
                    .base_url
                    .as_deref()
                    .unwrap_or("http://localhost:9997/v1");
                Ok(LlmClient::openai_compatible(
                    api_key,
                    base_url,
                    "xinference",
                )?)
            }
            (DriverType::Anthropic, AuthStrategy::ApiKey { api_key }) => {
                let base_url = self
                    .base_url
                    .as_deref()
                    .unwrap_or("https://api.anthropic.com/v1");
                Ok(LlmClient::anthropic(api_key, base_url)?)
            }
            (DriverType::Aliyun, AuthStrategy::ApiKey { api_key }) => {
                let base_url = self
                    .base_url
                    .as_deref()
                    .unwrap_or("https://dashscope.aliyuncs.com/compatible-mode/v1");
                Ok(LlmClient::aliyun(api_key, base_url)?)
            }
            (DriverType::Volcengine, AuthStrategy::ApiKey { api_key }) => {
                let base_url = self
                    .base_url
                    .as_deref()
                    .unwrap_or("https://ark.cn-beijing.volces.com/api/v3");
                Ok(LlmClient::volcengine(api_key, base_url)?)
            }
            (
                DriverType::Tencent,
                AuthStrategy::AkSk {
                    secret_id,
                    secret_key,
                },
            ) => {
                let base_url = self
                    .base_url
                    .as_deref()
                    .unwrap_or("https://hunyuan.tencentcloudapi.com");
                Ok(LlmClient::tencent(secret_id, secret_key, base_url)?)
            }
            (DriverType::Ollama, AuthStrategy::None) => {
                let base_url = self.base_url.as_deref().unwrap_or("http://localhost:11434");
                Ok(LlmClient::ollama(base_url)?)
            }
            _ => anyhow::bail!("Invalid driver/auth combination for {:?}", self.driver_type),
        }
    }

    pub fn create_client(&self) -> Result<LlmClient> {
        let cache_key = self.cache_key();

        if let Ok(cache) = CLIENT_CACHE.read() {
            if let Some(client) = cache.get(&cache_key) {
                return Ok(client.clone());
            }
        }

        let client = self.create_template_client()?;

        if let Ok(mut cache) = CLIENT_CACHE.write() {
            cache.insert(cache_key, client.clone());
        }

        Ok(client)
    }

    pub fn request_base_url(&self) -> Option<&str> {
        self.base_url.as_deref().filter(|u| !u.is_empty())
    }

    pub fn apply_request_overrides(
        &self,
        request: llm_connector::types::ChatRequest,
    ) -> llm_connector::types::ChatRequest {
        // Authentication headers are already configured on the cached LlmClient.
        // Re-applying with_api_key here can append a second Authorization header,
        // which some OpenAI-compatible gateways reject with HTTP 400.
        let request = request;

        if let Some(base_url) = self.request_base_url() {
            request.with_base_url(base_url.to_string())
        } else {
            request
        }
    }
}

pub async fn detect_driver_type(
    db_pool: &crate::db::DatabasePool,
    provider_type: &str,
) -> DriverType {
    crate::provider::ProviderRegistry::get_provider_info(db_pool, provider_type)
        .await
        .map(|info| info.driver)
        .unwrap_or(DriverType::OpenAICompatible)
}

pub async fn get_default_base_url(
    db_pool: &crate::db::DatabasePool,
    provider_type: &str,
    region: Option<&str>,
) -> Option<String> {
    // Check if the explicitly requested region has a matching endpoint base url from llm_providers
    if let Some(r) = region {
        if let Some(url) =
            crate::provider::ProviderRegistry::get_default_base_url(provider_type, Some(r))
        {
            return Some(url.to_string());
        }
    }

    crate::provider::ProviderRegistry::get_provider_info(db_pool, provider_type)
        .await
        .and_then(|info| info.default_base_url)
}

pub async fn build_driver_config(
    db_pool: &crate::db::DatabasePool,
    provider_type: &str,
    api_key: Option<&str>,
    secret_id: Option<&str>,
    secret_key: Option<&str>,
    base_url: Option<&str>,
    region: Option<&str>,
    model: &str,
) -> DriverConfig {
    let driver_type = detect_driver_type(db_pool, provider_type).await;

    let auth = match driver_type {
        DriverType::Tencent => AuthStrategy::AkSk {
            secret_id: secret_id.unwrap_or_default().to_string(),
            secret_key: secret_key.unwrap_or_default().to_string(),
        },
        DriverType::Ollama => AuthStrategy::None,
        _ => AuthStrategy::ApiKey {
            api_key: api_key.unwrap_or_default().to_string(),
        },
    };

    let final_base_url = if let Some(url) = base_url {
        Some(url.to_string())
    } else {
        get_default_base_url(db_pool, provider_type, region).await
    };

    DriverConfig {
        driver_type,
        auth,
        base_url: final_base_url,
        region: region.map(|s| s.to_string()),
        model: model.to_string(),
        provider_name: provider_type.to_string(),
    }
}
#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_detect_driver_type() {
        assert_eq!(
            crate::provider::ProviderRegistry::get_static_provider_info("openai")
                .unwrap()
                .driver,
            DriverType::OpenAI
        );
        assert_eq!(
            crate::provider::ProviderRegistry::get_static_provider_info("anthropic")
                .unwrap()
                .driver,
            DriverType::Anthropic
        );
        assert_eq!(
            crate::provider::ProviderRegistry::get_static_provider_info("zhipu")
                .unwrap()
                .driver,
            DriverType::OpenAICompatible
        );
        assert_eq!(
            crate::provider::ProviderRegistry::get_static_provider_info("deepseek")
                .unwrap()
                .driver,
            DriverType::OpenAICompatible
        );
        assert_eq!(
            crate::provider::ProviderRegistry::get_static_provider_info("aliyun")
                .unwrap()
                .driver,
            DriverType::Aliyun
        );
        assert!(
            crate::provider::ProviderRegistry::get_static_provider_info("nonexistent").is_none()
        );
    }

    #[tokio::test]
    async fn test_get_default_base_url() {
        assert!(
            crate::provider::ProviderRegistry::get_static_provider_info("zhipu")
                .unwrap()
                .default_base_url
                .is_some()
        );
        assert!(
            crate::provider::ProviderRegistry::get_static_provider_info("deepseek")
                .unwrap()
                .default_base_url
                .is_some()
        );
        assert!(
            crate::provider::ProviderRegistry::get_static_provider_info("aliyun")
                .unwrap()
                .default_base_url
                .is_some()
        );
    }
}
