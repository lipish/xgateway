//! Rate Limiter Module
//!
//! Implements token bucket rate limiting for:
//! - Global request rate limiting
//! - Per-provider rate limiting
//! - Per-API-key rate limiting

use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::RwLock;
use serde::{Deserialize, Serialize};

/// Rate limiter configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RateLimitConfig {
    /// Maximum requests per second (tokens added per second)
    pub requests_per_second: f64,
    /// Maximum burst size (bucket capacity)
    pub burst_size: u64,
    /// Whether rate limiting is enabled
    pub enabled: bool,
}

impl Default for RateLimitConfig {
    fn default() -> Self {
        Self {
            requests_per_second: 100.0,
            burst_size: 200,
            enabled: true,
        }
    }
}

/// Token bucket state
struct TokenBucket {
    tokens: f64,
    last_update: Instant,
    config: RateLimitConfig,
}

impl TokenBucket {
    fn new(config: RateLimitConfig) -> Self {
        Self {
            tokens: config.burst_size as f64,
            last_update: Instant::now(),
            config,
        }
    }

    /// Try to acquire a token, returns true if successful
    fn try_acquire(&mut self) -> bool {
        if !self.config.enabled {
            return true;
        }

        self.refill();

        if self.tokens >= 1.0 {
            self.tokens -= 1.0;
            true
        } else {
            false
        }
    }

    /// Refill tokens based on elapsed time
    fn refill(&mut self) {
        let now = Instant::now();
        let elapsed = now.duration_since(self.last_update).as_secs_f64();
        let new_tokens = elapsed * self.config.requests_per_second;
        self.tokens = (self.tokens + new_tokens).min(self.config.burst_size as f64);
        self.last_update = now;
    }

    /// Get remaining tokens
    fn remaining(&mut self) -> u64 {
        self.refill();
        self.tokens as u64
    }

    /// Get time until next token is available
    fn time_until_available(&mut self) -> Duration {
        self.refill();
        if self.tokens >= 1.0 {
            Duration::ZERO
        } else {
            let needed = 1.0 - self.tokens;
            let seconds = needed / self.config.requests_per_second;
            Duration::from_secs_f64(seconds)
        }
    }
}

/// Rate limiter result
#[derive(Debug, Clone)]
pub enum RateLimitResult {
    /// Request allowed
    Allowed { remaining: u64 },
    /// Request denied due to rate limit
    Denied { retry_after: Duration },
}

/// Rate limiter for managing request rates
pub struct RateLimiter {
    /// Global rate limit bucket
    global: Arc<RwLock<TokenBucket>>,
    /// Per-provider rate limit buckets
    providers: Arc<RwLock<HashMap<i64, TokenBucket>>>,
    /// Per-API-key rate limit buckets
    api_keys: Arc<RwLock<HashMap<String, TokenBucket>>>,
    /// Default config for new buckets
    default_config: RateLimitConfig,
    /// Provider-specific configs
    provider_configs: Arc<RwLock<HashMap<i64, RateLimitConfig>>>,
}

impl RateLimiter {
    /// Create a new rate limiter with default config
    pub fn new(global_config: RateLimitConfig) -> Self {
        Self {
            global: Arc::new(RwLock::new(TokenBucket::new(global_config.clone()))),
            providers: Arc::new(RwLock::new(HashMap::new())),
            api_keys: Arc::new(RwLock::new(HashMap::new())),
            default_config: global_config,
            provider_configs: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Check global rate limit
    pub async fn check_global(&self) -> RateLimitResult {
        let mut bucket = self.global.write().await;
        if bucket.try_acquire() {
            RateLimitResult::Allowed { remaining: bucket.remaining() }
        } else {
            RateLimitResult::Denied { retry_after: bucket.time_until_available() }
        }
    }

    /// Check provider-specific rate limit
    pub async fn check_provider(&self, provider_id: i64) -> RateLimitResult {
        let mut providers = self.providers.write().await;
        let config = {
            let configs = self.provider_configs.read().await;
            configs.get(&provider_id).cloned().unwrap_or_else(|| self.default_config.clone())
        };
        let bucket = providers.entry(provider_id).or_insert_with(|| TokenBucket::new(config));
        if bucket.try_acquire() {
            RateLimitResult::Allowed { remaining: bucket.remaining() }
        } else {
            RateLimitResult::Denied { retry_after: bucket.time_until_available() }
        }
    }

    /// Check API key rate limit
    pub async fn check_api_key(&self, api_key: &str) -> RateLimitResult {
        let mut api_keys = self.api_keys.write().await;
        let bucket = api_keys.entry(api_key.to_string())
            .or_insert_with(|| TokenBucket::new(self.default_config.clone()));
        if bucket.try_acquire() {
            RateLimitResult::Allowed { remaining: bucket.remaining() }
        } else {
            RateLimitResult::Denied { retry_after: bucket.time_until_available() }
        }
    }

    /// Check all rate limits (global + provider)
    pub async fn check(&self, provider_id: Option<i64>) -> RateLimitResult {
        // Check global first
        match self.check_global().await {
            RateLimitResult::Denied { retry_after } => {
                return RateLimitResult::Denied { retry_after };
            }
            RateLimitResult::Allowed { .. } => {}
        }

        // Check provider if specified
        if let Some(id) = provider_id {
            return self.check_provider(id).await;
        }

        RateLimitResult::Allowed { remaining: 0 }
    }

    /// Set provider-specific rate limit config
    pub async fn set_provider_config(&self, provider_id: i64, config: RateLimitConfig) {
        let mut configs = self.provider_configs.write().await;
        configs.insert(provider_id, config.clone());
        // Update existing bucket if present
        let mut providers = self.providers.write().await;
        if let Some(bucket) = providers.get_mut(&provider_id) {
            bucket.config = config;
        }
    }

    /// Get rate limit status for a provider
    pub async fn get_provider_status(&self, provider_id: i64) -> Option<(u64, RateLimitConfig)> {
        let mut providers = self.providers.write().await;
        providers.get_mut(&provider_id).map(|b| {
            (b.remaining(), b.config.clone())
        })
    }

    /// Get global rate limit status
    pub async fn get_global_status(&self) -> (u64, RateLimitConfig) {
        let mut bucket = self.global.write().await;
        (bucket.remaining(), bucket.config.clone())
    }

    /// Update global config
    pub async fn set_global_config(&self, config: RateLimitConfig) {
        let mut bucket = self.global.write().await;
        bucket.config = config;
    }

    /// Check if rate limiting is enabled
    pub fn is_enabled(&self) -> bool {
        self.default_config.enabled
    }
}

