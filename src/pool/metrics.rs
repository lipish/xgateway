//! Provider Metrics Module
//!
//! Tracks request metrics for each provider including:
//! - Request counts
//! - Latency statistics
//! - Error rates
//! - Active connections

use std::collections::HashMap;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::RwLock;
use serde::{Deserialize, Serialize};

/// Metrics for a single request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RequestMetrics {
    pub provider_id: i64,
    pub latency_ms: u64,
    pub success: bool,
    pub tokens_used: Option<u64>,
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

/// Aggregated metrics for a provider
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ProviderMetricsSummary {
    pub total_requests: u64,
    pub successful_requests: u64,
    pub failed_requests: u64,
    pub avg_latency_ms: f64,
    pub p50_latency_ms: u64,
    pub p95_latency_ms: u64,
    pub p99_latency_ms: u64,
    pub active_connections: u64,
    pub tokens_used: u64,
    pub requests_per_second: f64,
}

/// Internal state for tracking provider metrics
struct ProviderMetricsState {
    total_requests: AtomicU64,
    successful_requests: AtomicU64,
    failed_requests: AtomicU64,
    active_connections: AtomicU64,
    tokens_used: AtomicU64,
    latencies: RwLock<Vec<u64>>,
    start_time: Instant,
}

impl Default for ProviderMetricsState {
    fn default() -> Self {
        Self {
            total_requests: AtomicU64::new(0),
            successful_requests: AtomicU64::new(0),
            failed_requests: AtomicU64::new(0),
            active_connections: AtomicU64::new(0),
            tokens_used: AtomicU64::new(0),
            latencies: RwLock::new(Vec::new()),
            start_time: Instant::now(),
        }
    }
}

/// Provider metrics collector
pub struct ProviderMetrics {
    states: Arc<RwLock<HashMap<i64, ProviderMetricsState>>>,
    max_latency_samples: usize,
}

impl ProviderMetrics {
    /// Create a new metrics collector
    pub fn new() -> Self {
        Self {
            states: Arc::new(RwLock::new(HashMap::new())),
            max_latency_samples: 1000,
        }
    }

    /// Register a provider for metrics collection
    pub async fn register_provider(&self, provider_id: i64) {
        let mut states = self.states.write().await;
        states.entry(provider_id).or_insert_with(ProviderMetricsState::default);
    }

    /// Record a request start (increment active connections)
    pub async fn record_request_start(&self, provider_id: i64) {
        let states = self.states.read().await;
        if let Some(state) = states.get(&provider_id) {
            state.active_connections.fetch_add(1, Ordering::Relaxed);
        }
    }

    /// Record a request completion
    pub async fn record_request_end(
        &self,
        provider_id: i64,
        latency: Duration,
        success: bool,
        tokens: Option<u64>,
    ) {
        let states = self.states.read().await;
        if let Some(state) = states.get(&provider_id) {
            state.active_connections.fetch_sub(1, Ordering::Relaxed);
            state.total_requests.fetch_add(1, Ordering::Relaxed);

            if success {
                state.successful_requests.fetch_add(1, Ordering::Relaxed);
            } else {
                state.failed_requests.fetch_add(1, Ordering::Relaxed);
            }

            if let Some(t) = tokens {
                state.tokens_used.fetch_add(t, Ordering::Relaxed);
            }

            // Record latency sample
            let latency_ms = latency.as_millis() as u64;
            let mut latencies = state.latencies.write().await;
            if latencies.len() >= self.max_latency_samples {
                latencies.remove(0);
            }
            latencies.push(latency_ms);
        }
    }

    /// Get active connections for a provider
    pub async fn get_active_connections(&self, provider_id: i64) -> u64 {
        let states = self.states.read().await;
        states.get(&provider_id)
            .map(|s| s.active_connections.load(Ordering::Relaxed))
            .unwrap_or(0)
    }

    /// Get metrics summary for a provider
    pub async fn get_summary(&self, provider_id: i64) -> Option<ProviderMetricsSummary> {
        let states = self.states.read().await;
        let state = states.get(&provider_id)?;

        let total = state.total_requests.load(Ordering::Relaxed);
        let successful = state.successful_requests.load(Ordering::Relaxed);
        let failed = state.failed_requests.load(Ordering::Relaxed);
        let active = state.active_connections.load(Ordering::Relaxed);
        let tokens = state.tokens_used.load(Ordering::Relaxed);

        let latencies = state.latencies.read().await;
        let (avg, p50, p95, p99) = calculate_latency_stats(&latencies);

        let elapsed = state.start_time.elapsed().as_secs_f64();
        let rps = if elapsed > 0.0 { total as f64 / elapsed } else { 0.0 };

        Some(ProviderMetricsSummary {
            total_requests: total,
            successful_requests: successful,
            failed_requests: failed,
            avg_latency_ms: avg,
            p50_latency_ms: p50,
            p95_latency_ms: p95,
            p99_latency_ms: p99,
            active_connections: active,
            tokens_used: tokens,
            requests_per_second: rps,
        })
    }

    /// Get all provider summaries
    pub async fn get_all_summaries(&self) -> HashMap<i64, ProviderMetricsSummary> {
        let states = self.states.read().await;
        let mut summaries = HashMap::new();
        for &id in states.keys() {
            if let Some(summary) = self.get_summary(id).await {
                summaries.insert(id, summary);
            }
        }
        summaries
    }

    /// Reset metrics for a provider
    pub async fn reset(&self, provider_id: i64) {
        let mut states = self.states.write().await;
        if let Some(state) = states.get_mut(&provider_id) {
            *state = ProviderMetricsState::default();
        }
    }

    /// Reset all metrics
    pub async fn reset_all(&self) {
        let mut states = self.states.write().await;
        for state in states.values_mut() {
            *state = ProviderMetricsState::default();
        }
    }
}

impl Default for ProviderMetrics {
    fn default() -> Self {
        Self::new()
    }
}

/// Calculate latency statistics from samples
fn calculate_latency_stats(latencies: &[u64]) -> (f64, u64, u64, u64) {
    if latencies.is_empty() {
        return (0.0, 0, 0, 0);
    }

    let mut sorted = latencies.to_vec();
    sorted.sort_unstable();

    let sum: u64 = sorted.iter().sum();
    let avg = sum as f64 / sorted.len() as f64;

    let p50 = percentile(&sorted, 50);
    let p95 = percentile(&sorted, 95);
    let p99 = percentile(&sorted, 99);

    (avg, p50, p95, p99)
}

/// Calculate percentile value
fn percentile(sorted: &[u64], pct: u32) -> u64 {
    if sorted.is_empty() {
        return 0;
    }
    let idx = ((pct as f64 / 100.0) * (sorted.len() - 1) as f64) as usize;
    sorted[idx.min(sorted.len() - 1)]
}

impl ProviderMetricsSummary {
    /// Calculate success rate
    pub fn success_rate(&self) -> f64 {
        if self.total_requests == 0 {
            1.0
        } else {
            self.successful_requests as f64 / self.total_requests as f64
        }
    }

    /// Calculate error rate
    pub fn error_rate(&self) -> f64 {
        if self.total_requests == 0 {
            0.0
        } else {
            self.failed_requests as f64 / self.total_requests as f64
        }
    }
}

