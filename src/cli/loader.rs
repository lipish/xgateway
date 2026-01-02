use anyhow::Result;
use tracing::{info, error};
use crate::settings::Settings;
use crate::apps::{SupportedApp, AppConfigGenerator};
use crate::cli::Args;

pub struct ConfigLoader;

impl ConfigLoader {
    /// 加载配置（应用模式或协议模式）
    pub fn load_config(args: &Args) -> Result<(Settings, String)> {
        if let Some(app_name) = &args.app {
            Self::load_app_config(app_name, args)
        } else if let Some(protocols_str) = &args.protocols {
            Self::load_protocol_config(protocols_str, args)
        } else {
            Err(anyhow::anyhow!(
                "Application mode required. Use --app <app-name> or --protocols <protocols>.\n\
                 Available applications: codex-cli, zed\n\
                 Use --list-apps for more information."
            ))
        }
    }

    /// 加载应用模式配置
    fn load_app_config(app_name: &str, args: &Args) -> Result<(Settings, String)> {
        let app = SupportedApp::from_str(app_name)
            .ok_or_else(|| anyhow::anyhow!(
                "Unknown application: {}. Use --list-apps to see available applications.",
                app_name
            ))?;

        info!("🚀 Starting in {} mode", app.name());

        // If --protocols is specified, use protocol config instead
        if let Some(protocols_str) = &args.protocols {
            info!("🔄 Using protocols: {}", protocols_str);
            let protocols: Vec<String> = protocols_str
                .split(',')
                .map(|s| s.trim().to_string())
                .collect();

            // Check required CLI flags for protocol combination
            Self::check_protocol_flags(&protocols, args)?;

            let mut config = AppConfigGenerator::generate_protocol_config(&protocols, args.auth_key.as_deref());

            // Apply provider/model overrides if specified
            if let Some(provider) = &args.provider {
                config = Self::apply_provider_overrides(
                    config,
                    Some(provider.as_str()),
                    args.model.as_deref(),
                    args.llm_api_key.as_deref()
                )?;
            }

            let config_source = format!("app: {} with protocols: {}", app.name(), protocols.join(", "));
            return Ok((config, config_source));
        }

        // Require --provider parameter
        let provider = Self::require_provider(app_name, args)?;

        // Generate base config for the app (LLM Link auth is provided via --auth-key)
        let mut config = AppConfigGenerator::generate_config(&app, args.auth_key.as_deref());

        // Apply provider/model overrides (provider is required, model is optional)
        config = Self::apply_provider_overrides(
            config,
            Some(provider),
            args.model.as_deref(),
            args.llm_api_key.as_deref()
        )?;

        let config_source = format!("built-in: {} with provider: {}", app.name(), provider);
        Ok((config, config_source))
    }

    /// 加载协议模式配置
    fn load_protocol_config(protocols_str: &str, args: &Args) -> Result<(Settings, String)> {
        let protocols: Vec<String> = protocols_str
            .split(',')
            .map(|s| s.trim().to_string())
            .collect();

        if protocols.is_empty() {
            return Err(anyhow::anyhow!("No protocols specified. Use --protocols openai,ollama,anthropic"));
        }

        info!("🚀 Starting with protocols: {}", protocols.join(", "));

        // Check required CLI flags for protocol combination
        Self::check_protocol_flags(&protocols, args)?;

        // Generate base config for the selected protocols
        let mut config = AppConfigGenerator::generate_protocol_config(&protocols, args.auth_key.as_deref());

        // Apply provider/model overrides if specified (same behavior as app mode)
        if let Some(provider) = &args.provider {
            config = Self::apply_provider_overrides(
                config,
                Some(provider.as_str()),
                args.model.as_deref(),
                args.llm_api_key.as_deref()
            )?;
        }

        let config_source = format!("protocols: {}", protocols.join(", "));

        Ok((config, config_source))
    }

    /// 要求提供 --provider 参数
    fn require_provider<'a>(app_name: &str, args: &'a Args) -> Result<&'a str> {
        args.provider.as_deref()
            .ok_or_else(|| {
                error!("❌ Missing required parameter: --provider");
                error!("");
                error!("🔧 You must specify which LLM provider to use:");
                error!("   --provider openai      (requires --api-key)");
                error!("   --provider anthropic   (requires --api-key)");
                error!("   --provider zhipu       (requires --api-key)");
                error!("   --provider aliyun      (requires --api-key)");
                error!("   --provider minimax     (requires --api-key)");
                error!("   --provider ollama      (no API key needed)");
                error!("");
                error!("💡 Example:");
                error!("   ./llm-link --app {} --provider minimax", app_name);
                error!("");
                error!("📚 For more information:");
                error!("   ./llm-link --app-info {}", app_name);
                anyhow::anyhow!("Missing required parameter: --provider")
            })
    }

    /// 检查协议模式所需的 CLI 参数
    fn check_protocol_flags(protocols: &[String], args: &Args) -> Result<()> {
        let mut missing_flags = Vec::new();

        for protocol in protocols {
            match protocol.to_lowercase().as_str() {
                "openai" => {
                    if args.auth_key.is_none() {
                        missing_flags.push("--auth-key");
                    }
                }
                "anthropic" | "ollama" => {
                    // No extra flags required beyond provider overrides
                }
                _ => {
                    return Err(anyhow::anyhow!(
                        "Unknown protocol: {}. Supported: openai, ollama, anthropic",
                        protocol
                    ));
                }
            }
        }

        if !missing_flags.is_empty() {
            error!("❌ Missing required CLI flags for protocols:");
            for flag in &missing_flags {
                error!("   - {}", flag);
            }
            error!("");
            return Err(anyhow::anyhow!(
                "Missing required CLI flags. Provide them via command line arguments."
            ));
        }

        Ok(())
    }

    /// 应用 provider 覆盖
    fn apply_provider_overrides(
        mut config: Settings,
        provider: Option<&str>,
        model: Option<&str>,
        api_key: Option<&str>,
    ) -> Result<Settings> {
        use crate::settings::LlmBackendSettings;

        if let Some(provider_name) = provider {
            info!("🔄 Overriding LLM provider to: {}", provider_name);

            // Determine provider API key strictly from CLI
            let provided_key = api_key
                .map(|key| key.to_string())
                .ok_or_else(|| {
                    anyhow::anyhow!(
                        "Missing required --api-key for provider '{}'",
                        provider_name
                    )
                })?;

            // Determine model
            let model_name = if let Some(m) = model {
                m.to_string()
            } else {
                // Use provider's default model
                match provider_name {
                    "openai" => "gpt-4".to_string(),
                    "anthropic" => "claude-3-5-sonnet-20241022".to_string(),
                    "zhipu" => "glm-4-flash".to_string(),
                    "aliyun" => "qwen-max".to_string(),
                    "volcengine" => "doubao-pro-32k".to_string(),
                    "tencent" => "hunyuan-lite".to_string(),
                    "longcat" => "LongCat-Flash-Chat".to_string(),
                    "moonshot" => "kimi-k2-turbo-preview".to_string(),
                    "minimax" => "MiniMax-M2".to_string(),
                    "ollama" => "llama2".to_string(),
                    _ => return Err(anyhow::anyhow!("Unknown provider: {}", provider_name)),
                }
            };

            info!("🔄 Using model: {}", model_name);

            // Create new backend settings based on provider
            // Ollama 不需要实际使用 API key，但仍要求通过 CLI 传入以保持接口一致
            let api_key_value = if provider_name == "ollama" {
                String::new()
            } else {
                provided_key.clone()
            };

            config.llm_backend = match provider_name {
                "openai" => LlmBackendSettings::OpenAI {
                    api_key: api_key_value,
                    base_url: None,
                    model: model_name,
                },
                "anthropic" => LlmBackendSettings::Anthropic {
                    api_key: api_key_value,
                    model: model_name,
                },
                "zhipu" => LlmBackendSettings::Zhipu {
                    api_key: api_key_value,
                    base_url: Some("https://open.bigmodel.cn/api/paas/v4".to_string()),
                    model: model_name,
                },
                "aliyun" => LlmBackendSettings::Aliyun {
                    api_key: api_key_value,
                    model: model_name,
                },
                "volcengine" => LlmBackendSettings::Volcengine {
                    api_key: api_key_value,
                    model: model_name,
                },
                "tencent" => LlmBackendSettings::Tencent {
                    api_key: api_key_value,
                    model: model_name,
                    secret_id: None,
                    secret_key: None,
                },
                "longcat" => LlmBackendSettings::Longcat {
                    api_key: api_key_value,
                    model: model_name,
                },
                "moonshot" => LlmBackendSettings::Moonshot {
                    api_key: api_key_value,
                    model: model_name,
                },
                "minimax" => LlmBackendSettings::Minimax {
                    api_key: api_key_value,
                    model: model_name,
                },
                "ollama" => LlmBackendSettings::Ollama {
                    base_url: std::env::var("OLLAMA_BASE_URL").ok()
                        .or(Some("http://localhost:11434".to_string())),
                    model: model_name,
                },
                _ => return Err(anyhow::anyhow!("Unknown provider: {}", provider_name)),
            };
        } else if let Some(model_name) = model {
            // Only model override, keep existing provider
            info!("🔄 Overriding model to: {}", model_name);
            match &mut config.llm_backend {
                LlmBackendSettings::OpenAI { model, .. } => *model = model_name.to_string(),
                LlmBackendSettings::Anthropic { model, .. } => *model = model_name.to_string(),
                LlmBackendSettings::Zhipu { model, .. } => *model = model_name.to_string(),
                LlmBackendSettings::Aliyun { model, .. } => *model = model_name.to_string(),
                LlmBackendSettings::Volcengine { model, .. } => *model = model_name.to_string(),
                LlmBackendSettings::Tencent { model, .. } => *model = model_name.to_string(),
                LlmBackendSettings::Longcat { model, .. } => *model = model_name.to_string(),
                LlmBackendSettings::Moonshot { model, .. } => *model = model_name.to_string(),
                LlmBackendSettings::Minimax { model, .. } => *model = model_name.to_string(),
                LlmBackendSettings::Ollama { model, .. } => *model = model_name.to_string(),
            }
        }

        Ok(config)
    }

    /// 应用命令行参数覆盖
    pub fn apply_cli_overrides(mut config: Settings, args: &Args) -> Settings {
        if let Some(host) = &args.host {
            config.server.host = host.clone();
        }
        if let Some(port) = args.port {
            config.server.port = port;
        }
        if let Some(log_level) = &args.log_level {
            config.server.log_level = log_level.clone();
        }
        config
    }
}
