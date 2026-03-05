use crate::settings::{
    Settings, ServerSettings, LlmBackendSettings, ApiSettings,
    OpenAiApiSettings, OllamaApiSettings, AnthropicApiSettings,
    ClientAdapterSettings, ZedAdapterSettings,
};
/// Zed.dev application configuration
#[allow(dead_code)]
pub struct ZedApp;

impl ZedApp {
    /// Generate Zed.dev configuration
    #[allow(dead_code)]
    pub fn generate_config() -> Settings {
        Settings {
            server: ServerSettings {
                host: "0.0.0.0".to_string(),
                port: 11434,
                log_level: "info".to_string(),
            },
            llm_backend: LlmBackendSettings::Ollama {
                base_url: Some("http://localhost:11434".to_string()),
                region: None,
                model: "llama3".to_string(),
            },
            apis: ApiSettings {
                openai: Some(OpenAiApiSettings {
                    enabled: false,  // Disabled by default - use --protocols openai to enable
                    path: "/v1".to_string(),
                    api_key_header: Some("Authorization".to_string()),
                    api_key: None,
                }),
                ollama: Some(OllamaApiSettings {
                    enabled: false,  // Disabled by default - use --protocols ollama to enable
                    path: "".to_string(),  // Empty path so routes become /api/tags directly
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
                default_adapter: Some("zed".to_string()),
                force_adapter: Some("zed".to_string()),
                zed: Some(ZedAdapterSettings {
                    enabled: true,
                    force_images_field: Some(true),
                    preferred_format: Some("ndjson".to_string()),
                }),
            }),
        }
    }
}
