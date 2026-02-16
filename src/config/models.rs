use serde::{Deserialize, Serialize};
use std::path::PathBuf;

/// 主配置结构体
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    #[serde(default = "default_version")]
    pub version: String,

    #[serde(default)]
    pub server: ServerConfig,

    #[serde(default)]
    pub database: DatabaseConfig,

    #[serde(default)]
    pub security: SecurityConfig,

    #[serde(default)]
    pub metrics: MetricsConfig,

    #[serde(default)]
    pub logging: LoggingConfig,

    #[serde(default)]
    pub config_watch: ConfigWatchConfig,
}

fn default_version() -> String {
    "1.0.0".to_string()
}

impl Default for Config {
    fn default() -> Self {
        Self {
            version: default_version(),
            server: ServerConfig::default(),
            database: DatabaseConfig::default(),
            security: SecurityConfig::default(),
            metrics: MetricsConfig::default(),
            logging: LoggingConfig::default(),
            config_watch: ConfigWatchConfig::default(),
        }
    }
}

/// 服务器配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerConfig {
    #[serde(default = "default_host")]
    pub host: String,

    #[serde(default = "default_port")]
    pub port: u16,

    #[serde(default = "default_log_level")]
    pub log_level: String,

    #[serde(default = "default_graceful_shutdown_timeout")]
    pub graceful_shutdown_timeout: String,
}

fn default_host() -> String {
    "127.0.0.1".to_string()
}

fn default_port() -> u16 {
    3000
}

fn default_log_level() -> String {
    "info".to_string()
}

fn default_graceful_shutdown_timeout() -> String {
    "30s".to_string()
}

impl Default for ServerConfig {
    fn default() -> Self {
        Self {
            host: default_host(),
            port: default_port(),
            log_level: default_log_level(),
            graceful_shutdown_timeout: default_graceful_shutdown_timeout(),
        }
    }
}

/// 数据库配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabaseConfig {
    #[serde(default = "default_database_url")]
    pub url: String,

    #[serde(default = "default_max_connections")]
    pub max_connections: u32,

    #[serde(default = "default_min_connections")]
    pub min_connections: u32,

    #[serde(default = "default_connect_timeout")]
    pub connect_timeout: String,

    #[serde(default = "default_idle_timeout")]
    pub idle_timeout: String,
}

fn default_database_url() -> String {
    "${DATABASE_URL}".to_string()
}

fn default_max_connections() -> u32 {
    20
}

fn default_min_connections() -> u32 {
    5
}

fn default_connect_timeout() -> String {
    "5s".to_string()
}

fn default_idle_timeout() -> String {
    "10m".to_string()
}

impl Default for DatabaseConfig {
    fn default() -> Self {
        Self {
            url: default_database_url(),
            max_connections: default_max_connections(),
            min_connections: default_min_connections(),
            connect_timeout: default_connect_timeout(),
            idle_timeout: default_idle_timeout(),
        }
    }
}

/// 安全配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityConfig {
    #[serde(default)]
    pub auth_key: Option<String>,

    #[serde(default = "default_api_key_expiry_days")]
    pub api_key_expiry_days: u32,

    #[serde(default)]
    pub ip_whitelist: Vec<String>,

    #[serde(default)]
    pub secrets_encryption_key: Option<String>,
}

fn default_api_key_expiry_days() -> u32 {
    90
}

impl Default for SecurityConfig {
    fn default() -> Self {
        Self {
            auth_key: None,
            api_key_expiry_days: default_api_key_expiry_days(),
            ip_whitelist: Vec::new(),
            secrets_encryption_key: None,
        }
    }
}

/// Metrics 配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MetricsConfig {
    #[serde(default = "default_true")]
    pub enabled: bool,

    #[serde(default)]
    pub prometheus: PrometheusConfig,

    #[serde(default)]
    pub tracing: TracingConfig,
}

fn default_true() -> bool {
    true
}

impl Default for MetricsConfig {
    fn default() -> Self {
        Self {
            enabled: default_true(),
            prometheus: PrometheusConfig::default(),
            tracing: TracingConfig::default(),
        }
    }
}

/// Prometheus 配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrometheusConfig {
    #[serde(default = "default_true")]
    pub enabled: bool,

    #[serde(default = "default_prometheus_endpoint")]
    pub endpoint: String,
}

fn default_prometheus_endpoint() -> String {
    "/metrics".to_string()
}

impl Default for PrometheusConfig {
    fn default() -> Self {
        Self {
            enabled: default_true(),
            endpoint: default_prometheus_endpoint(),
        }
    }
}

/// Tracing 配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TracingConfig {
    #[serde(default = "default_false")]
    pub enabled: bool,

    #[serde(default)]
    pub otlp_endpoint: Option<String>,
}

fn default_false() -> bool {
    false
}

impl Default for TracingConfig {
    fn default() -> Self {
        Self {
            enabled: default_false(),
            otlp_endpoint: None,
        }
    }
}

/// 日志配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoggingConfig {
    #[serde(default = "default_log_format")]
    pub format: String,

    #[serde(default = "default_log_level")]
    pub level: String,

    #[serde(default)]
    pub file: LoggingFileConfig,
}

fn default_log_format() -> String {
    "json".to_string()
}

impl Default for LoggingConfig {
    fn default() -> Self {
        Self {
            format: default_log_format(),
            level: default_log_level(),
            file: LoggingFileConfig::default(),
        }
    }
}

/// 日志文件配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoggingFileConfig {
    #[serde(default = "default_false")]
    pub enabled: bool,

    #[serde(default = "default_log_path")]
    pub path: String,

    #[serde(default = "default_log_rotation")]
    pub rotation: String,
}

fn default_log_path() -> String {
    "/var/log/xgateway".to_string()
}

fn default_log_rotation() -> String {
    "daily".to_string()
}

impl Default for LoggingFileConfig {
    fn default() -> Self {
        Self {
            enabled: default_false(),
            path: default_log_path(),
            rotation: default_log_rotation(),
        }
    }
}

/// 配置热加载配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigWatchConfig {
    #[serde(default = "default_true")]
    pub enabled: bool,

    #[serde(default = "default_watch_interval")]
    pub interval: String,
}

fn default_watch_interval() -> String {
    "5s".to_string()
}

impl Default for ConfigWatchConfig {
    fn default() -> Self {
        Self {
            enabled: default_true(),
            interval: default_watch_interval(),
        }
    }
}

/// 配置加载源
#[allow(dead_code)]
#[derive(Debug, Clone)]
pub enum ConfigSource {
    File(PathBuf),
    Environment,
    Cli,
    Default,
}
