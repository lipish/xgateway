//! Load Balancer Module
//!
//! Provides multiple load balancing strategies for distributing requests
//! across multiple providers.

use std::collections::HashMap;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;
use tokio::sync::RwLock;
use serde::{Deserialize, Serialize};
use rand::Rng;

use super::health::HealthChecker;
use super::metrics::ProviderMetrics;

/// Load balancing strategy
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum LoadBalanceStrategy {
    /// Round-robin: distribute requests evenly
    RoundRobin,
    /// Least connections: prefer providers with fewer active requests
    LeastConnections,
    /// Weighted round-robin: distribute based on weights
    WeightedRoundRobin { weights: HashMap<i64, u32> },
    /// Random selection
    Random,
    /// Priority-based: always prefer highest priority provider
    Priority,
    /// Latency-based: prefer providers with lowest latency
    LatencyBased,
    /// Lowest price: prefer providers with lowest input price
    LowestPrice,
    /// Quota aware: prefer providers within quota, then by price
    QuotaAware,
}

impl Default for LoadBalanceStrategy {
    fn default() -> Self {
        Self::RoundRobin
    }
}

/// Load balancer for selecting providers
pub struct LoadBalancer {
    strategy: RwLock<LoadBalanceStrategy>,
    health_checker: Arc<HealthChecker>,
    metrics: Arc<ProviderMetrics>,
    round_robin_counter: AtomicUsize,
    provider_priorities: RwLock<HashMap<i64, i32>>,
    provider_prices: RwLock<HashMap<i64, (f64, f64)>>, // (input, output)
    provider_quotas: RwLock<HashMap<i64, Option<u64>>>,
}

impl LoadBalancer {
    /// Create a new load balancer
    pub fn new(health_checker: Arc<HealthChecker>, metrics: Arc<ProviderMetrics>) -> Self {
        Self {
            strategy: RwLock::new(LoadBalanceStrategy::default()),
            health_checker,
            metrics,
            round_robin_counter: AtomicUsize::new(0),
            provider_priorities: RwLock::new(HashMap::new()),
            provider_prices: RwLock::new(HashMap::new()),
            provider_quotas: RwLock::new(HashMap::new()),
        }
    }

    /// Set the load balancing strategy
    pub async fn set_strategy(&self, strategy: LoadBalanceStrategy) {
        *self.strategy.write().await = strategy;
        tracing::info!("Load balancing strategy updated");
    }

    /// Get the current strategy
    pub async fn strategy(&self) -> LoadBalanceStrategy {
        self.strategy.read().await.clone()
    }

    /// Set priority for a provider
    pub async fn set_priority(&self, provider_id: i64, priority: i32) {
        self.provider_priorities.write().await.insert(provider_id, priority);
    }

    /// Set pricing and quota for a provider
    pub async fn set_pricing(&self, provider_id: i64, input_price: f64, output_price: f64, quota: Option<u64>) {
        self.provider_prices.write().await.insert(provider_id, (input_price, output_price));
        self.provider_quotas.write().await.insert(provider_id, quota);
    }

    /// Select a provider based on current strategy
    pub async fn select_provider(&self, available_providers: &[i64]) -> Option<i64> {
        if available_providers.is_empty() {
            return None;
        }

        // Filter to only healthy providers
        let healthy_providers = self.filter_healthy(available_providers).await;
        if healthy_providers.is_empty() {
            tracing::warn!("No healthy providers available, falling back to all providers");
            return self.select_from_list(available_providers).await;
        }

        self.select_from_list(&healthy_providers).await
    }

    pub async fn select_provider_with_strategy(
        &self,
        strategy: LoadBalanceStrategy,
        available_providers: &[i64],
    ) -> Option<i64> {
        if available_providers.is_empty() {
            return None;
        }

        let healthy_providers = self.filter_healthy(available_providers).await;
        if healthy_providers.is_empty() {
            tracing::warn!(
                "No healthy providers available, falling back to all providers (strategy override)"
            );
            return self.select_from_list_with_strategy(strategy, available_providers).await;
        }

        self.select_from_list_with_strategy(strategy, &healthy_providers)
            .await
    }

    /// Filter to only healthy providers
    async fn filter_healthy(&self, providers: &[i64]) -> Vec<i64> {
        let mut healthy = Vec::new();
        for &id in providers {
            if self.health_checker.is_healthy(id).await {
                healthy.push(id);
            }
        }
        healthy
    }

    /// Select from a list based on current strategy
    async fn select_from_list(&self, providers: &[i64]) -> Option<i64> {
        if providers.is_empty() {
            return None;
        }

        let strategy = self.strategy.read().await.clone();
        match strategy {
            LoadBalanceStrategy::RoundRobin => self.select_round_robin(providers),
            LoadBalanceStrategy::LeastConnections => self.select_least_connections(providers).await,
            LoadBalanceStrategy::WeightedRoundRobin { ref weights } => {
                self.select_weighted(providers, weights)
            }
            LoadBalanceStrategy::Random => self.select_random(providers),
            LoadBalanceStrategy::Priority => self.select_by_priority(providers).await,
            LoadBalanceStrategy::LatencyBased => self.select_by_latency(providers).await,
            LoadBalanceStrategy::LowestPrice => self.select_by_price(providers).await,
            LoadBalanceStrategy::QuotaAware => self.select_quota_aware(providers).await,
        }
    }

    async fn select_from_list_with_strategy(
        &self,
        strategy: LoadBalanceStrategy,
        providers: &[i64],
    ) -> Option<i64> {
        if providers.is_empty() {
            return None;
        }

        match strategy {
            LoadBalanceStrategy::RoundRobin => self.select_round_robin(providers),
            LoadBalanceStrategy::LeastConnections => self.select_least_connections(providers).await,
            LoadBalanceStrategy::WeightedRoundRobin { ref weights } => self.select_weighted(providers, weights),
            LoadBalanceStrategy::Random => self.select_random(providers),
            LoadBalanceStrategy::Priority => self.select_by_priority(providers).await,
            LoadBalanceStrategy::LatencyBased => self.select_by_latency(providers).await,
            LoadBalanceStrategy::LowestPrice => self.select_by_price(providers).await,
            LoadBalanceStrategy::QuotaAware => self.select_quota_aware(providers).await,
        }
    }

    /// Round-robin selection
    fn select_round_robin(&self, providers: &[i64]) -> Option<i64> {
        let count = self.round_robin_counter.fetch_add(1, Ordering::Relaxed);
        let index = count % providers.len();
        Some(providers[index])
    }

    /// Least connections selection
    async fn select_least_connections(&self, providers: &[i64]) -> Option<i64> {
        let mut min_connections = u64::MAX;
        let mut selected = None;

        for &id in providers {
            let connections = self.metrics.get_active_connections(id).await;
            if connections < min_connections {
                min_connections = connections;
                selected = Some(id);
            }
        }

        selected
    }

    /// Weighted selection
    fn select_weighted(&self, providers: &[i64], weights: &HashMap<i64, u32>) -> Option<i64> {
        let total_weight: u32 = providers.iter()
            .map(|id| weights.get(id).copied().unwrap_or(1))
            .sum();

        if total_weight == 0 {
            return self.select_random(providers);
        }

        let mut rng_value = rand::thread_rng().gen_range(0..total_weight);
        for &id in providers {
            let weight = weights.get(&id).copied().unwrap_or(1);
            if rng_value < weight {
                return Some(id);
            }
            rng_value -= weight;
        }

        providers.first().copied()
    }

    /// Random selection
    fn select_random(&self, providers: &[i64]) -> Option<i64> {
        if providers.is_empty() {
            return None;
        }
        let index = rand::thread_rng().gen_range(0..providers.len());
        Some(providers[index])
    }

    /// Priority-based selection
    async fn select_by_priority(&self, providers: &[i64]) -> Option<i64> {
        let priorities = self.provider_priorities.read().await;
        providers.iter()
            .max_by_key(|id| priorities.get(*id).copied().unwrap_or(0))
            .copied()
    }

    /// Latency-based selection
    async fn select_by_latency(&self, providers: &[i64]) -> Option<i64> {
        let mut min_latency = f64::MAX;
        let mut selected = None;

        for &id in providers {
            if let Some(latency) = self.health_checker.get_avg_latency(id).await {
                if latency < min_latency {
                    min_latency = latency;
                    selected = Some(id);
                }
            }
        }

        // If no latency data, fall back to round-robin
        selected.or_else(|| self.select_round_robin(providers))
    }

    /// Pricing-based selection (Lowest input price)
    async fn select_by_price(&self, providers: &[i64]) -> Option<i64> {
        let prices = self.provider_prices.read().await;
        let mut min_price = f64::MAX;
        let mut selected = None;

        for &id in providers {
            let price = prices.get(&id).map(|p| p.0).unwrap_or(0.0);
            if price < min_price {
                min_price = price;
                selected = Some(id);
            }
        }

        selected
    }

    /// Quota-aware selection
    async fn select_quota_aware(&self, providers: &[i64]) -> Option<i64> {
        let quotas = self.provider_quotas.read().await;
        
        let mut eligible = Vec::new();
        
        for &id in providers {
            let quota_limit = quotas.get(&id).copied().flatten();
            if let Some(limit) = quota_limit {
                let bytes_used = self.metrics.get_summary(id).await.map(|s| s.tokens_used).unwrap_or(0);
                if bytes_used < limit {
                    eligible.push(id);
                }
            } else {
                // No quota limit set, always eligible
                eligible.push(id);
            }
        }

        if eligible.is_empty() {
            // If all over quota, fall back to selecting by price among all providers
            return self.select_by_price(providers).await;
        }

        // Among eligible providers, select the cheapest one
        self.select_by_price(&eligible).await
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Duration;
    use crate::pool::health::HealthStatus;

    #[tokio::test]
    async fn test_round_robin_cycles_through_providers() {
        let health_checker = Arc::new(HealthChecker::new());
        let metrics = Arc::new(ProviderMetrics::new());
        let lb = LoadBalancer::new(health_checker.clone(), metrics.clone());

        lb.set_strategy(LoadBalanceStrategy::RoundRobin).await;

        for id in [1, 2, 3] {
            health_checker.register_provider(id).await;
            health_checker.set_status(id, HealthStatus::Healthy).await;
        }

        let providers = vec![1, 2, 3];
        let mut selections = Vec::new();
        for _ in 0..6 {
            selections.push(lb.select_provider(&providers).await.unwrap());
        }
        // Round-robin should cycle: all providers should be selected at least once
        assert!(selections.contains(&1));
        assert!(selections.contains(&2));
        assert!(selections.contains(&3));
    }

    #[tokio::test]
    async fn test_random_selects_valid_provider() {
        let health_checker = Arc::new(HealthChecker::new());
        let metrics = Arc::new(ProviderMetrics::new());
        let lb = LoadBalancer::new(health_checker.clone(), metrics.clone());

        lb.set_strategy(LoadBalanceStrategy::Random).await;

        for id in [10, 20, 30] {
            health_checker.register_provider(id).await;
            health_checker.set_status(id, HealthStatus::Healthy).await;
        }

        let providers = vec![10, 20, 30];
        for _ in 0..20 {
            let selected = lb.select_provider(&providers).await;
            assert!(selected.is_some());
            assert!(providers.contains(&selected.unwrap()));
        }
    }

    #[tokio::test]
    async fn test_priority_selects_highest() {
        let health_checker = Arc::new(HealthChecker::new());
        let metrics = Arc::new(ProviderMetrics::new());
        let lb = LoadBalancer::new(health_checker.clone(), metrics.clone());

        lb.set_strategy(LoadBalanceStrategy::Priority).await;
        lb.set_priority(1, 10).await;
        lb.set_priority(2, 50).await;
        lb.set_priority(3, 30).await;

        for id in [1, 2, 3] {
            health_checker.register_provider(id).await;
            health_checker.set_status(id, HealthStatus::Healthy).await;
        }

        // Should always select provider 2 (highest priority=50)
        for _ in 0..5 {
            let selected = lb.select_provider(&[1, 2, 3]).await;
            assert_eq!(selected, Some(2));
        }
    }

    #[tokio::test]
    async fn test_least_connections_selects_idle() {
        let health_checker = Arc::new(HealthChecker::new());
        let metrics = Arc::new(ProviderMetrics::new());
        let lb = LoadBalancer::new(health_checker.clone(), metrics.clone());

        lb.set_strategy(LoadBalanceStrategy::LeastConnections).await;

        for id in [1, 2] {
            health_checker.register_provider(id).await;
            health_checker.set_status(id, HealthStatus::Healthy).await;
            metrics.register_provider(id).await;
        }

        // Simulate 3 active connections on provider 1
        for _ in 0..3 {
            metrics.record_request_start(1).await;
        }
        // Provider 2 has 0 connections
        let selected = lb.select_provider(&[1, 2]).await;
        assert_eq!(selected, Some(2));
    }

    #[tokio::test]
    async fn test_latency_based_selects_fastest() {
        let health_checker = Arc::new(HealthChecker::new());
        let metrics = Arc::new(ProviderMetrics::new());
        let lb = LoadBalancer::new(health_checker.clone(), metrics.clone());

        lb.set_strategy(LoadBalanceStrategy::LatencyBased).await;

        for id in [1, 2] {
            health_checker.register_provider(id).await;
            health_checker.set_status(id, HealthStatus::Healthy).await;
        }

        // Provider 1: high latency, Provider 2: low latency
        health_checker.record_success(1, 500).await;
        health_checker.record_success(2, 50).await;

        let selected = lb.select_provider(&[1, 2]).await;
        assert_eq!(selected, Some(2));
    }

    #[tokio::test]
    async fn test_skips_unhealthy_providers() {
        let health_checker = Arc::new(HealthChecker::new());
        let metrics = Arc::new(ProviderMetrics::new());
        let lb = LoadBalancer::new(health_checker.clone(), metrics.clone());

        lb.set_strategy(LoadBalanceStrategy::RoundRobin).await;

        for id in [1, 2, 3] {
            health_checker.register_provider(id).await;
        }
        health_checker.set_status(1, HealthStatus::Unhealthy).await;
        health_checker.set_status(2, HealthStatus::Healthy).await;
        health_checker.set_status(3, HealthStatus::Healthy).await;

        // Should never select provider 1
        for _ in 0..10 {
            let selected = lb.select_provider(&[1, 2, 3]).await.unwrap();
            assert_ne!(selected, 1);
        }
    }

    #[tokio::test]
    async fn test_empty_providers_returns_none() {
        let health_checker = Arc::new(HealthChecker::new());
        let metrics = Arc::new(ProviderMetrics::new());
        let lb = LoadBalancer::new(health_checker, metrics);

        assert_eq!(lb.select_provider(&[]).await, None);
    }

    #[tokio::test]
    async fn test_lowest_price_selection() {
        let health_checker = Arc::new(HealthChecker::new());
        let metrics = Arc::new(ProviderMetrics::new());
        let lb = LoadBalancer::new(health_checker.clone(), metrics.clone());
        
        lb.set_strategy(LoadBalanceStrategy::LowestPrice).await;
        
        // Add two providers
        lb.set_pricing(1, 10.0, 20.0, None).await;
        lb.set_pricing(2, 5.0, 15.0, None).await;
        
        // Register with health checker to be "healthy"
        health_checker.register_provider(1).await;
        health_checker.register_provider(2).await;
        health_checker.set_status(1, HealthStatus::Healthy).await;
        health_checker.set_status(2, HealthStatus::Healthy).await;
        
        let selected = lb.select_provider(&[1, 2]).await;
        assert_eq!(selected, Some(2)); // Cheapest is 2
    }

    #[tokio::test]
    async fn test_quota_aware_selection() {
        let health_checker = Arc::new(HealthChecker::new());
        let metrics = Arc::new(ProviderMetrics::new());
        let lb = LoadBalancer::new(health_checker.clone(), metrics.clone());
        
        lb.set_strategy(LoadBalanceStrategy::QuotaAware).await;
        
        // Add two providers
        // 1: Cheap but limited
        // 2: Expensive
        lb.set_pricing(1, 1.0, 2.0, Some(100)).await;
        lb.set_pricing(2, 10.0, 20.0, None).await;
        
        health_checker.register_provider(1).await;
        health_checker.register_provider(2).await;
        health_checker.set_status(1, HealthStatus::Healthy).await;
        health_checker.set_status(2, HealthStatus::Healthy).await;
        metrics.register_provider(1).await;
        metrics.register_provider(2).await;
        
        // Initially should select the cheap one
        let selected = lb.select_provider(&[1, 2]).await;
        assert_eq!(selected, Some(1));
        
        // Simulate provider 1 using up quota
        metrics.record_request_end(1, Duration::from_millis(100), true, Some(150)).await;
        
        // Now should select the expensive one
        let selected = lb.select_provider(&[1, 2]).await;
        assert_eq!(selected, Some(2));
        
        // If both are excluded or unavailable, fall back correctly
        // (Scenario: all over quota, should pick cheapest)
        lb.set_pricing(2, 5.0, 10.0, Some(50)).await;
        metrics.record_request_end(2, Duration::from_millis(100), true, Some(60)).await;
        
        let selected = lb.select_provider(&[1, 2]).await;
        assert_eq!(selected, Some(1)); // Both over quota, 1 is cheaper (1.0 vs 5.0)
    }
}

