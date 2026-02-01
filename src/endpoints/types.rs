use std::sync::Arc;
use tokio::sync::RwLock;
use crate::pool::PoolManager;
use crate::db::DatabasePool;
use crate::settings::{Settings, LlmBackendSettings};
use crate::xtrace::XTraceClient;
use crate::service::Service as LlmService;
use anyhow::Result;

#[derive(Clone)]
pub struct ProxyState {
    pub db_pool: DatabasePool,
    pub pool_manager: Arc<PoolManager>,
    pub llm_service: Arc<RwLock<LlmService>>,
    pub config: Arc<RwLock<Settings>>,
    pub xtrace: Option<Arc<XTraceClient>>,
}

impl ProxyState {
    /// Dynamically update LLM service configuration
    #[allow(dead_code)]
    pub async fn update_llm_service(&self, new_backend: &LlmBackendSettings) -> Result<()> {
        let new_service = LlmService::new(new_backend)?;

        {
            let mut service = self.llm_service.write().await;
            *service = new_service;
        }

        {
            let mut config = self.config.write().await;
            config.llm_backend = new_backend.clone();
        }

        Ok(())
    }

    /// Get a copy of the current configuration
    #[allow(dead_code)]
    pub async fn get_current_config(&self) -> Result<Settings> {
        let config = self.config.read().await;
        Ok(config.clone())
    }
}
