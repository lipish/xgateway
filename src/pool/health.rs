//! Health Checker Module
//!
//! Provides health checking functionality for providers, including:
//! - Periodic health checks
//! - Health status tracking
//! - Provider availability detection

use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::RwLock;
use serde::{Deserialize, Serialize};

/// Health status of a provider
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum HealthStatus {
    /// Provider is healthy and accepting requests
    Healthy,
    /// Provider is degraded but still functional
    Degraded,
    /// Provider is unhealthy and should not receive requests
    Unhealthy,
    /// Provider health is unknown (not yet checked)
    Unknown,
}

impl Default for HealthStatus {
    fn default() -> Self {
        Self::Unknown
    }
}

/// Result of a health check
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthCheckResult {
    pub provider_id: i64,
    pub status: HealthStatus,
    pub latency_ms: Option<u64>,
    pub error_message: Option<String>,
    pub checked_at: chrono::DateTime<chrono::Utc>,
}

/// Internal health state for a provider
#[derive(Debug, Clone)]
struct ProviderHealthState {
    status: HealthStatus,
    last_check: Option<Instant>,
    last_success: Option<Instant>,
    consecutive_failures: u32,
    consecutive_successes: u32,
    avg_latency_ms: f64,
    check_count: u64,
}

impl Default for ProviderHealthState {
    fn default() -> Self {
        Self {
            status: HealthStatus::Unknown,
            last_check: None,
            last_success: None,
            consecutive_failures: 0,
            consecutive_successes: 0,
            avg_latency_ms: 0.0,
            check_count: 0,
        }
    }
}

/// Configuration for health checker
#[derive(Debug, Clone)]
pub struct HealthCheckerConfig {
    /// Interval between health checks
    pub check_interval: Duration,
    /// Timeout for health check requests
    pub timeout: Duration,
    /// Number of consecutive failures before marking unhealthy
    pub unhealthy_threshold: u32,
    /// Number of consecutive successes before marking healthy again
    pub healthy_threshold: u32,
    /// Latency threshold (ms) for degraded status
    pub degraded_latency_threshold_ms: u64,
}

impl Default for HealthCheckerConfig {
    fn default() -> Self {
        Self {
            check_interval: Duration::from_secs(30),
            timeout: Duration::from_secs(10),
            unhealthy_threshold: 3,
            healthy_threshold: 2,
            degraded_latency_threshold_ms: 5000,
        }
    }
}

/// Health checker for managing provider health
pub struct HealthChecker {
    config: HealthCheckerConfig,
    states: Arc<RwLock<HashMap<i64, ProviderHealthState>>>,
}

impl HealthChecker {
    /// Create a new health checker with default configuration
    pub fn new() -> Self {
        Self::with_config(HealthCheckerConfig::default())
    }

    /// Create a new health checker with custom configuration
    pub fn with_config(config: HealthCheckerConfig) -> Self {
        Self {
            config,
            states: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Register a provider for health checking
    pub async fn register_provider(&self, provider_id: i64) {
        let mut states = self.states.write().await;
        states.entry(provider_id).or_insert_with(ProviderHealthState::default);
        tracing::info!("Registered provider {} for health checking", provider_id);
    }

    /// Unregister a provider from health checking
    pub async fn unregister_provider(&self, provider_id: i64) {
        let mut states = self.states.write().await;
        states.remove(&provider_id);
        tracing::info!("Unregistered provider {} from health checking", provider_id);
    }

    /// Check if a provider is healthy
    pub async fn is_healthy(&self, provider_id: i64) -> bool {
        let states = self.states.read().await;
        states.get(&provider_id)
            .map(|s| s.status == HealthStatus::Healthy || s.status == HealthStatus::Degraded)
            .unwrap_or(false)
    }

    /// Get the health status of a provider
    pub async fn get_status(&self, provider_id: i64) -> HealthStatus {
        let states = self.states.read().await;
        states.get(&provider_id)
            .map(|s| s.status)
            .unwrap_or(HealthStatus::Unknown)
    }

    /// Get all provider health statuses
    pub async fn get_all_statuses(&self) -> HashMap<i64, HealthStatus> {
        let states = self.states.read().await;
        states.iter()
            .map(|(id, state)| (*id, state.status))
            .collect()
    }

    /// Get healthy provider IDs
    pub async fn get_healthy_providers(&self) -> Vec<i64> {
        let states = self.states.read().await;
        states.iter()
            .filter(|(_, state)| state.status == HealthStatus::Healthy || state.status == HealthStatus::Degraded)
            .map(|(id, _)| *id)
            .collect()
    }

    /// Set health status for a provider
    pub async fn set_status(&self, provider_id: i64, status: HealthStatus) {
        let mut states = self.states.write().await;
        if let Some(state) = states.get_mut(&provider_id) {
            state.status = status;
            tracing::debug!("Set provider {} status to {:?}", provider_id, status);
        } else {
            // Register provider if not exists
            let mut new_state = ProviderHealthState::default();
            new_state.status = status;
            states.insert(provider_id, new_state);
        }
    }

    /// Record a successful request for a provider
    pub async fn record_success(&self, provider_id: i64, latency_ms: u64) {
        let mut states = self.states.write().await;
        if let Some(state) = states.get_mut(&provider_id) {
            state.consecutive_successes += 1;
            state.consecutive_failures = 0;
            state.last_success = Some(Instant::now());
            state.last_check = Some(Instant::now());
            state.check_count += 1;

            // Update average latency with exponential moving average
            let alpha = 0.2;
            state.avg_latency_ms = alpha * (latency_ms as f64) + (1.0 - alpha) * state.avg_latency_ms;

            // Update status based on latency
            if latency_ms > self.config.degraded_latency_threshold_ms {
                state.status = HealthStatus::Degraded;
            } else if state.consecutive_successes >= self.config.healthy_threshold {
                state.status = HealthStatus::Healthy;
            }

            tracing::debug!(
                "Provider {} success recorded: latency={}ms, status={:?}",
                provider_id, latency_ms, state.status
            );
        }
    }

    /// Record a failed request for a provider
    pub async fn record_failure(&self, provider_id: i64, error: Option<&str>) {
        let mut states = self.states.write().await;
        if let Some(state) = states.get_mut(&provider_id) {
            state.consecutive_failures += 1;
            state.consecutive_successes = 0;
            state.last_check = Some(Instant::now());
            state.check_count += 1;

            // Update status based on failure count
            if state.consecutive_failures >= self.config.unhealthy_threshold {
                state.status = HealthStatus::Unhealthy;
            } else if state.consecutive_failures >= 1 {
                state.status = HealthStatus::Degraded;
            }

            tracing::warn!(
                "Provider {} failure recorded: consecutive_failures={}, error={:?}, status={:?}",
                provider_id, state.consecutive_failures, error, state.status
            );
        }
    }

    /// Get average latency for a provider
    pub async fn get_avg_latency(&self, provider_id: i64) -> Option<f64> {
        let states = self.states.read().await;
        states.get(&provider_id).map(|s| s.avg_latency_ms)
    }

    /// Get detailed health info for a provider
    pub async fn get_health_info(&self, provider_id: i64) -> Option<HealthCheckResult> {
        let states = self.states.read().await;
        states.get(&provider_id).map(|state| {
            HealthCheckResult {
                provider_id,
                status: state.status,
                latency_ms: if state.avg_latency_ms > 0.0 { Some(state.avg_latency_ms as u64) } else { None },
                error_message: None,
                checked_at: chrono::Utc::now(),
            }
        })
    }

    /// Reset health status for a provider
    pub async fn reset(&self, provider_id: i64) {
        let mut states = self.states.write().await;
        if let Some(state) = states.get_mut(&provider_id) {
            *state = ProviderHealthState::default();
            tracing::info!("Reset health state for provider {}", provider_id);
        }
    }

    /// Get configuration
    pub fn config(&self) -> &HealthCheckerConfig {
        &self.config
    }
}

impl Default for HealthChecker {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_register_and_initial_status() {
        let hc = HealthChecker::new();
        hc.register_provider(1).await;

        assert_eq!(hc.get_status(1).await, HealthStatus::Unknown);
        // Unknown providers are not "healthy"
        assert!(!hc.is_healthy(1).await);
    }

    #[tokio::test]
    async fn test_unregistered_provider_is_unknown() {
        let hc = HealthChecker::new();
        assert_eq!(hc.get_status(999).await, HealthStatus::Unknown);
        assert!(!hc.is_healthy(999).await);
    }

    #[tokio::test]
    async fn test_set_status() {
        let hc = HealthChecker::new();
        hc.register_provider(1).await;
        hc.set_status(1, HealthStatus::Healthy).await;
        assert_eq!(hc.get_status(1).await, HealthStatus::Healthy);
        assert!(hc.is_healthy(1).await);
    }

    #[tokio::test]
    async fn test_becomes_healthy_after_consecutive_successes() {
        let config = HealthCheckerConfig {
            healthy_threshold: 2,
            unhealthy_threshold: 3,
            degraded_latency_threshold_ms: 5000,
            ..Default::default()
        };
        let hc = HealthChecker::with_config(config);
        hc.register_provider(1).await;

        // Single success should not make healthy (threshold is 2)
        hc.record_success(1, 100).await;
        // After 1 success: consecutive_successes=1 < threshold=2, so not yet Healthy
        // (initially Unknown, single success doesn't reach threshold)
        let status = hc.get_status(1).await;
        assert_ne!(status, HealthStatus::Healthy);

        // Second success should meet threshold
        hc.record_success(1, 100).await;
        assert_eq!(hc.get_status(1).await, HealthStatus::Healthy);
    }

    #[tokio::test]
    async fn test_becomes_degraded_on_high_latency() {
        let config = HealthCheckerConfig {
            degraded_latency_threshold_ms: 500,
            healthy_threshold: 1,
            ..Default::default()
        };
        let hc = HealthChecker::with_config(config);
        hc.register_provider(1).await;

        // Success but with high latency
        hc.record_success(1, 1000).await;
        assert_eq!(hc.get_status(1).await, HealthStatus::Degraded);
        // Degraded is still considered "healthy" for routing
        assert!(hc.is_healthy(1).await);
    }

    #[tokio::test]
    async fn test_becomes_unhealthy_after_consecutive_failures() {
        let config = HealthCheckerConfig {
            unhealthy_threshold: 3,
            ..Default::default()
        };
        let hc = HealthChecker::with_config(config);
        hc.register_provider(1).await;

        hc.record_failure(1, Some("error 1")).await;
        assert_eq!(hc.get_status(1).await, HealthStatus::Degraded);

        hc.record_failure(1, Some("error 2")).await;
        assert_eq!(hc.get_status(1).await, HealthStatus::Degraded);

        hc.record_failure(1, Some("error 3")).await;
        assert_eq!(hc.get_status(1).await, HealthStatus::Unhealthy);
        assert!(!hc.is_healthy(1).await);
    }

    #[tokio::test]
    async fn test_success_resets_failure_count() {
        let config = HealthCheckerConfig {
            unhealthy_threshold: 3,
            healthy_threshold: 1,
            degraded_latency_threshold_ms: 5000,
            ..Default::default()
        };
        let hc = HealthChecker::with_config(config);
        hc.register_provider(1).await;

        hc.record_failure(1, None).await;
        hc.record_failure(1, None).await;
        // 2 failures, still degraded
        assert_eq!(hc.get_status(1).await, HealthStatus::Degraded);

        // A success resets the counter
        hc.record_success(1, 100).await;
        assert_eq!(hc.get_status(1).await, HealthStatus::Healthy);

        // Now need 3 more failures to become unhealthy
        hc.record_failure(1, None).await;
        hc.record_failure(1, None).await;
        assert_ne!(hc.get_status(1).await, HealthStatus::Unhealthy);
    }

    #[tokio::test]
    async fn test_unregister_provider() {
        let hc = HealthChecker::new();
        hc.register_provider(1).await;
        hc.set_status(1, HealthStatus::Healthy).await;
        assert!(hc.is_healthy(1).await);

        hc.unregister_provider(1).await;
        assert!(!hc.is_healthy(1).await);
        assert_eq!(hc.get_status(1).await, HealthStatus::Unknown);
    }

    #[tokio::test]
    async fn test_get_healthy_providers() {
        let hc = HealthChecker::new();
        hc.register_provider(1).await;
        hc.register_provider(2).await;
        hc.register_provider(3).await;
        hc.set_status(1, HealthStatus::Healthy).await;
        hc.set_status(2, HealthStatus::Unhealthy).await;
        hc.set_status(3, HealthStatus::Degraded).await;

        let healthy = hc.get_healthy_providers().await;
        assert!(healthy.contains(&1));
        assert!(!healthy.contains(&2));
        assert!(healthy.contains(&3)); // Degraded counts as healthy
    }

    #[tokio::test]
    async fn test_avg_latency_tracking() {
        let hc = HealthChecker::new();
        hc.register_provider(1).await;

        hc.record_success(1, 100).await;
        let avg = hc.get_avg_latency(1).await.unwrap();
        assert!(avg > 0.0);

        hc.record_success(1, 200).await;
        let avg2 = hc.get_avg_latency(1).await.unwrap();
        // Should be a moving average, not simply 150
        assert!(avg2 > avg);
    }
}

