//! Failover Manager Module
//!
//! Provides automatic failover and retry mechanisms for provider failures.

use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::RwLock;
use serde::{Deserialize, Serialize};

use super::circuit_breaker::CircuitBreaker;
use super::health::HealthChecker;

/// Retry condition types
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum RetryCondition {
    /// Network connection error
    NetworkError,
    /// Rate limit exceeded
    RateLimitError,
    /// Server error (5xx)
    ServerError,
    /// Request timeout
    TimeoutError,
    /// Quota exceeded
    QuotaExceeded,
}

/// Backoff strategy for retries
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum BackoffStrategy {
    /// Fixed delay between retries
    Fixed { delay_ms: u64 },
    /// Exponential backoff
    Exponential { base_ms: u64, max_ms: u64, multiplier: f64 },
    /// Linear backoff
    Linear { initial_ms: u64, increment_ms: u64, max_ms: u64 },
}

impl Default for BackoffStrategy {
    fn default() -> Self {
        Self::Exponential {
            base_ms: 100,
            max_ms: 10000,
            multiplier: 2.0,
        }
    }
}

impl BackoffStrategy {
    /// Calculate delay for a given attempt number
    pub fn delay_for_attempt(&self, attempt: u32) -> Duration {
        match self {
            BackoffStrategy::Fixed { delay_ms } => Duration::from_millis(*delay_ms),
            BackoffStrategy::Exponential { base_ms, max_ms, multiplier } => {
                let delay = (*base_ms as f64) * multiplier.powi(attempt as i32);
                Duration::from_millis(delay.min(*max_ms as f64) as u64)
            }
            BackoffStrategy::Linear { initial_ms, increment_ms, max_ms } => {
                let delay = initial_ms + (increment_ms * attempt as u64);
                Duration::from_millis(delay.min(*max_ms))
            }
        }
    }
}

/// Configuration for failover behavior
#[derive(Debug, Clone)]
pub struct FailoverConfig {
    /// Maximum number of retries
    pub max_retries: u32,
    /// Conditions that trigger retry
    pub retry_conditions: Vec<RetryCondition>,
    /// Backoff strategy
    pub backoff_strategy: BackoffStrategy,
    /// Whether to try fallback providers
    pub enable_fallback: bool,
    /// Maximum number of fallback attempts
    pub max_fallback_attempts: u32,
}

impl Default for FailoverConfig {
    fn default() -> Self {
        Self {
            max_retries: 3,
            retry_conditions: vec![
                RetryCondition::NetworkError,
                RetryCondition::ServerError,
                RetryCondition::TimeoutError,
                RetryCondition::RateLimitError,
            ],
            backoff_strategy: BackoffStrategy::default(),
            enable_fallback: true,
            max_fallback_attempts: 3,
        }
    }
}

/// Failover manager for handling provider failures
pub struct FailoverManager {
    config: FailoverConfig,
    health_checker: Arc<HealthChecker>,
    circuit_breakers: Arc<RwLock<HashMap<i64, CircuitBreaker>>>,
    fallback_chains: Arc<RwLock<HashMap<i64, Vec<i64>>>>,
}

impl FailoverManager {
    /// Create a new failover manager
    pub fn new(health_checker: Arc<HealthChecker>) -> Self {
        Self::with_config(health_checker, FailoverConfig::default())
    }

    /// Create a new failover manager with custom configuration
    pub fn with_config(health_checker: Arc<HealthChecker>, config: FailoverConfig) -> Self {
        Self {
            config,
            health_checker,
            circuit_breakers: Arc::new(RwLock::new(HashMap::new())),
            fallback_chains: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Register a circuit breaker for a provider
    pub async fn register_provider(&self, provider_id: i64) {
        let mut breakers = self.circuit_breakers.write().await;
        breakers.entry(provider_id).or_insert_with(CircuitBreaker::new);
        tracing::info!("Registered circuit breaker for provider {}", provider_id);
    }

    /// Set fallback chain for a provider
    pub async fn set_fallback_chain(&self, provider_id: i64, fallback_ids: Vec<i64>) {
        self.fallback_chains.write().await.insert(provider_id, fallback_ids);
        tracing::info!("Set fallback chain for provider {}: {:?}", provider_id, 
            self.fallback_chains.read().await.get(&provider_id));
    }

    /// Get fallback chain for a provider
    pub async fn get_fallback_chain(&self, provider_id: i64) -> Vec<i64> {
        self.fallback_chains.read().await
            .get(&provider_id)
            .cloned()
            .unwrap_or_default()
    }

    /// Check if a provider's circuit breaker allows requests
    pub async fn is_provider_available(&self, provider_id: i64) -> bool {
        let breakers = self.circuit_breakers.read().await;
        if let Some(breaker) = breakers.get(&provider_id) {
            breaker.is_allowed().await
        } else {
            true // If no circuit breaker, allow
        }
    }

    /// Record a successful request
    pub async fn record_success(&self, provider_id: i64) {
        let breakers = self.circuit_breakers.read().await;
        if let Some(breaker) = breakers.get(&provider_id) {
            breaker.record_success().await;
        }
    }

    /// Record a failed request
    pub async fn record_failure(&self, provider_id: i64, condition: Option<RetryCondition>) {
        let breakers = self.circuit_breakers.read().await;
        if let Some(breaker) = breakers.get(&provider_id) {
            breaker.record_failure().await;
        }
        tracing::warn!(
            "Provider {} failure recorded, condition: {:?}",
            provider_id, condition
        );
    }

    /// Check if an error should trigger a retry
    pub fn should_retry(&self, condition: &RetryCondition, attempt: u32) -> bool {
        if attempt >= self.config.max_retries {
            return false;
        }
        self.config.retry_conditions.contains(condition)
    }

    /// Get delay for retry attempt
    pub fn get_retry_delay(&self, attempt: u32) -> Duration {
        self.config.backoff_strategy.delay_for_attempt(attempt)
    }

    /// Find next available provider from fallback chain
    pub async fn find_fallback(&self, failed_provider_id: i64) -> Option<i64> {
        if !self.config.enable_fallback {
            return None;
        }

        let chain = self.get_fallback_chain(failed_provider_id).await;
        for provider_id in chain {
            if self.is_provider_available(provider_id).await
               && self.health_checker.is_healthy(provider_id).await {
                tracing::info!(
                    "Found fallback provider {} for failed provider {}",
                    provider_id, failed_provider_id
                );
                return Some(provider_id);
            }
        }
        None
    }

    /// Get all available providers (circuit breaker allows and healthy)
    pub async fn get_available_providers(&self, provider_ids: &[i64]) -> Vec<i64> {
        let mut available = Vec::new();
        for &id in provider_ids {
            if self.is_provider_available(id).await
               && self.health_checker.is_healthy(id).await {
                available.push(id);
            }
        }
        available
    }

    /// Get configuration
    pub fn config(&self) -> &FailoverConfig {
        &self.config
    }

    /// Reset circuit breaker for a provider
    pub async fn reset_circuit_breaker(&self, provider_id: i64) {
        let breakers = self.circuit_breakers.read().await;
        if let Some(breaker) = breakers.get(&provider_id) {
            breaker.reset().await;
            tracing::info!("Reset circuit breaker for provider {}", provider_id);
        }
    }

    /// Get all circuit states
    pub async fn get_all_circuit_states(&self) -> HashMap<i64, super::circuit_breaker::CircuitState> {
        let breakers = self.circuit_breakers.read().await;
        let mut states = HashMap::new();
        for (id, breaker) in breakers.iter() {
            states.insert(*id, breaker.state().await);
        }
        states
    }
}

impl Default for FailoverManager {
    fn default() -> Self {
        Self::new(Arc::new(HealthChecker::new()))
    }
}

