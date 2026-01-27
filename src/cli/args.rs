use clap::Parser;

#[derive(Parser, Debug)]
#[command(name = "xgateway")]
#[command(about = "A configurable LLM proxy service with multi-provider support", long_about = None)]
pub struct Args {
    /// Application mode (codex-cli, zed, aider, openhands)
    #[arg(short, long)]
    pub app: Option<String>,

    /// Enable multiple protocols (comma-separated: openai,ollama,anthropic)
    #[arg(long)]
    pub protocols: Option<String>,

    /// List available applications
    #[arg(long)]
    pub list_apps: bool,

    /// Show application information
    #[arg(long)]
    pub app_info: Option<String>,

    /// Admin interface port
    #[arg(long = "admin-port", default_value = "8081")]
    pub admin_port: Option<u16>,

    /// API key for protecting XGateway's own HTTP APIs (not forwarded to providers)
    #[arg(long = "auth-key")]
    pub auth_key: Option<String>,

    /// Override LLM provider (openai, anthropic, zhipu, ollama)
    #[arg(long)]
    pub provider: Option<String>,

    /// Override LLM model name
    #[arg(long)]
    pub model: Option<String>,

    /// LLM provider API key (used to talk to upstream providers)
    #[arg(long = "api-key")]
    pub llm_api_key: Option<String>,

    /// Host to bind to (if provided overrides config)
    #[arg(long)]
    pub host: Option<String>,

    /// Port to bind to (if provided overrides config)
    #[arg(short, long)]
    pub port: Option<u16>,

    /// Log level
    #[arg(long, default_value = "info")]
    pub log_level: Option<String>,
}
