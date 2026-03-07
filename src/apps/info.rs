use super::SupportedApp;

/// Application information structure
#[derive(Debug, Clone)]
pub struct AppInfo {
    pub name: String,
    pub description: String,
    pub port: u16,
    pub protocol: String,
    pub endpoints: Vec<String>,
    pub auth_required: bool,
}

/// Application information provider
pub struct AppInfoProvider;

impl AppInfoProvider {
    /// Get application information
    pub fn get_app_info(app: &SupportedApp) -> AppInfo {
        match app {
            SupportedApp::CodexCLI => AppInfo {
                name: "Codex CLI".to_string(),
                description: "OpenAI Codex CLI tool for AI-powered coding assistance".to_string(),
                port: 8088,
                protocol: "OpenAI API".to_string(),
                endpoints: vec![
                    "POST /v1/chat/completions".to_string(),
                    "GET /v1/models".to_string(),
                ],
                auth_required: true,
            },
            SupportedApp::Zed => AppInfo {
                name: "Zed".to_string(),
                description: "Zed editor with AI assistant integration".to_string(),
                port: 11434,
                protocol: "Ollama API".to_string(),
                endpoints: vec![
                    "POST /api/chat".to_string(),
                    "POST /api/generate".to_string(),
                    "GET /api/tags".to_string(),
                ],
                auth_required: false,
            },
            SupportedApp::Aider => AppInfo {
                name: "Aider".to_string(),
                description: "AI pair programming in your terminal".to_string(),
                port: 8090,
                protocol: "OpenAI API".to_string(),
                endpoints: vec![
                    "POST /v1/chat/completions".to_string(),
                    "GET /v1/models".to_string(),
                ],
                auth_required: true,
            },
            SupportedApp::OpenHands => AppInfo {
                name: "OpenHands".to_string(),
                description: "AI agent framework for software development".to_string(),
                port: 8091,
                protocol: "OpenAI API".to_string(),
                endpoints: vec![
                    "POST /v1/chat/completions".to_string(),
                    "GET /v1/models".to_string(),
                ],
                auth_required: true,
            },
        }
    }
}
