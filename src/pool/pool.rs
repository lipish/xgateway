//! Provider Pool Module
//!
//! Manages a pool of provider instances with integrated:
//! - Health checking
//! - Load balancing
//! - Failover management
//! - Metrics collection

use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use serde::{Deserialize, Serialize};

use super::health::{HealthChecker, HealthStatus};
use super::load_balancer::{LoadBalancer, LoadBalanceStrategy};
use super::failover::{FailoverManager, RetryCondition};
use super::metrics::{ProviderMetrics, ProviderMetricsSummary};

/// Configuration for a provider instance
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderInstanceConfig {
    pub provider_type: String,
    pub api_key: Option<String>,
    pub base_url: Option<String>,
    pub model: String,
    pub priority: i32,
    pub weight: u32,
    pub enabled: bool,
}

/// Represents a provider instance in the pool
#[derive(Debug, Clone)]
pub struct ProviderInstance {
    pub id: i64,
    pub name: String,
    pub config: ProviderInstanceConfig,
    pub status: HealthStatus,
}

/// Provider pool for managing multiple provider instances
pub struct ProviderPool {
    instances: Arc<RwLock<HashMap<i64, ProviderInstance>>>,
    health_checker: Arc<HealthChecker>,
    load_balancer: Arc<LoadBalancer>,
    failover_manager: Arc<FailoverManager>,
    metrics: Arc<ProviderMetrics>,
}

impl ProviderPool {
    /// Create a new provider pool
    pub fn new() -> Self {
        let health_checker = Arc::new(HealthChecker::new());
        let metrics = Arc::new(ProviderMetrics::new());
        let load_balancer = Arc::new(LoadBalancer::new(
            Arc::clone(&health_checker),
            Arc::clone(&metrics),
        ));
        let failover_manager = Arc::new(FailoverManager::new(Arc::clone(&health_checker)));

        Self {
            instances: Arc::new(RwLock::new(HashMap::new())),
            health_checker,
            load_balancer,
            failover_manager,
            metrics,
        }
    }

    /// Create a provider pool with custom components
    pub fn with_components(
        health_checker: Arc<HealthChecker>,
        load_balancer: Arc<LoadBalancer>,
        failover_manager: Arc<FailoverManager>,
        metrics: Arc<ProviderMetrics>,
    ) -> Self {
        Self {
            instances: Arc::new(RwLock::new(HashMap::new())),
            health_checker,
            load_balancer,
            failover_manager,
            metrics,
        }
    }

    /// Add a provider to the pool
    pub async fn add_provider(&self, id: i64, name: String, config: ProviderInstanceConfig) {
        let instance = ProviderInstance {
            id,
            name: name.clone(),
            config: config.clone(),
            status: HealthStatus::Unknown,
        };

        // Register with all components
        self.health_checker.register_provider(id).await;
        self.failover_manager.register_provider(id).await;
        self.metrics.register_provider(id).await;
        self.load_balancer.set_priority(id, config.priority).await;

        self.instances.write().await.insert(id, instance);
        tracing::info!("Added provider {} ({}) to pool", name, id);
    }

    /// Remove a provider from the pool
    pub async fn remove_provider(&self, id: i64) {
        self.instances.write().await.remove(&id);
        self.health_checker.unregister_provider(id).await;
        tracing::info!("Removed provider {} from pool", id);
    }

    /// Get a provider by ID
    pub async fn get_provider(&self, id: i64) -> Option<ProviderInstance> {
        self.instances.read().await.get(&id).cloned()
    }

    /// Get all providers
    pub async fn get_all_providers(&self) -> Vec<ProviderInstance> {
        self.instances.read().await.values().cloned().collect()
    }

    /// Get all enabled provider IDs
    pub async fn get_enabled_provider_ids(&self) -> Vec<i64> {
        self.instances.read().await
            .values()
            .filter(|p| p.config.enabled)
            .map(|p| p.id)
            .collect()
    }

    /// Select a provider for a request using load balancing
    pub async fn select_provider(&self) -> Option<i64> {
        let enabled_ids = self.get_enabled_provider_ids().await;
        self.load_balancer.select_provider(&enabled_ids).await
    }

    /// Select a provider with fallback support
    pub async fn select_provider_with_fallback(&self, exclude: Option<i64>) -> Option<i64> {
        let mut enabled_ids = self.get_enabled_provider_ids().await;
        if let Some(excluded) = exclude {
            enabled_ids.retain(|&id| id != excluded);
        }
        self.load_balancer.select_provider(&enabled_ids).await
    }

    /// Set load balancing strategy
    pub async fn set_load_balance_strategy(&self, strategy: LoadBalanceStrategy) {
        self.load_balancer.set_strategy(strategy).await;
    }

    /// Update health status for a provider
    pub async fn update_health(&self, provider_id: i64, status: HealthStatus) {
        self.health_checker.set_status(provider_id, status).await;
    }

    /// Record successful request
    pub async fn record_success(&self, provider_id: i64, latency_ms: u64) {
        self.health_checker.record_success(provider_id, latency_ms).await;
        self.failover_manager.record_success(provider_id).await;
    }

    /// Record failed request
    pub async fn record_failure(&self, provider_id: i64, error: Option<&str>) {
        self.health_checker.record_failure(provider_id, error).await;
        self.failover_manager.record_failure(provider_id, Some(RetryCondition::ServerError)).await;
    }

    /// Record request start (increment active connections)
    pub async fn record_request_start(&self, provider_id: i64) {
        self.metrics.record_request_start(provider_id).await;
    }

    /// Record request metrics
    pub async fn record_request(&self, provider_id: i64, latency: std::time::Duration, success: bool, tokens: Option<u64>) {
        self.metrics.record_request_end(provider_id, latency, success, tokens).await;
    }

    /// Find fallback provider
    pub async fn find_fallback(&self, failed_provider_id: i64) -> Option<i64> {
        self.failover_manager.find_fallback(failed_provider_id).await
    }

    /// Set fallback chain for a provider
    pub async fn set_fallback_chain(&self, provider_id: i64, fallback_ids: Vec<i64>) {
        self.failover_manager.set_fallback_chain(provider_id, fallback_ids).await;
    }

    /// Get health status for a provider
    pub async fn get_health_status(&self, provider_id: i64) -> HealthStatus {
        self.health_checker.get_status(provider_id).await
    }

    /// Get all health statuses
    pub async fn get_all_health_statuses(&self) -> HashMap<i64, HealthStatus> {
        self.health_checker.get_all_statuses().await
    }

    /// Get metrics summary for a provider
    pub async fn get_metrics(&self, provider_id: i64) -> Option<ProviderMetricsSummary> {
        self.metrics.get_summary(provider_id).await
    }

    /// Get all metrics summaries
    pub async fn get_all_metrics(&self) -> HashMap<i64, ProviderMetricsSummary> {
        self.metrics.get_all_summaries().await
    }

    /// Check if a provider is available (healthy and circuit breaker allows)
    pub async fn is_provider_available(&self, provider_id: i64) -> bool {
        self.health_checker.is_healthy(provider_id).await
            && self.failover_manager.is_provider_available(provider_id).await
    }

    /// Get available providers count
    pub async fn available_count(&self) -> usize {
        let enabled = self.get_enabled_provider_ids().await;
        let mut count = 0;
        for id in enabled {
            if self.is_provider_available(id).await {
                count += 1;
            }
        }
        count
    }

    /// Get pool status summary
    pub async fn get_pool_status(&self) -> PoolStatus {
        let instances = self.instances.read().await;
        let total = instances.len();
        let enabled = instances.values().filter(|p| p.config.enabled).count();

        let mut healthy = 0;
        let mut degraded = 0;
        let mut unhealthy = 0;

        for instance in instances.values() {
            match self.health_checker.get_status(instance.id).await {
                HealthStatus::Healthy => healthy += 1,
                HealthStatus::Degraded => degraded += 1,
                HealthStatus::Unhealthy => unhealthy += 1,
                HealthStatus::Unknown => {}
            }
        }

        PoolStatus {
            total,
            enabled,
            healthy,
            degraded,
            unhealthy,
        }
    }

    /// Get references to internal components
    pub fn health_checker(&self) -> &Arc<HealthChecker> {
        &self.health_checker
    }

    pub fn load_balancer(&self) -> &Arc<LoadBalancer> {
        &self.load_balancer
    }

    pub fn failover_manager(&self) -> &Arc<FailoverManager> {
        &self.failover_manager
    }

    pub fn metrics(&self) -> &Arc<ProviderMetrics> {
        &self.metrics
    }
}

impl Default for ProviderPool {
    fn default() -> Self {
        Self::new()
    }
}

/// Pool status summary
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PoolStatus {
    pub total: usize,
    pub enabled: usize,
    pub healthy: usize,
    pub degraded: usize,
    pub unhealthy: usize,
}

impl PoolStatus {
    pub fn available(&self) -> usize {
        self.healthy + self.degraded
    }

    pub fn is_healthy(&self) -> bool {
        self.healthy > 0
    }
}

