//! Multi-Provider Service Module
//!
//! Provides a unified service layer that integrates:
//! - Provider pool management
//! - Health checking
//! - Load balancing
//! - Failover with retry

use std::sync::Arc;
use std::time::Duration;
use tokio::sync::RwLock;
use anyhow::{Result, anyhow};

use super::pool::{ProviderPool, ProviderInstanceConfig, PoolStatus};
use super::load_balancer::LoadBalanceStrategy;
use crate::db::Provider;
use crate::settings::LlmBackendSettings;
use crate::service::Service;

/// Result of a request execution
#[derive(Debug)]
pub struct ExecutionResult<T> {
    pub result: T,
    pub provider_id: i64,
    pub latency: Duration,
    pub retries: u32,
    pub failover_used: bool,
}

/// Multi-provider service configuration
#[derive(Debug, Clone)]
pub struct MultiProviderConfig {
    pub max_retries: u32,
    pub request_timeout: Duration,
    pub enable_failover: bool,
    pub load_balance_strategy: LoadBalanceStrategy,
}

impl Default for MultiProviderConfig {
    fn default() -> Self {
        Self {
            max_retries: 3,
            request_timeout: Duration::from_secs(60),
            enable_failover: true,
            load_balance_strategy: LoadBalanceStrategy::RoundRobin,
        }
    }
}

/// Multi-provider service for handling requests with load balancing and failover
pub struct MultiProviderService {
    pool: Arc<ProviderPool>,
    config: MultiProviderConfig,
    services: Arc<RwLock<std::collections::HashMap<i64, Arc<Service>>>>,
}

impl MultiProviderService {
    /// Create a new multi-provider service
    pub fn new(config: MultiProviderConfig) -> Self {
        let pool = Arc::new(ProviderPool::new());
        Self {
            pool,
            config,
            services: Arc::new(RwLock::new(std::collections::HashMap::new())),
        }
    }

    /// Create with existing pool
    pub fn with_pool(pool: Arc<ProviderPool>, config: MultiProviderConfig) -> Self {
        Self {
            pool,
            config,
            services: Arc::new(RwLock::new(std::collections::HashMap::new())),
        }
    }

    /// Initialize providers from database
    pub async fn init_from_db(&self, providers: Vec<Provider>) -> Result<()> {
        for provider in providers {
            if provider.enabled {
                self.add_provider_from_db(provider).await?;
            }
        }
        Ok(())
    }

    /// Add a provider from database record
    pub async fn add_provider_from_db(&self, provider: Provider) -> Result<()> {
        let config: serde_json::Value = serde_json::from_str(&provider.config)
            .map_err(|e| anyhow!("Invalid provider config: {}", e))?;

        // Use endpoint if provided, otherwise fall back to model
        let model = if let Some(endpoint) = &provider.endpoint {
            endpoint.clone()
        } else {
            config.get("model").and_then(|v| v.as_str()).unwrap_or("default").to_string()
        };

        let instance_config = ProviderInstanceConfig {
            provider_type: provider.provider_type.clone(),
            api_key: config.get("api_key").and_then(|v| v.as_str()).map(String::from),
            base_url: config.get("base_url").and_then(|v| v.as_str()).map(String::from),
            model,
            priority: provider.priority,
            weight: 1,
            enabled: provider.enabled,
            input_price: config.get("input_price").and_then(|v| v.as_f64()).unwrap_or(0.0),
            output_price: config.get("output_price").and_then(|v| v.as_f64()).unwrap_or(0.0),
            quota_limit: config.get("quota_limit").and_then(|v| v.as_u64()),
        };

        self.pool.add_provider(provider.id, provider.name.clone(), instance_config.clone()).await;

        // Create service instance
        if let Some(backend) = self.create_backend_settings(&provider, &instance_config) {
            match Service::new(&backend) {
                Ok(service) => {
                    self.services.write().await.insert(provider.id, Arc::new(service));
                    tracing::info!("Added provider {} to multi-provider service", provider.name);
                }
                Err(e) => {
                    tracing::warn!("Failed to create service for provider {}: {}", provider.name, e);
                }
            }
        }

        Ok(())
    }

    /// Create backend settings from provider config
    fn create_backend_settings(&self, provider: &Provider, config: &ProviderInstanceConfig) -> Option<LlmBackendSettings> {
        let api_key = config.api_key.clone().unwrap_or_default();
        let model = config.model.clone();
        let base_url = config.base_url.clone();

        match provider.provider_type.as_str() {
            "openai" => Some(LlmBackendSettings::OpenAI { api_key, base_url, model }),
            "anthropic" => Some(LlmBackendSettings::Anthropic { api_key, model }),
            "zhipu" => Some(LlmBackendSettings::Zhipu { api_key, base_url, model }),
            "ollama" => Some(LlmBackendSettings::Ollama { base_url, model }),
            "aliyun" => Some(LlmBackendSettings::Aliyun { api_key, model }),
            "volcengine" => Some(LlmBackendSettings::Volcengine { api_key, model }),
            "tencent" => Some(LlmBackendSettings::Tencent {
                api_key,
                model,
                secret_id: provider.secret_id.clone(),
                secret_key: provider.secret_key.clone(),
            }),
            "longcat" => Some(LlmBackendSettings::Longcat { api_key, model }),
            "moonshot" => Some(LlmBackendSettings::Moonshot { api_key, model }),
            "minimax" => Some(LlmBackendSettings::Minimax { api_key, model }),
            _ => None,
        }
    }

    /// Get pool reference
    pub fn pool(&self) -> &Arc<ProviderPool> {
        &self.pool
    }

    /// Get pool status
    pub async fn get_status(&self) -> PoolStatus {
        self.pool.get_pool_status().await
    }

    /// Select a provider for request
    pub async fn select_provider(&self) -> Option<i64> {
        self.pool.select_provider().await
    }

    /// Get service for a provider
    pub async fn get_service(&self, provider_id: i64) -> Option<Arc<Service>> {
        self.services.read().await.get(&provider_id).cloned()
    }
}