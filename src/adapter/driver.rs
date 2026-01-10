use anyhow::Result;
use llm_connector::LlmClient;

pub use super::types::{DriverType, AuthStrategy};

#[derive(Debug, Clone)]
pub struct DriverConfig {
    pub driver_type: DriverType,
    pub auth: AuthStrategy,
    pub base_url: Option<String>,
    #[allow(dead_code)]
    pub model: String,
    pub provider_name: String,
}

impl DriverConfig {
    pub fn create_client(&self) -> Result<LlmClient> {
        match (&self.driver_type, &self.auth) {
            (DriverType::OpenAI, AuthStrategy::ApiKey { api_key }) => {
                if let Some(base_url) = &self.base_url {
                    Ok(LlmClient::openai_compatible(api_key, base_url, &self.provider_name)?)
                } else {
                    Ok(LlmClient::openai(api_key)?)
                }
            }
            (DriverType::OpenAICompatible, AuthStrategy::ApiKey { api_key }) => {
                let base_url = self.base_url.as_deref().unwrap_or("https://api.openai.com/v1");
                Ok(LlmClient::openai_compatible(api_key, base_url, &self.provider_name)?)
            }
            (DriverType::Anthropic, AuthStrategy::ApiKey { api_key }) => {
                Ok(LlmClient::anthropic(api_key)?)
            }
            (DriverType::Aliyun, AuthStrategy::ApiKey { api_key }) => {
                Ok(LlmClient::aliyun(api_key)?)
            }
            (DriverType::Volcengine, AuthStrategy::ApiKey { api_key }) => {
                Ok(LlmClient::volcengine(api_key)?)
            }
            (DriverType::Tencent, AuthStrategy::AkSk { secret_id, secret_key }) => {
                Ok(LlmClient::tencent(secret_id, secret_key)?)
            }
            (DriverType::Ollama, AuthStrategy::None) => {
                Ok(LlmClient::ollama()?)
            }
            _ => anyhow::bail!("Invalid driver/auth combination for {:?}", self.driver_type),
        }
    }
}

pub async fn detect_driver_type(db_pool: &crate::db::DatabasePool, provider_type: &str) -> DriverType {
    crate::provider::ProviderRegistry::get_provider_info(db_pool, provider_type).await
        .map(|info| info.driver)
        .unwrap_or(DriverType::OpenAICompatible)
}

pub async fn get_default_base_url(db_pool: &crate::db::DatabasePool, provider_type: &str) -> Option<String> {
    crate::provider::ProviderRegistry::get_provider_info(db_pool, provider_type).await
        .and_then(|info| info.default_base_url)
}

pub async fn build_driver_config(
    db_pool: &crate::db::DatabasePool,
    provider_type: &str,
    api_key: Option<&str>,
    secret_id: Option<&str>,
    secret_key: Option<&str>,
    base_url: Option<&str>,
    model: &str,
) -> DriverConfig {
    let driver_type = detect_driver_type(db_pool, provider_type).await;
    
    let auth = match driver_type {
        DriverType::Tencent => {
            AuthStrategy::AkSk {
                secret_id: secret_id.unwrap_or_default().to_string(),
                secret_key: secret_key.unwrap_or_default().to_string(),
            }
        }
        DriverType::Ollama => AuthStrategy::None,
        _ => AuthStrategy::ApiKey {
            api_key: api_key.unwrap_or_default().to_string(),
        },
    };

    let final_base_url = if let Some(url) = base_url {
        Some(url.to_string())
    } else {
        get_default_base_url(db_pool, provider_type).await
    };

    DriverConfig {
        driver_type,
        auth,
        base_url: final_base_url,
        model: model.to_string(),
        provider_name: provider_type.to_string(),
    }
}
#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_detect_driver_type() {
        assert_eq!(crate::provider::ProviderRegistry::get_static_provider_info("openai").unwrap().driver, DriverType::OpenAI);
        assert_eq!(crate::provider::ProviderRegistry::get_static_provider_info("anthropic").unwrap().driver, DriverType::Anthropic);
        assert_eq!(crate::provider::ProviderRegistry::get_static_provider_info("zhipu").unwrap().driver, DriverType::OpenAICompatible);
        assert_eq!(crate::provider::ProviderRegistry::get_static_provider_info("deepseek").unwrap().driver, DriverType::OpenAICompatible);
        assert_eq!(crate::provider::ProviderRegistry::get_static_provider_info("aliyun").unwrap().driver, DriverType::Aliyun);
        assert!(crate::provider::ProviderRegistry::get_static_provider_info("nonexistent").is_none());
    }

    #[tokio::test]
    async fn test_get_default_base_url() {
        assert_eq!(crate::provider::ProviderRegistry::get_static_provider_info("zhipu").unwrap().default_base_url, Some("https://open.bigmodel.cn/api/paas/v4".to_string()));
        assert_eq!(crate::provider::ProviderRegistry::get_static_provider_info("deepseek").unwrap().default_base_url, Some("https://api.deepseek.com/v1".to_string()));
        assert_eq!(crate::provider::ProviderRegistry::get_static_provider_info("aliyun").unwrap().default_base_url, Some("https://dashscope.aliyuncs.com/compatible-mode/v1".to_string()));
    }
}
