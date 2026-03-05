use super::{ApiType, Provider, ProviderConfig};
use anyhow::Result;
use llm_connector::LlmClient;

/// Tencent Provider implementation
#[allow(dead_code)]
pub struct TencentProvider;

impl Provider for TencentProvider {
    fn name() -> &'static str {
        "tencent"
    }
    
    fn create_client(config: &ProviderConfig) -> Result<LlmClient> {
        let secret_id = config.secret_id.as_ref()
            .ok_or_else(|| anyhow::anyhow!("Tencent provider requires secret_id"))?;
        let secret_key = config.secret_key.as_ref()
            .ok_or_else(|| anyhow::anyhow!("Tencent provider requires secret_key"))?;
        let base_url = config.base_url.as_deref().unwrap_or_else(|| super::ProviderRegistry::get_default_base_url("tencent", config.region.as_deref()).unwrap_or("https://hunyuan.tencentcloudapi.com"));
        Ok(LlmClient::tencent(secret_id, secret_key, base_url)?)
    }
    
    fn env_var_name() -> &'static str {
        "TENCENT_SECRET_ID"
    }
    
    fn api_type() -> ApiType {
        ApiType::Native
    }
    
    fn requires_api_key() -> bool {
        true
    }
}