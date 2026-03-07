//! Multi-Provider Pool Management Module
//!
//! This module provides:
//! - Health checking for providers
//! - Circuit breaker pattern
//! - Load balancing strategies
//! - Failover management
//! - Provider pool management

pub mod circuit_breaker;
pub mod failover;
pub mod health;
pub mod load_balancer;
pub mod manager;
pub mod metrics;
pub mod pool;
pub mod rate_limiter;
pub mod service;

pub use health::HealthStatus;
pub use load_balancer::LoadBalanceStrategy;
pub use manager::PoolManager;
pub use pool::{PoolStatus, ProviderPool};
pub use rate_limiter::RateLimitResult;
