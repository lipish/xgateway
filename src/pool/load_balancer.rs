//! Load Balancer Module
//!
//! Provides multiple load balancing strategies for distributing requests
//! across multiple providers.

use std::collections::HashMap;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;
use tokio::sync::RwLock;
use serde::{Deserialize, Serialize};

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

        let mut rng_value = rand_simple() % total_weight;
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
        let index = rand_simple() as usize % providers.len();
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
}

/// Simple random number generator (not cryptographically secure)
fn rand_simple() -> u32 {
    use std::time::SystemTime;
    let duration = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .unwrap_or_default();
    ((duration.as_nanos() % u32::MAX as u128) as u32)
        .wrapping_mul(1103515245)
        .wrapping_add(12345)
}

