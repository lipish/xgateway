//! Multi-Provider Pool Management Module
//!
//! This module provides:
//! - Health checking for providers
//! - Circuit breaker pattern
//! - Load balancing strategies
//! - Failover management
//! - Provider pool management

pub mod health;
pub mod circuit_breaker;
pub mod load_balancer;
pub mod failover;
pub mod pool;
pub mod metrics;
pub mod service;
pub mod manager;
pub mod rate_limiter;

pub use health::{HealthChecker, HealthStatus, HealthCheckResult};
pub use circuit_breaker::{CircuitBreaker, CircuitBreakerConfig, CircuitState};
pub use load_balancer::{LoadBalancer, LoadBalanceStrategy};
pub use failover::{FailoverManager, FailoverConfig};
pub use pool::{ProviderPool, ProviderInstance, PoolStatus};
pub use metrics::{ProviderMetrics, RequestMetrics};
pub use service::{MultiProviderService, MultiProviderConfig};
pub use manager::{PoolManager, PoolStatusSummary};
pub use rate_limiter::{RateLimiter, RateLimitConfig, RateLimitResult};

