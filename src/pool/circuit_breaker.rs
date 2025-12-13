//! Circuit Breaker Module
//!
//! Implements the circuit breaker pattern to prevent cascading failures.
//! States: Closed -> Open -> Half-Open -> Closed

use std::sync::atomic::{AtomicU32, AtomicU64, Ordering};
use std::time::{Duration, Instant};
use tokio::sync::RwLock;
use serde::{Deserialize, Serialize};

/// Circuit breaker state
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum CircuitState {
    /// Circuit is closed, requests are allowed
    Closed,
    /// Circuit is open, requests are blocked
    Open,
    /// Circuit is half-open, testing if service recovered
    HalfOpen,
}

impl Default for CircuitState {
    fn default() -> Self {
        Self::Closed
    }
}

/// Configuration for circuit breaker
#[derive(Debug, Clone)]
pub struct CircuitBreakerConfig {
    /// Number of failures before opening the circuit
    pub failure_threshold: u32,
    /// Duration to keep circuit open before trying half-open
    pub recovery_timeout: Duration,
    /// Number of successes needed in half-open state to close circuit
    pub success_threshold: u32,
    /// Time window for counting failures
    pub failure_window: Duration,
}

impl Default for CircuitBreakerConfig {
    fn default() -> Self {
        Self {
            failure_threshold: 5,
            recovery_timeout: Duration::from_secs(30),
            success_threshold: 3,
            failure_window: Duration::from_secs(60),
        }
    }
}

/// Circuit breaker for a single provider
pub struct CircuitBreaker {
    config: CircuitBreakerConfig,
    state: RwLock<CircuitState>,
    failure_count: AtomicU32,
    success_count: AtomicU32,
    last_failure_time: RwLock<Option<Instant>>,
    last_state_change: RwLock<Instant>,
    total_requests: AtomicU64,
    total_failures: AtomicU64,
}

impl CircuitBreaker {
    /// Create a new circuit breaker with default configuration
    pub fn new() -> Self {
        Self::with_config(CircuitBreakerConfig::default())
    }

    /// Create a new circuit breaker with custom configuration
    pub fn with_config(config: CircuitBreakerConfig) -> Self {
        Self {
            config,
            state: RwLock::new(CircuitState::Closed),
            failure_count: AtomicU32::new(0),
            success_count: AtomicU32::new(0),
            last_failure_time: RwLock::new(None),
            last_state_change: RwLock::new(Instant::now()),
            total_requests: AtomicU64::new(0),
            total_failures: AtomicU64::new(0),
        }
    }

    /// Check if request is allowed
    pub async fn is_allowed(&self) -> bool {
        let state = *self.state.read().await;
        match state {
            CircuitState::Closed => true,
            CircuitState::Open => {
                // Check if recovery timeout has passed
                let last_change = *self.last_state_change.read().await;
                if last_change.elapsed() >= self.config.recovery_timeout {
                    // Transition to half-open
                    self.transition_to(CircuitState::HalfOpen).await;
                    true
                } else {
                    false
                }
            }
            CircuitState::HalfOpen => true,
        }
    }

    /// Get current state
    pub async fn state(&self) -> CircuitState {
        *self.state.read().await
    }

    /// Record a successful request
    pub async fn record_success(&self) {
        self.total_requests.fetch_add(1, Ordering::Relaxed);
        let state = *self.state.read().await;

        match state {
            CircuitState::HalfOpen => {
                let count = self.success_count.fetch_add(1, Ordering::Relaxed) + 1;
                if count >= self.config.success_threshold {
                    self.transition_to(CircuitState::Closed).await;
                    tracing::info!("Circuit breaker closed after {} successes", count);
                }
            }
            CircuitState::Closed => {
                // Reset failure count on success
                self.failure_count.store(0, Ordering::Relaxed);
            }
            CircuitState::Open => {
                // Shouldn't happen, but handle gracefully
            }
        }
    }

    /// Record a failed request
    pub async fn record_failure(&self) {
        self.total_requests.fetch_add(1, Ordering::Relaxed);
        self.total_failures.fetch_add(1, Ordering::Relaxed);
        let state = *self.state.read().await;

        match state {
            CircuitState::Closed => {
                // Check if we should reset failure window
                let should_reset = {
                    let last_failure = self.last_failure_time.read().await;
                    last_failure.map(|t| t.elapsed() >= self.config.failure_window).unwrap_or(true)
                };

                if should_reset {
                    self.failure_count.store(1, Ordering::Relaxed);
                } else {
                    let count = self.failure_count.fetch_add(1, Ordering::Relaxed) + 1;
                    if count >= self.config.failure_threshold {
                        self.transition_to(CircuitState::Open).await;
                        tracing::warn!("Circuit breaker opened after {} failures", count);
                    }
                }
                *self.last_failure_time.write().await = Some(Instant::now());
            }
            CircuitState::HalfOpen => {
                // Single failure in half-open state reopens the circuit
                self.transition_to(CircuitState::Open).await;
                tracing::warn!("Circuit breaker reopened from half-open state");
            }
            CircuitState::Open => {}
        }
    }

    /// Transition to a new state
    async fn transition_to(&self, new_state: CircuitState) {
        let mut state = self.state.write().await;
        let old_state = *state;
        *state = new_state;
        *self.last_state_change.write().await = Instant::now();

        // Reset counters on state transition
        match new_state {
            CircuitState::Closed => {
                self.failure_count.store(0, Ordering::Relaxed);
                self.success_count.store(0, Ordering::Relaxed);
            }
            CircuitState::HalfOpen => {
                self.success_count.store(0, Ordering::Relaxed);
            }
            CircuitState::Open => {
                self.failure_count.store(0, Ordering::Relaxed);
            }
        }

        tracing::info!("Circuit breaker state changed: {:?} -> {:?}", old_state, new_state);
    }

    /// Force open the circuit
    pub async fn force_open(&self) {
        self.transition_to(CircuitState::Open).await;
        tracing::warn!("Circuit breaker force opened");
    }

    /// Force close the circuit
    pub async fn force_close(&self) {
        self.transition_to(CircuitState::Closed).await;
        tracing::info!("Circuit breaker force closed");
    }

    /// Reset the circuit breaker
    pub async fn reset(&self) {
        self.transition_to(CircuitState::Closed).await;
        self.total_requests.store(0, Ordering::Relaxed);
        self.total_failures.store(0, Ordering::Relaxed);
        *self.last_failure_time.write().await = None;
        tracing::info!("Circuit breaker reset");
    }

    /// Get statistics
    pub fn stats(&self) -> CircuitBreakerStats {
        CircuitBreakerStats {
            total_requests: self.total_requests.load(Ordering::Relaxed),
            total_failures: self.total_failures.load(Ordering::Relaxed),
            failure_count: self.failure_count.load(Ordering::Relaxed),
            success_count: self.success_count.load(Ordering::Relaxed),
        }
    }

    /// Get configuration
    pub fn config(&self) -> &CircuitBreakerConfig {
        &self.config
    }
}

impl Default for CircuitBreaker {
    fn default() -> Self {
        Self::new()
    }
}

/// Statistics for circuit breaker
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CircuitBreakerStats {
    pub total_requests: u64,
    pub total_failures: u64,
    pub failure_count: u32,
    pub success_count: u32,
}

impl CircuitBreakerStats {
    pub fn failure_rate(&self) -> f64 {
        if self.total_requests == 0 {
            0.0
        } else {
            self.total_failures as f64 / self.total_requests as f64
        }
    }
}

