use crate::settings::{
    Settings, ServerSettings, LlmBackendSettings, ApiSettings,
    OpenAiApiSettings, OllamaApiSettings, AnthropicApiSettings,
    ClientAdapterSettings, ZedAdapterSettings,
};

/// OpenHands application configuration
#[allow(dead_code)]
pub struct OpenHandsApp;

impl OpenHandsApp {
    /// Generate OpenHands configuration
    #[allow(dead_code)]
    pub fn generate_config(cli_api_key: Option<&str>) -> Settings {
        Settings {
            server: ServerSettings {
                host: "0.0.0.0".to_string(),
                port: 8091,
                log_level: "info".to_string(),
            },
            llm_backend: LlmBackendSettings::OpenAI {
                // Provider API key is supplied via CLI (--api-key) and applied later by loader
                api_key: String::new(),
                base_url: None,
                model: "glm-4.6".to_string(),
            },
            apis: ApiSettings {
                openai: Some(OpenAiApiSettings {
                    enabled: true,
                    path: "/v1".to_string(),
                    api_key_header: Some("Authorization".to_string()),
                    // Use the CLI-provided auth key (if any) as the client-facing API key for /v1
                    api_key: cli_api_key.map(|k| k.to_string()),
                }),
                ollama: Some(OllamaApiSettings {
                    enabled: false,
                    path: "/ollama".to_string(),
                    api_key_header: None,
                    api_key: None,
                }),
                anthropic: Some(AnthropicApiSettings {
                    enabled: false,
                    path: "/anthropic".to_string(),
                    api_key_header: None,
                }),
            },
            client_adapters: Some(ClientAdapterSettings {
                default_adapter: Some("openai".to_string()),
                force_adapter: Some("openai".to_string()),
                zed: Some(ZedAdapterSettings {
                    enabled: false,
                    force_images_field: Some(false),
                    preferred_format: Some("json".to_string()),
                }),
            }),
        }
    }
}