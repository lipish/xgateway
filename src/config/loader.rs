use crate::config::models::Config;
use anyhow::{Context, Result};
use regex::Regex;
use std::fs;
use std::path::Path;

/// 环境变量替换的正则表达式，匹配 ${VAR_NAME} 或 ${VAR_NAME:default}
const ENV_VAR_PATTERN: &str = r"\$\{([^}:]+)(?::([^}]*))?\}";

/// 配置加载器
pub struct ConfigLoader;

impl ConfigLoader {
    /// 从默认路径加载配置
    pub async fn load_default() -> Result<Config> {
        let config_paths = [
            "config/xgateway.yaml",
            "config/xgateway.yml",
            "xgateway.yaml",
            "xgateway.yml",
        ];

        for &path in &config_paths {
            if Path::new(path).exists() {
                tracing::info!("Loading config from: {}", path);
                return Self::load_from_file(path).await;
            }
        }

        tracing::info!("No config file found, using defaults");
        Ok(Config::default())
    }

    /// 从指定文件加载配置
    pub async fn load_from_file<P: AsRef<Path>>(path: P) -> Result<Config> {
        let path = path.as_ref();
        let content = fs::read_to_string(path)
            .with_context(|| format!("Failed to read config file: {:?}", path))?;

        Self::load_from_yaml_str(&content).await
    }

    /// 从 YAML 字符串加载配置
    pub async fn load_from_yaml_str(content: &str) -> Result<Config> {
        let mut config: Config = serde_yaml::from_str(content)
            .context("Failed to parse config YAML")?;

        Self::expand_env_vars_in_config(&mut config)?;

        Ok(config)
    }

    /// 在配置中展开环境变量
    fn expand_env_vars_in_config(config: &mut Config) -> Result<()> {
        let re = Regex::new(ENV_VAR_PATTERN).context("Failed to create env var regex")?;

        config.database.url = Self::expand_env_vars_in_string(&re, &config.database.url)?;

        if let Some(ref mut auth_key) = config.security.auth_key {
            *auth_key = Self::expand_env_vars_in_string(&re, auth_key)?;
        }

        if let Some(ref mut encryption_key) = config.security.secrets_encryption_key {
            *encryption_key = Self::expand_env_vars_in_string(&re, encryption_key)?;
        }

        if let Some(ref mut otlp_endpoint) = config.metrics.tracing.otlp_endpoint {
            *otlp_endpoint = Self::expand_env_vars_in_string(&re, otlp_endpoint)?;
        }

        Ok(())
    }

    /// 在字符串中展开环境变量
    fn expand_env_vars_in_string(re: &Regex, s: &str) -> Result<String> {
        let mut result = s.to_string();

        for caps in re.captures_iter(s) {
            let full_match = caps.get(0).unwrap().as_str();
            let var_name = caps.get(1).unwrap().as_str();
            let default_value = caps.get(2).map(|m| m.as_str());

            let replacement = match std::env::var(var_name) {
                Ok(value) => value,
                Err(_) => {
                    if let Some(default) = default_value {
                        default.to_string()
                    } else {
                        tracing::warn!(
                            "Environment variable '{}' not found and no default provided",
                            var_name
                        );
                        full_match.to_string()
                    }
                }
            };

            result = result.replace(full_match, &replacement);
        }

        Ok(result)
    }

    /// 合并 CLI 参数到配置（CLI 参数优先级最高）
    pub fn merge_cli_args(config: &mut Config, cli_args: &crate::cli::Args) {
        if let Some(ref host) = cli_args.host {
            config.server.host = host.clone();
        }

        if let Some(port) = cli_args.port {
            config.server.port = port;
        }

        if let Some(ref log_level) = cli_args.log_level {
            config.server.log_level = log_level.clone();
            config.logging.level = log_level.clone();
        }

        if let Some(ref auth_key) = cli_args.auth_key {
            config.security.auth_key = Some(auth_key.clone());
        }
    }

    /// 验证配置
    pub fn validate(config: &Config) -> Result<()> {
        if config.server.port == 0 {
            anyhow::bail!("Server port must be greater than 0");
        }

        if config.database.max_connections < config.database.min_connections {
            anyhow::bail!(
                "max_connections ({}) must be >= min_connections ({})",
                config.database.max_connections,
                config.database.min_connections
            );
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_env_var_expansion() {
        std::env::set_var("TEST_VAR", "test_value");

        let re = Regex::new(ENV_VAR_PATTERN).unwrap();
        let result = ConfigLoader::expand_env_vars_in_string(&re, "prefix_${TEST_VAR}_suffix").unwrap();
        assert_eq!(result, "prefix_test_value_suffix");
    }

    #[test]
    fn test_env_var_with_default() {
        let re = Regex::new(ENV_VAR_PATTERN).unwrap();
        let result = ConfigLoader::expand_env_vars_in_string(&re, "${NON_EXISTENT_VAR:default_value}").unwrap();
        assert_eq!(result, "default_value");
    }
}
