mod codex;
mod zed;
mod aider;
mod openhands;
mod info;
mod protocol;

use serde::{Deserialize, Serialize};
use crate::settings::Settings;

pub use info::AppInfoProvider;

// Re-export app-specific modules
pub use codex::CodexApp;
pub use zed::ZedApp;
pub use aider::AiderApp;
pub use openhands::OpenHandsApp;

/// Supported application types
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum SupportedApp {
    /// Codex CLI - OpenAI API client
    CodexCLI,
    /// Zed - Ollama API client
    Zed,
    /// Aider - AI pair programming tool
    Aider,
    /// OpenHands - AI agent framework
    OpenHands,
}

impl SupportedApp {
    /// Parse application type from string
    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "codex-cli" | "codex" => Some(Self::CodexCLI),
            "zed-dev" | "zed" => Some(Self::Zed),
            "aider" => Some(Self::Aider),
            "openhands" => Some(Self::OpenHands),
            _ => None,
        }
    }

    /// Get application name
    pub fn name(&self) -> &'static str {
        match self {
            Self::CodexCLI => "codex-cli",
            Self::Zed => "zed",
            Self::Aider => "aider",
            Self::OpenHands => "openhands",
        }
    }

    /// Get all supported applications
    pub fn all() -> Vec<Self> {
        vec![
            Self::CodexCLI,
            Self::Zed,
            Self::Aider,
            Self::OpenHands,
        ]
    }
}

/// Application configuration generator
#[allow(dead_code)]
pub struct AppConfigGenerator;

impl AppConfigGenerator {
    /// Generate configuration for specified application
    #[allow(dead_code)]
    pub fn generate_config(app: &SupportedApp, cli_api_key: Option<&str>) -> Settings {
        match app {
            SupportedApp::CodexCLI => CodexApp::generate_config(cli_api_key),
            SupportedApp::Zed => ZedApp::generate_config(),
            SupportedApp::Aider => AiderApp::generate_config(cli_api_key),
            SupportedApp::OpenHands => OpenHandsApp::generate_config(cli_api_key),
        }
    }

    /// Generate protocol combination configuration
    #[allow(dead_code)]
    pub fn generate_protocol_config(protocols: &[String], cli_api_key: Option<&str>) -> Settings {
        protocol::generate_protocol_config(protocols, cli_api_key)
    }
}