use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    pub server: ServerSettings,
    pub llm_backend: LlmBackendSettings,
    pub apis: ApiSettings,
    pub client_adapters: Option<ClientAdapterSettings>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerSettings {
    pub host: String,
    pub port: u16,
    pub log_level: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum LlmBackendSettings {
    OpenAI {
        api_key: String,
        base_url: Option<String>,
        region: Option<String>,
        model: String,
    },
    Anthropic {
        api_key: String,
        region: Option<String>,
        model: String,
    },
    Ollama {
        base_url: Option<String>,
        region: Option<String>,
        model: String,
    },
    Zhipu {
        api_key: String,
        base_url: Option<String>,
        region: Option<String>,
        model: String,
    },
    Aliyun {
        api_key: String,
        region: Option<String>,
        model: String,
    },
    Volcengine {
        api_key: String,
        region: Option<String>,
        model: String,
    },
    Tencent {
        api_key: String,
        model: String,
        region: Option<String>,
        secret_id: Option<String>,
        secret_key: Option<String>,
    },
    Longcat {
        api_key: String,
        region: Option<String>,
        model: String,
    },
    Moonshot {
        api_key: String,
        region: Option<String>,
        model: String,
    },
    Minimax {
        api_key: String,
        base_url: Option<String>,
        region: Option<String>,
        model: String,
    },
    DeepSeek {
        api_key: String,
        base_url: Option<String>,
        region: Option<String>,
        model: String,
    },
}

impl LlmBackendSettings {
    /// Get the currently configured model name
    #[allow(dead_code)]
    pub fn get_model(&self) -> String {
        match self {
            LlmBackendSettings::OpenAI { model, .. } => model.clone(),
            LlmBackendSettings::Anthropic { model, .. } => model.clone(),
            LlmBackendSettings::Ollama { model, .. } => model.clone(),
            LlmBackendSettings::Zhipu { model, .. } => model.clone(),
            LlmBackendSettings::Aliyun { model, .. } => model.clone(),
            LlmBackendSettings::Volcengine { model, .. } => model.clone(),
            LlmBackendSettings::Tencent { model, .. } => model.clone(),
            LlmBackendSettings::Longcat { model, .. } => model.clone(),
            LlmBackendSettings::Moonshot { model, .. } => model.clone(),
            LlmBackendSettings::Minimax { model, .. } => model.clone(),
            LlmBackendSettings::DeepSeek { model, .. } => model.clone(),
        }
    }

    /// Get the currently configured region name
    #[allow(dead_code)]
    pub fn get_region(&self) -> Option<String> {
        match self {
            LlmBackendSettings::OpenAI { region, .. } => region.clone(),
            LlmBackendSettings::Anthropic { region, .. } => region.clone(),
            LlmBackendSettings::Ollama { region, .. } => region.clone(),
            LlmBackendSettings::Zhipu { region, .. } => region.clone(),
            LlmBackendSettings::Aliyun { region, .. } => region.clone(),
            LlmBackendSettings::Volcengine { region, .. } => region.clone(),
            LlmBackendSettings::Tencent { region, .. } => region.clone(),
            LlmBackendSettings::Longcat { region, .. } => region.clone(),
            LlmBackendSettings::Moonshot { region, .. } => region.clone(),
            LlmBackendSettings::Minimax { region, .. } => region.clone(),
            LlmBackendSettings::DeepSeek { region, .. } => region.clone(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiSettings {
    pub ollama: Option<OllamaApiSettings>,
    pub openai: Option<OpenAiApiSettings>,
    pub anthropic: Option<AnthropicApiSettings>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClientAdapterSettings {
    /// Default client adapter mode
    pub default_adapter: Option<String>,
    /// Force client adapter mode (ignore auto-detection)
    pub force_adapter: Option<String>,
    /// Zed.dev specific configuration
    pub zed: Option<ZedAdapterSettings>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ZedAdapterSettings {
    /// Whether to enable Zed.dev adapter
    pub enabled: bool,
    /// Whether to force add images field
    pub force_images_field: Option<bool>,
    /// Preferred response format
    pub preferred_format: Option<String>,
}



#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OllamaApiSettings {
    pub enabled: bool,
    pub path: String,
    pub api_key_header: Option<String>,
    pub api_key: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OpenAiApiSettings {
    pub enabled: bool,
    pub path: String,
    pub api_key_header: Option<String>,
    pub api_key: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnthropicApiSettings {
    pub enabled: bool,
    pub path: String,
    pub api_key_header: Option<String>,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            server: ServerSettings {
                host: "127.0.0.1".to_string(),
                port: 8080,
                log_level: "info".to_string(),
            },
            llm_backend: LlmBackendSettings::Ollama {
                base_url: Some("http://localhost:11434".to_string()),
                region: None,
                model: "llama2".to_string(),
            },
            apis: ApiSettings {
                ollama: Some(OllamaApiSettings {
                    enabled: true,
                    path: "/ollama".to_string(),
                    api_key_header: None,
                    api_key: None,
                }),
                openai: Some(OpenAiApiSettings {
                    enabled: true,
                    path: "/v1".to_string(),
                    api_key_header: None,
                    api_key: None,
                }),
                anthropic: Some(AnthropicApiSettings {
                    enabled: true,
                    path: "/anthropic".to_string(),
                    api_key_header: None,
                }),
            },
            client_adapters: None,
        }
    }
}

impl Settings {
    // Settings are now generated by AppConfigGenerator only
    // No file-based configuration loading needed
}