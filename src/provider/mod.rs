use crate::settings::LlmBackendSettings;
use anyhow::Result;
use llm_connector::LlmClient;

/// API Type
#[allow(dead_code)]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ApiType {
    /// OpenAI compatible API
    OpenAICompatible,
    /// Provider native API
    Native,
}

/// Provider configuration
#[allow(dead_code)]
#[derive(Debug, Clone)]
pub struct ProviderConfig {
    pub api_key: String,
    pub model: String,
    pub base_url: Option<String>,
    pub secret_id: Option<String>,
    pub secret_key: Option<String>,
}

impl ProviderConfig {
    #[allow(dead_code)]
    pub fn from_backend_settings(backend: &LlmBackendSettings) -> Self {
        match backend {
            LlmBackendSettings::OpenAI { api_key, base_url, model } => Self {
                api_key: api_key.clone(),
                model: model.clone(),
                base_url: base_url.clone(),
                secret_id: None,
                secret_key: None,
            },
            LlmBackendSettings::Anthropic { api_key, model } => Self {
                api_key: api_key.clone(),
                model: model.clone(),
                base_url: None,
                secret_id: None,
                secret_key: None,
            },
            LlmBackendSettings::Zhipu { api_key, base_url, model } => Self {
                api_key: api_key.clone(),
                model: model.clone(),
                base_url: base_url.clone(),
                secret_id: None,
                secret_key: None,
            },
            LlmBackendSettings::Ollama { base_url, model } => Self {
                api_key: String::new(),
                model: model.clone(),
                base_url: base_url.clone(),
                secret_id: None,
                secret_key: None,
            },
            LlmBackendSettings::Aliyun { api_key, model } => Self {
                api_key: api_key.clone(),
                model: model.clone(),
                base_url: None,
                secret_id: None,
                secret_key: None,
            },
            LlmBackendSettings::Volcengine { api_key, model } => Self {
                api_key: api_key.clone(),
                model: model.clone(),
                base_url: None,
                secret_id: None,
                secret_key: None,
            },
            LlmBackendSettings::Tencent { api_key, model, secret_id, secret_key } => Self {
                api_key: api_key.clone(),
                model: model.clone(),
                base_url: None,
                secret_id: secret_id.clone(),
                secret_key: secret_key.clone(),
            },
            LlmBackendSettings::Longcat { api_key, model } => Self {
                api_key: api_key.clone(),
                model: model.clone(),
                base_url: None,
                secret_id: None,
                secret_key: None,
            },
            LlmBackendSettings::Moonshot { api_key, model } => Self {
                api_key: api_key.clone(),
                model: model.clone(),
                base_url: None,
                secret_id: None,
                secret_key: None,
            },
            LlmBackendSettings::Minimax { api_key, model } => Self {
                api_key: api_key.clone(),
                model: model.clone(),
                base_url: None,
                secret_id: None,
                secret_key: None,
            },
        }
    }
}

/// Provider Trait
/// 
/// All LLM providers must implement this trait
#[allow(dead_code)]
pub trait Provider: Send + Sync {
    /// Provider name (e.g., "minimax", "openai")
    fn name() -> &'static str;
    
    /// Create LLM client
    fn create_client(config: &ProviderConfig) -> Result<LlmClient>;
    
    /// Default model name
    fn default_model() -> &'static str;
    
    /// Environment variable name (for reading API Key)
    fn env_var_name() -> &'static str;
    
    /// API type
    fn api_type() -> ApiType;
    
    /// Whether base_url is required
    fn requires_base_url() -> bool {
        false
    }
    
    /// Default base_url (if required)
    fn default_base_url() -> Option<&'static str> {
        None
    }
    
    /// Whether API Key is required
    fn requires_api_key() -> bool {
        true
    }
    
    /// Create ProviderConfig from LlmBackendSettings
    fn config_from_backend(_backend: &LlmBackendSettings) -> Option<ProviderConfig> {
        None
    }
}

/// Provider registry
/// 
/// Stores all registered providers
#[allow(dead_code)]
pub struct ProviderRegistry;

impl ProviderRegistry {
    /// Get provider information by name
    #[allow(dead_code)]
    pub fn get_provider_info(name: &str) -> Option<ProviderInfo> {
        match name {
            "openai" => Some(ProviderInfo {
                name: "openai",
                default_model: "gpt-4",
                env_var: "OPENAI_API_KEY",
                api_type: ApiType::Native,
                requires_api_key: true,
                requires_base_url: false,
            }),
            "anthropic" => Some(ProviderInfo {
                name: "anthropic",
                default_model: "claude-3-5-sonnet-20241022",
                env_var: "ANTHROPIC_API_KEY",
                api_type: ApiType::Native,
                requires_api_key: true,
                requires_base_url: false,
            }),
            "zhipu" => Some(ProviderInfo {
                name: "zhipu",
                default_model: "glm-4-flash",
                env_var: "ZHIPU_API_KEY",
                api_type: ApiType::OpenAICompatible,
                requires_api_key: true,
                requires_base_url: true,
            }),
            "ollama" => Some(ProviderInfo {
                name: "ollama",
                default_model: "llama2",
                env_var: "",
                api_type: ApiType::Native,
                requires_api_key: false,
                requires_base_url: false,
            }),
            "aliyun" => Some(ProviderInfo {
                name: "aliyun",
                default_model: "qwen-max",
                env_var: "ALIYUN_API_KEY",
                api_type: ApiType::Native,
                requires_api_key: true,
                requires_base_url: false,
            }),
            "volcengine" => Some(ProviderInfo {
                name: "volcengine",
                default_model: "doubao-pro-32k",
                env_var: "VOLCENGINE_API_KEY",
                api_type: ApiType::Native,
                requires_api_key: true,
                requires_base_url: false,
            }),
            "tencent" => Some(ProviderInfo {
                name: "tencent",
                default_model: "hunyuan-lite",
                env_var: "TENCENT_API_KEY",
                api_type: ApiType::Native,
                requires_api_key: true,
                requires_base_url: false,
            }),
            "longcat" => Some(ProviderInfo {
                name: "longcat",
                default_model: "LongCat-Flash-Chat",
                env_var: "LONGCAT_API_KEY",
                api_type: ApiType::OpenAICompatible,
                requires_api_key: true,
                requires_base_url: false,
            }),
            "moonshot" => Some(ProviderInfo {
                name: "moonshot",
                default_model: "kimi-k2-turbo-preview",
                env_var: "MOONSHOT_API_KEY",
                api_type: ApiType::OpenAICompatible,
                requires_api_key: true,
                requires_base_url: false,
            }),
            "minimax" => Some(ProviderInfo {
                name: "minimax",
                default_model: "MiniMax-M2",
                env_var: "MINIMAX_API_KEY",
                api_type: ApiType::OpenAICompatible,
                requires_api_key: true,
                requires_base_url: false,
            }),
            _ => None,
        }
    }
    
    /// List all registered provider names
    #[allow(dead_code)]
    pub fn list_providers() -> Vec<&'static str> {
        vec![
            "openai",
            "anthropic",
            "zhipu",
            "ollama",
            "aliyun",
            "volcengine",
            "tencent",
            "longcat",
            "moonshot",
            "minimax",
        ]
    }
}

/// Provider information
#[allow(dead_code)]
#[derive(Debug, Clone)]
pub struct ProviderInfo {
    pub name: &'static str,
    pub default_model: &'static str,
    pub env_var: &'static str,
    pub api_type: ApiType,
    pub requires_api_key: bool,
    pub requires_base_url: bool,
}

// Create implementation modules for each provider
pub mod minimax;
pub mod openai;
pub mod anthropic;
pub mod ollama;
pub mod zhipu;
pub mod aliyun;
pub mod volcengine;
pub mod tencent;
pub mod longcat;
pub mod moonshot;