use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct UpdateConfigRequest {
    pub provider: String,
    pub api_key: String,
    #[serde(default)]
    pub model: Option<String>,
    #[serde(default)]
    pub base_url: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateKeyRequest {
    pub provider: String,
    pub api_key: String,
    #[serde(default)]
    pub base_url: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct SwitchProviderRequest {
    pub provider: String,
    #[serde(default)]
    pub model: Option<String>,
    #[serde(default)]
    pub api_key: Option<String>,
    #[serde(default)]
    pub base_url: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct CurrentConfigResponse {
    pub provider: String,
    pub model: String,
    pub has_api_key: bool,
    pub has_base_url: bool,
    pub supports_hot_reload: bool,
}
