use crate::config::loader::ConfigLoader;
use crate::config::models::Config;
use anyhow::Result;
use std::sync::{Arc, RwLock};

/// 配置管理器
#[derive(Clone)]
pub struct ConfigManager {
    current_config: Arc<RwLock<Config>>,
}

impl ConfigManager {
    /// 创建新的配置管理器
    pub fn new() -> Self {
        Self {
            current_config: Arc::new(RwLock::new(Config::default())),
        }
    }

    /// 创建配置管理器并加载配置
    pub async fn load() -> Result<Self> {
        let manager = Self::new();
        manager.reload().await?;
        Ok(manager)
    }

    /// 重新加载配置
    pub async fn reload(&self) -> Result<()> {
        let config = ConfigLoader::load_default().await?;
        ConfigLoader::validate(&config)?;

        let mut write_lock = self.current_config.write().unwrap();
        *write_lock = config;

        Ok(())
    }

    /// 获取当前配置
    pub fn get(&self) -> Config {
        self.current_config.read().unwrap().clone()
    }

    /// 手动设置配置（用于测试）
    #[cfg(test)]
    pub fn set(&self, config: Config) {
        let mut write_lock = self.current_config.write().unwrap();
        *write_lock = config;
    }
}

impl Default for ConfigManager {
    fn default() -> Self {
        Self::new()
    }
}
