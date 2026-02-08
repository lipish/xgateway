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

pub use health::HealthStatus;
pub use load_balancer::LoadBalanceStrategy;
pub use pool::{ProviderPool, PoolStatus};
pub use manager::PoolManager;
pub use rate_limiter::RateLimitResult;
