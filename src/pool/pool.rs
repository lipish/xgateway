//! Provider Pool Module
//!
//! Manages a pool of provider instances with integrated:
//! - Health checking
//! - Load balancing
//! - Failover management
//! - Metrics collection

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

use super::failover::{FailoverManager, RetryCondition};
use super::health::{HealthChecker, HealthStatus};
use super::load_balancer::{LoadBalanceStrategy, LoadBalancer};
use super::metrics::{ProviderMetrics, ProviderMetricsSummary};

/// Configuration for a provider instance
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderInstanceConfig {
    pub provider_type: String,
    pub api_key: Option<String>,
    pub base_url: Option<String>,
    pub region: Option<String>,
    pub model: String,
    pub priority: i32,
    pub weight: u32,
    pub enabled: bool,
    #[serde(default)]
    pub input_price: f64,
    #[serde(default)]
    pub output_price: f64,
    #[serde(default)]
    pub quota_limit: Option<u64>,
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
        self.load_balancer
            .set_pricing(
                id,
                config.input_price,
                config.output_price,
                config.quota_limit,
            )
            .await;

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
        self.instances
            .read()
            .await
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

    pub async fn select_provider_from_candidates(
        &self,
        candidate_provider_ids: &[i64],
        exclude: Option<i64>,
    ) -> Option<i64> {
        let instances = self.instances.read().await;
        let mut enabled_in_pool: Vec<i64> = candidate_provider_ids
            .iter()
            .copied()
            .filter(|id| instances.get(id).map(|p| p.config.enabled).unwrap_or(false))
            .collect();
        drop(instances);

        if let Some(excluded) = exclude {
            enabled_in_pool.retain(|&id| id != excluded);
        }

        let enabled_snapshot = enabled_in_pool.clone();

        let mut available: Vec<i64> = Vec::new();
        for id in enabled_in_pool {
            if self.is_provider_available(id).await {
                available.push(id);
            }
        }

        if available.is_empty() {
            return self.load_balancer.select_provider(&enabled_snapshot).await;
        }

        self.load_balancer.select_provider(&available).await
    }

    pub async fn select_provider_from_candidates_with_strategy(
        &self,
        strategy: LoadBalanceStrategy,
        candidate_provider_ids: &[i64],
        exclude: Option<i64>,
    ) -> Option<i64> {
        let instances = self.instances.read().await;
        let mut enabled_in_pool: Vec<i64> = candidate_provider_ids
            .iter()
            .copied()
            .filter(|id| instances.get(id).map(|p| p.config.enabled).unwrap_or(false))
            .collect();
        drop(instances);

        if let Some(excluded) = exclude {
            enabled_in_pool.retain(|&id| id != excluded);
        }

        let enabled_snapshot = enabled_in_pool.clone();

        let mut available: Vec<i64> = Vec::new();
        for id in enabled_in_pool {
            if self.is_provider_available(id).await {
                available.push(id);
            }
        }

        if available.is_empty() {
            return self
                .load_balancer
                .select_provider_with_strategy(strategy, &enabled_snapshot)
                .await;
        }

        self.load_balancer
            .select_provider_with_strategy(strategy, &available)
            .await
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
        self.health_checker
            .record_success(provider_id, latency_ms)
            .await;
        self.failover_manager.record_success(provider_id).await;
    }

    /// Record failed request
    pub async fn record_failure(&self, provider_id: i64, error: Option<&str>) {
        self.health_checker.record_failure(provider_id, error).await;
        self.failover_manager
            .record_failure(provider_id, Some(RetryCondition::ServerError))
            .await;
    }

    /// Record request start (increment active connections)
    pub async fn record_request_start(&self, provider_id: i64) {
        self.metrics.record_request_start(provider_id).await;
    }

    /// Record request metrics
    pub async fn record_request(
        &self,
        provider_id: i64,
        latency: std::time::Duration,
        success: bool,
        tokens: Option<u64>,
    ) {
        self.metrics
            .record_request_end(provider_id, latency, success, tokens)
            .await;
    }

    /// Find fallback provider
    pub async fn find_fallback(&self, failed_provider_id: i64) -> Option<i64> {
        self.failover_manager
            .find_fallback(failed_provider_id)
            .await
    }

    /// Set fallback chain for a provider
    pub async fn set_fallback_chain(&self, provider_id: i64, fallback_ids: Vec<i64>) {
        self.failover_manager
            .set_fallback_chain(provider_id, fallback_ids)
            .await;
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

    /// Get all circuit states
    pub async fn get_all_circuit_states(
        &self,
    ) -> HashMap<i64, super::circuit_breaker::CircuitState> {
        self.failover_manager.get_all_circuit_states().await
    }

    /// Check if a provider is available (healthy and circuit breaker allows)
    pub async fn is_provider_available(&self, provider_id: i64) -> bool {
        self.health_checker.is_healthy(provider_id).await
            && self
                .failover_manager
                .is_provider_available(provider_id)
                .await
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

#[cfg(test)]
mod tests {
    use super::*;

    fn test_config(priority: i32) -> ProviderInstanceConfig {
        ProviderInstanceConfig {
            provider_type: "openai".to_string(),
            api_key: Some("test-key".to_string()),
            base_url: Some("http://127.0.0.1:1".to_string()),
            region: None,
            model: "test-model".to_string(),
            priority,
            weight: 1,
            enabled: true,
            input_price: 0.0,
            output_price: 0.0,
            quota_limit: None,
        }
    }

    #[tokio::test]
    async fn test_candidate_selection_with_priority_for_instance_scoped_key() {
        let pool = ProviderPool::new();

        pool.add_provider(101, "p-low".to_string(), test_config(10))
            .await;
        pool.add_provider(102, "p-high".to_string(), test_config(90))
            .await;
        pool.add_provider(103, "p-mid".to_string(), test_config(40))
            .await;

        pool.update_health(101, HealthStatus::Healthy).await;
        pool.update_health(102, HealthStatus::Healthy).await;
        pool.update_health(103, HealthStatus::Healthy).await;

        // Simulate instance-scoped key binding to provider_ids [101, 102].
        let selected = pool
            .select_provider_from_candidates_with_strategy(
                LoadBalanceStrategy::Priority,
                &[101, 102],
                None,
            )
            .await;
        assert_eq!(selected, Some(102));

        // Simulate another key bound to [101, 103].
        let selected_other = pool
            .select_provider_from_candidates_with_strategy(
                LoadBalanceStrategy::Priority,
                &[101, 103],
                None,
            )
            .await;
        assert_eq!(selected_other, Some(103));
    }

    #[tokio::test]
    async fn test_priority_retry_selects_next_candidate_when_excluded() {
        let pool = ProviderPool::new();

        pool.add_provider(201, "p1".to_string(), test_config(10))
            .await;
        pool.add_provider(202, "p2".to_string(), test_config(80))
            .await;
        pool.add_provider(203, "p3".to_string(), test_config(50))
            .await;

        pool.update_health(201, HealthStatus::Healthy).await;
        pool.update_health(202, HealthStatus::Healthy).await;
        pool.update_health(203, HealthStatus::Healthy).await;

        let first = pool
            .select_provider_from_candidates_with_strategy(
                LoadBalanceStrategy::Priority,
                &[201, 202, 203],
                None,
            )
            .await;
        assert_eq!(first, Some(202));

        // Simulate retry after first provider failure.
        let retry = pool
            .select_provider_from_candidates_with_strategy(
                LoadBalanceStrategy::Priority,
                &[201, 202, 203],
                Some(202),
            )
            .await;
        assert_eq!(retry, Some(203));
    }

    #[tokio::test]
    async fn test_round_robin_stays_within_candidate_set() {
        let pool = ProviderPool::new();

        pool.add_provider(301, "p1".to_string(), test_config(1))
            .await;
        pool.add_provider(302, "p2".to_string(), test_config(1))
            .await;

        pool.update_health(301, HealthStatus::Healthy).await;
        pool.update_health(302, HealthStatus::Healthy).await;

        let mut seen = std::collections::HashSet::new();
        for _ in 0..6 {
            let selected = pool
                .select_provider_from_candidates_with_strategy(
                    LoadBalanceStrategy::RoundRobin,
                    &[301, 302],
                    None,
                )
                .await
                .expect("expected provider selection");
            seen.insert(selected);
        }

        assert!(seen.contains(&301));
        assert!(seen.contains(&302));
    }
}
