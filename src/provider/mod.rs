use crate::adapter::types::DriverType;
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
    pub region: Option<String>,
    pub secret_id: Option<String>,
    pub secret_key: Option<String>,
}

impl ProviderConfig {
    #[allow(dead_code)]
    pub fn from_backend_settings(backend: &LlmBackendSettings) -> Self {
        match backend {
            LlmBackendSettings::OpenAI {
                api_key,
                base_url,
                region,
                model,
            } => Self {
                api_key: api_key.clone(),
                model: model.clone(),
                base_url: base_url.clone(),
                region: region.clone(),
                secret_id: None,
                secret_key: None,
            },
            LlmBackendSettings::Anthropic {
                api_key,
                region,
                model,
            } => Self {
                api_key: api_key.clone(),
                model: model.clone(),
                base_url: None,
                region: region.clone(),
                secret_id: None,
                secret_key: None,
            },
            LlmBackendSettings::Zhipu {
                api_key,
                base_url,
                region,
                model,
            } => Self {
                api_key: api_key.clone(),
                model: model.clone(),
                base_url: base_url.clone(),
                region: region.clone(),
                secret_id: None,
                secret_key: None,
            },
            LlmBackendSettings::Ollama {
                base_url,
                region,
                model,
            } => Self {
                api_key: String::new(),
                model: model.clone(),
                base_url: base_url.clone(),
                region: region.clone(),
                secret_id: None,
                secret_key: None,
            },
            LlmBackendSettings::Aliyun {
                api_key,
                region,
                model,
            } => Self {
                api_key: api_key.clone(),
                model: model.clone(),
                base_url: None,
                region: region.clone(),
                secret_id: None,
                secret_key: None,
            },
            LlmBackendSettings::Volcengine {
                api_key,
                region,
                model,
            } => Self {
                api_key: api_key.clone(),
                model: model.clone(),
                base_url: None,
                region: region.clone(),
                secret_id: None,
                secret_key: None,
            },
            LlmBackendSettings::Tencent {
                api_key,
                model,
                region,
                secret_id,
                secret_key,
            } => Self {
                api_key: api_key.clone(),
                model: model.clone(),
                base_url: None,
                region: region.clone(),
                secret_id: secret_id.clone(),
                secret_key: secret_key.clone(),
            },
            LlmBackendSettings::Longcat {
                api_key,
                region,
                model,
            } => Self {
                api_key: api_key.clone(),
                model: model.clone(),
                base_url: None,
                region: region.clone(),
                secret_id: None,
                secret_key: None,
            },
            LlmBackendSettings::Moonshot {
                api_key,
                region,
                model,
            } => Self {
                api_key: api_key.clone(),
                model: model.clone(),
                base_url: None,
                region: region.clone(),
                secret_id: None,
                secret_key: None,
            },
            LlmBackendSettings::Minimax {
                api_key,
                base_url,
                region,
                model,
            } => Self {
                api_key: api_key.clone(),
                model: model.clone(),
                base_url: base_url.clone(),
                region: region.clone(),
                secret_id: None,
                secret_key: None,
            },
            LlmBackendSettings::DeepSeek {
                api_key,
                base_url,
                region,
                model,
            } => Self {
                api_key: api_key.clone(),
                model: model.clone(),
                base_url: base_url.clone(),
                region: region.clone(),
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
    /// Helper to fetch the default base URL from the llm_providers crate
    pub fn get_default_base_url(name: &str, region: Option<&str>) -> Option<&'static str> {
        if let Some(p) = llm_providers::get_providers_data().get(name) {
            // Priority 1: explicitly requested region
            if let Some(desired_region) = region {
                let candidate = p.endpoints.values().find(|ep| ep.region == desired_region);
                if let Some(ep) = candidate {
                    return Some(ep.base_url);
                }
            }

            // Priority 2: fallback default behaviors
            let ep_key = if p.endpoints.contains_key("global") {
                "global"
            } else if p.endpoints.contains_key("cn") {
                "cn"
            } else {
                p.endpoints.keys().next()?
            };
            return p.endpoints.get(ep_key).map(|ep| ep.base_url);
        }
        None
    }

    /// Get static provider information by name (builtin providers)
    pub fn get_static_provider_info(name: &str) -> Option<ProviderInfo> {
        match name {
            "openai" => Some(ProviderInfo {
                name: "openai".to_string(),
                display_name: "OpenAI".to_string(),
                env_var: "OPENAI_API_KEY".to_string(),
                api_type: ApiType::Native,
                driver: DriverType::OpenAI,
                requires_api_key: true,
                requires_base_url: false,
                default_base_url: Self::get_default_base_url("openai", None).map(|s| s.to_string()),
                docs_url: "https://platform.openai.com/docs/models".to_string(),
            }),
            "anthropic" => Some(ProviderInfo {
                name: "anthropic".to_string(),
                display_name: "Anthropic".to_string(),
                env_var: "ANTHROPIC_API_KEY".to_string(),
                api_type: ApiType::Native,
                driver: DriverType::Anthropic,
                requires_api_key: true,
                requires_base_url: false,
                default_base_url: Self::get_default_base_url("anthropic", None)
                    .map(|s| s.to_string()),
                docs_url: "https://docs.anthropic.com/en/docs/about-claude/models".to_string(),
            }),
            "zhipu" => Some(ProviderInfo {
                name: "zhipu".to_string(),
                display_name: "智谱 AI (Zhipu)".to_string(),
                env_var: "ZHIPU_API_KEY".to_string(),
                api_type: ApiType::OpenAICompatible,
                driver: DriverType::OpenAICompatible,
                requires_api_key: true,
                requires_base_url: true,
                default_base_url: Self::get_default_base_url("zhipu", None)
                    .map(|s| s.to_string())
                    .or_else(|| Some("https://open.bigmodel.cn/api/paas/v4".to_string())),
                docs_url: "https://open.bigmodel.cn/dev/howuse/model".to_string(),
            }),
            "ollama" => Some(ProviderInfo {
                name: "ollama".to_string(),
                display_name: "Ollama".to_string(),
                env_var: "".to_string(),
                api_type: ApiType::Native,
                driver: DriverType::Ollama,
                requires_api_key: false,
                requires_base_url: false,
                default_base_url: None,
                docs_url: "https://ollama.com/library".to_string(),
            }),
            "aliyun" => Some(ProviderInfo {
                name: "aliyun".to_string(),
                display_name: "阿里云 (Aliyun DashScope)".to_string(),
                env_var: "ALIYUN_API_KEY".to_string(),
                api_type: ApiType::Native,
                driver: DriverType::Aliyun,
                requires_api_key: true,
                requires_base_url: false,
                default_base_url: Self::get_default_base_url("aliyun", None)
                    .map(|s| s.to_string())
                    .or_else(|| {
                        Some("https://dashscope.aliyuncs.com/compatible-mode/v1".to_string())
                    }),
                docs_url:
                    "https://help.aliyun.com/zh/dashscope/developer-reference/model-introduction"
                        .to_string(),
            }),
            "volcengine" => Some(ProviderInfo {
                name: "volcengine".to_string(),
                display_name: "火山引擎 (Volcengine Ark)".to_string(),
                env_var: "VOLCENGINE_API_KEY".to_string(),
                api_type: ApiType::Native,
                driver: DriverType::Volcengine,
                requires_api_key: true,
                requires_base_url: false,
                default_base_url: Self::get_default_base_url("volcengine", None)
                    .map(|s| s.to_string())
                    .or_else(|| Some("https://ark.cn-beijing.volces.com/api/v3".to_string())),
                docs_url: "https://www.volcengine.com/docs/82379/1099475".to_string(),
            }),
            "tencent" => Some(ProviderInfo {
                name: "tencent".to_string(),
                display_name: "腾讯混元 (Tencent Hunyuan)".to_string(),
                env_var: "TENCENT_API_KEY".to_string(),
                api_type: ApiType::Native,
                driver: DriverType::Tencent,
                requires_api_key: true,
                requires_base_url: false,
                default_base_url: Self::get_default_base_url("tencent", None)
                    .map(|s| s.to_string()),
                docs_url: "https://cloud.tencent.com/document/product/1729/104753".to_string(),
            }),
            "longcat" => Some(ProviderInfo {
                name: "longcat".to_string(),
                display_name: "龙猫 (Longcat)".to_string(),
                env_var: "LONGCAT_API_KEY".to_string(),
                api_type: ApiType::OpenAICompatible,
                driver: DriverType::OpenAICompatible,
                requires_api_key: true,
                requires_base_url: false,
                default_base_url: Self::get_default_base_url("longcat", None)
                    .map(|s| s.to_string())
                    .or_else(|| Some("https://api.longcat.chat/v1".to_string())),
                docs_url: "https://api.longcat.chat/docs".to_string(),
            }),
            "moonshot" => Some(ProviderInfo {
                name: "moonshot".to_string(),
                display_name: "月之暗面 (Moonshot AI)".to_string(),
                env_var: "MOONSHOT_API_KEY".to_string(),
                api_type: ApiType::OpenAICompatible,
                driver: DriverType::OpenAICompatible,
                requires_api_key: true,
                requires_base_url: false,
                default_base_url: Self::get_default_base_url("moonshot", None)
                    .map(|s| s.to_string())
                    .or_else(|| Some("https://api.moonshot.cn/v1".to_string())),
                docs_url: "https://platform.moonshot.cn/docs/guide/model-list".to_string(),
            }),
            "minimax" => Some(ProviderInfo {
                name: "minimax".to_string(),
                display_name: "MiniMax".to_string(),
                env_var: "MINIMAX_API_KEY".to_string(),
                api_type: ApiType::OpenAICompatible,
                driver: DriverType::OpenAICompatible,
                requires_api_key: true,
                requires_base_url: false,
                default_base_url: Self::get_default_base_url("minimax", None)
                    .map(|s| s.to_string())
                    .or_else(|| Some("https://api.minimax.io/v1".to_string())),
                docs_url: "https://platform.minimaxi.com/document/models".to_string(),
            }),
            "deepseek" => Some(ProviderInfo {
                name: "deepseek".to_string(),
                display_name: "DeepSeek".to_string(),
                env_var: "DEEPSEEK_API_KEY".to_string(),
                api_type: ApiType::OpenAICompatible,
                driver: DriverType::OpenAICompatible,
                requires_api_key: true,
                requires_base_url: false,
                default_base_url: Self::get_default_base_url("deepseek", None)
                    .map(|s| s.to_string())
                    .or_else(|| Some("https://api.deepseek.com/v1".to_string())),
                docs_url: "https://api-docs.deepseek.com/zh-cn/information/model_list".to_string(),
            }),
            _ => None,
        }
    }

    /// Get provider information by name, checking both static list and database
    pub async fn get_provider_info(
        db_pool: &crate::db::DatabasePool,
        name: &str,
    ) -> Option<ProviderInfo> {
        // Try static providers first
        if let Some(info) = Self::get_static_provider_info(name) {
            return Some(info);
        }

        // Try database provider types
        match db_pool.get_provider_type(name).await {
            Ok(Some(pt)) => {
                // Parse driver type string to enum
                let driver = serde_json::from_str::<DriverType>(&format!("\"{}\"", pt.driver_type))
                    .unwrap_or(DriverType::OpenAICompatible);
                Some(ProviderInfo {
                    name: pt.id,
                    display_name: pt.label,
                    env_var: String::new(),
                    api_type: ApiType::OpenAICompatible,
                    driver,
                    requires_api_key: true,
                    requires_base_url: !pt.base_url.is_empty(),
                    default_base_url: if pt.base_url.is_empty() {
                        None
                    } else {
                        Some(pt.base_url)
                    },
                    docs_url: pt.docs_url,
                })
            }
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
            "deepseek",
        ]
    }
}

/// Provider information
#[allow(dead_code)]
#[derive(Debug, Clone)]
pub struct ProviderInfo {
    pub name: String,
    pub display_name: String,
    pub env_var: String,
    pub api_type: ApiType,
    pub driver: DriverType,
    pub requires_api_key: bool,
    pub requires_base_url: bool,
    pub default_base_url: Option<String>,
    pub docs_url: String,
}

// Create implementation modules for each provider
pub mod aliyun;
pub mod anthropic;
pub mod longcat;
pub mod minimax;
pub mod moonshot;
pub mod ollama;
pub mod openai;
pub mod tencent;
pub mod volcengine;
pub mod zhipu;
