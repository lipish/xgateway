pub mod chat;
mod models;
mod stream;
pub mod types;
pub mod instance;

pub use types::{Model, Response};

use crate::settings::LlmBackendSettings;
use anyhow::Result;
use llm_connector::LlmClient;

/// Unified LLM client that wraps llm-connector for all providers
pub struct Client {
    backend: LlmBackendSettings,
    llm_client: LlmClient,
}

impl Client {
    /// Create a new client with the specified backend configuration
    pub fn new(config: &LlmBackendSettings) -> Result<Self> {
        let llm_client = match config {
            LlmBackendSettings::OpenAI {
                api_key, base_url, region, ..
            } => {
                let url = base_url.as_deref().unwrap_or_else(|| crate::provider::ProviderRegistry::get_default_base_url("openai", region.as_deref()).unwrap_or("https://api.openai.com/v1"));
                LlmClient::openai(api_key, url)?
            }
            LlmBackendSettings::Anthropic { api_key, region, .. } => {
                let url = crate::provider::ProviderRegistry::get_default_base_url("anthropic", region.as_deref()).unwrap_or("https://api.anthropic.com/v1");
                LlmClient::anthropic(api_key, url)?
            }
            LlmBackendSettings::Aliyun { api_key, region, .. } => {
                let url = crate::provider::ProviderRegistry::get_default_base_url("aliyun", region.as_deref()).unwrap_or("https://dashscope.aliyuncs.com/compatible-mode/v1");
                LlmClient::aliyun(api_key, url)?
            },
            LlmBackendSettings::Zhipu { api_key, base_url, region, .. } => {
                let url = base_url.as_deref().unwrap_or_else(|| crate::provider::ProviderRegistry::get_default_base_url("zhipu", region.as_deref()).unwrap_or("https://open.bigmodel.cn/api/paas/v4"));
                LlmClient::zhipu_openai_compatible(api_key, url)?
            }
            LlmBackendSettings::Volcengine { api_key, region, .. } => {
                let url = crate::provider::ProviderRegistry::get_default_base_url("volcengine", region.as_deref()).unwrap_or("https://ark.cn-beijing.volces.com/api/v3");
                LlmClient::volcengine(api_key, url)?
            },
            LlmBackendSettings::Tencent { secret_id, secret_key, region, .. } => {
                let sid = secret_id.as_ref().ok_or_else(|| anyhow::anyhow!("Tencent requires secret_id"))?;
                let skey = secret_key.as_ref().ok_or_else(|| anyhow::anyhow!("Tencent requires secret_key"))?;
                let url = crate::provider::ProviderRegistry::get_default_base_url("tencent", region.as_deref()).unwrap_or("https://hunyuan.tencentcloudapi.com");
                LlmClient::tencent(sid, skey, url)?
            },
            LlmBackendSettings::Longcat { api_key, region, .. } => {
                let url = crate::provider::ProviderRegistry::get_default_base_url("longcat", region.as_deref()).unwrap_or("https://api.longcat.chat/v1");
                LlmClient::openai_compatible(api_key, url, "longcat")?
            }
            LlmBackendSettings::Moonshot { api_key, region, .. } => {
                let url = crate::provider::ProviderRegistry::get_default_base_url("moonshot", region.as_deref()).unwrap_or("https://api.moonshot.cn/v1");
                LlmClient::openai_compatible(api_key, url, "moonshot")?
            }
            LlmBackendSettings::Minimax { api_key, base_url, region, .. } => {
                let url = base_url.as_deref().unwrap_or_else(|| crate::provider::ProviderRegistry::get_default_base_url("minimax", region.as_deref()).unwrap_or("https://api.minimax.io/v1"));
                LlmClient::openai_compatible(api_key, url, "minimax")?
            }
            LlmBackendSettings::DeepSeek { api_key, base_url, region, .. } => {
                let url = base_url.as_deref().unwrap_or_else(|| crate::provider::ProviderRegistry::get_default_base_url("deepseek", region.as_deref()).unwrap_or("https://api.deepseek.com/v1"));
                LlmClient::openai_compatible(api_key, url, "deepseek")?
            }
            LlmBackendSettings::Ollama { base_url, region, .. } => {
                let url = base_url.as_deref().unwrap_or_else(|| crate::provider::ProviderRegistry::get_default_base_url("ollama", region.as_deref()).unwrap_or("http://localhost:11434"));
                LlmClient::ollama(url)?
            }
        };

        Ok(Self {
            backend: config.clone(),
            llm_client,
        })
    }
}