use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::{RwLock, Semaphore, OwnedSemaphorePermit};
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
    /// Maximum concurrent requests
    pub max_concurrency: Option<u32>,
}

impl Default for RateLimitConfig {
    fn default() -> Self {
        Self {
            requests_per_second: 100.0,
            burst_size: 200,
            enabled: true,
            max_concurrency: None,
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
#[derive(Debug)]
pub enum RateLimitResult {
    /// Request allowed
    Allowed { 
        remaining: u64,
        concurrency_permit: Option<OwnedSemaphorePermit>,
    },
    /// Request denied due to rate limit
    Denied { retry_after: Duration },
    /// Request denied due to concurrency limit
    ConcurrencyExceeded,

    QueueFull,

    WaitTimeout,
}

/// Rate limiter for managing request rates
pub struct RateLimiter {
    /// Global rate limit bucket
    global: Arc<RwLock<TokenBucket>>,
    /// Per-provider rate limit buckets
    providers: Arc<RwLock<HashMap<i64, TokenBucket>>>,
    /// Per-API-key rate limit buckets
    api_keys: Arc<RwLock<HashMap<String, TokenBucket>>>,
    /// Per-API-key concurrency semaphores
    api_key_semaphores: Arc<RwLock<HashMap<String, (usize, Arc<Semaphore>)>>>,

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
            api_key_semaphores: Arc::new(RwLock::new(HashMap::new())),
            default_config: global_config,
            provider_configs: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Check global rate limit
    pub async fn check_global(&self) -> RateLimitResult {
        let mut bucket = self.global.write().await;
        if bucket.try_acquire() {
            RateLimitResult::Allowed { 
                remaining: bucket.remaining(),
                concurrency_permit: None,
            }
        } else {
            RateLimitResult::Denied { retry_after: bucket.time_until_available() }
        }
    }

    /// Check API key rate limit and concurrency
    pub async fn check_api_key(&self, api_key: &str, config: Option<RateLimitConfig>) -> RateLimitResult {
        let actual_config = config.unwrap_or_else(|| self.default_config.clone());
        
        // 1. Check RPS
        {
            let mut api_keys = self.api_keys.write().await;
            let bucket = api_keys.entry(api_key.to_string())
                .or_insert_with(|| TokenBucket::new(actual_config.clone()));
            
            // Update config if it changed
            if bucket.config.requests_per_second != actual_config.requests_per_second {
                bucket.config = actual_config.clone();
            }

            if !bucket.try_acquire() {
                return RateLimitResult::Denied { retry_after: bucket.time_until_available() };
            }
        }

        // 2. Check Concurrency
        let permit = if let Some(max) = actual_config.max_concurrency {
            let max_usize = max as usize;
            let mut semaphores = self.api_key_semaphores.write().await;

            let sem = match semaphores.get(api_key) {
                Some((existing_max, existing_sem)) if *existing_max == max_usize => existing_sem.clone(),
                _ => {
                    let new_sem = Arc::new(Semaphore::new(max_usize));
                    semaphores.insert(api_key.to_string(), (max_usize, new_sem.clone()));
                    new_sem
                }
            };
            
            match sem.try_acquire_owned() {
                Ok(permit) => Some(permit),
                Err(_) => return RateLimitResult::ConcurrencyExceeded,
            }
        } else {
            None
        };

        RateLimitResult::Allowed { 
            remaining: 0, 
            concurrency_permit: permit,
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
            RateLimitResult::ConcurrencyExceeded => unreachable!(),
            RateLimitResult::QueueFull | RateLimitResult::WaitTimeout => unreachable!(),
        }

        // Check provider if specified
        if let Some(id) = provider_id {
            // ... provider check (simplified for now)
            let mut providers = self.providers.write().await;
            let config = {
                let configs = self.provider_configs.read().await;
                configs.get(&id).cloned().unwrap_or_else(|| self.default_config.clone())
            };
            let bucket = providers.entry(id).or_insert_with(|| TokenBucket::new(config));
            if bucket.try_acquire() {
                return RateLimitResult::Allowed { 
                    remaining: bucket.remaining(),
                    concurrency_permit: None,
                };
            } else {
                return RateLimitResult::Denied { retry_after: bucket.time_until_available() };
            }
        }

        RateLimitResult::Allowed { remaining: 0, concurrency_permit: None }
    }

    /// Set global rate limit config
    pub async fn set_global_config(&self, config: RateLimitConfig) {
        let mut global = self.global.write().await;
        *global = TokenBucket::new(config.clone());
    }

    /// Set provider-specific rate limit config
    pub async fn set_provider_config(&self, provider_id: i64, config: RateLimitConfig) {
        let mut configs = self.provider_configs.write().await;
        configs.insert(provider_id, config);
    }

    /// Get global rate limit status
    pub async fn get_global_status(&self) -> (u64, RateLimitConfig) {
        let mut global = self.global.write().await;
        (global.remaining(), global.config.clone())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_global_rate_limit_allows_within_burst() {
        let config = RateLimitConfig {
            requests_per_second: 10.0,
            burst_size: 5,
            enabled: true,
            max_concurrency: None,
        };
        let limiter = RateLimiter::new(config);

        // Should allow up to burst_size requests
        for _ in 0..5 {
            match limiter.check_global().await {
                RateLimitResult::Allowed { .. } => {}
                other => panic!("Expected Allowed, got {:?}", other),
            }
        }

        // Next request should be denied
        match limiter.check_global().await {
            RateLimitResult::Denied { retry_after } => {
                assert!(retry_after > Duration::ZERO);
            }
            other => panic!("Expected Denied, got {:?}", other),
        }
    }

    #[tokio::test]
    async fn test_disabled_rate_limit_always_allows() {
        let config = RateLimitConfig {
            requests_per_second: 1.0,
            burst_size: 1,
            enabled: false,
            max_concurrency: None,
        };
        let limiter = RateLimiter::new(config);

        // Even with burst_size=1 and sending many requests, all should be allowed when disabled
        for _ in 0..100 {
            match limiter.check_global().await {
                RateLimitResult::Allowed { .. } => {}
                other => panic!("Expected Allowed when disabled, got {:?}", other),
            }
        }
    }

    #[tokio::test]
    async fn test_api_key_rate_limit() {
        let global_config = RateLimitConfig {
            requests_per_second: 1000.0,
            burst_size: 1000,
            enabled: false,
            max_concurrency: None,
        };
        let limiter = RateLimiter::new(global_config);

        let key_config = RateLimitConfig {
            requests_per_second: 10.0,
            burst_size: 3,
            enabled: true,
            max_concurrency: None,
        };

        // Should allow up to burst_size
        for _ in 0..3 {
            match limiter.check_api_key("test-key", Some(key_config.clone())).await {
                RateLimitResult::Allowed { .. } => {}
                other => panic!("Expected Allowed, got {:?}", other),
            }
        }

        // Next should be denied
        match limiter.check_api_key("test-key", Some(key_config.clone())).await {
            RateLimitResult::Denied { .. } => {}
            other => panic!("Expected Denied, got {:?}", other),
        }
    }

    #[tokio::test]
    async fn test_api_key_concurrency_limit() {
        let global_config = RateLimitConfig {
            requests_per_second: 1000.0,
            burst_size: 1000,
            enabled: false,
            max_concurrency: None,
        };
        let limiter = RateLimiter::new(global_config);

        let key_config = RateLimitConfig {
            requests_per_second: 1000.0,
            burst_size: 1000,
            enabled: true,
            max_concurrency: Some(2),
        };

        // Acquire 2 concurrency permits
        let permit1 = match limiter.check_api_key("key1", Some(key_config.clone())).await {
            RateLimitResult::Allowed { concurrency_permit, .. } => concurrency_permit,
            other => panic!("Expected Allowed, got {:?}", other),
        };
        let _permit2 = match limiter.check_api_key("key1", Some(key_config.clone())).await {
            RateLimitResult::Allowed { concurrency_permit, .. } => concurrency_permit,
            other => panic!("Expected Allowed, got {:?}", other),
        };

        // Third should exceed concurrency
        match limiter.check_api_key("key1", Some(key_config.clone())).await {
            RateLimitResult::ConcurrencyExceeded => {}
            other => panic!("Expected ConcurrencyExceeded, got {:?}", other),
        }

        // Drop first permit, should allow again
        drop(permit1);
        match limiter.check_api_key("key1", Some(key_config.clone())).await {
            RateLimitResult::Allowed { .. } => {}
            other => panic!("Expected Allowed after dropping permit, got {:?}", other),
        }
    }

    #[tokio::test]
    async fn test_different_api_keys_independent() {
        let global_config = RateLimitConfig {
            requests_per_second: 1000.0,
            burst_size: 1000,
            enabled: false,
            max_concurrency: None,
        };
        let limiter = RateLimiter::new(global_config);

        let key_config = RateLimitConfig {
            requests_per_second: 10.0,
            burst_size: 2,
            enabled: true,
            max_concurrency: None,
        };

        // Exhaust key-a
        limiter.check_api_key("key-a", Some(key_config.clone())).await;
        limiter.check_api_key("key-a", Some(key_config.clone())).await;
        match limiter.check_api_key("key-a", Some(key_config.clone())).await {
            RateLimitResult::Denied { .. } => {}
            other => panic!("key-a should be denied, got {:?}", other),
        }

        // key-b should still work
        match limiter.check_api_key("key-b", Some(key_config.clone())).await {
            RateLimitResult::Allowed { .. } => {}
            other => panic!("key-b should be allowed, got {:?}", other),
        }
    }

    #[tokio::test]
    async fn test_provider_rate_limit() {
        let config = RateLimitConfig {
            requests_per_second: 10.0,
            burst_size: 3,
            enabled: true,
            max_concurrency: None,
        };
        let limiter = RateLimiter::new(config.clone());
        limiter.set_provider_config(1, RateLimitConfig {
            requests_per_second: 10.0,
            burst_size: 2,
            enabled: true,
            max_concurrency: None,
        }).await;

        // Provider 1 should be limited by its own config (burst=2)
        match limiter.check(Some(1)).await {
            RateLimitResult::Allowed { .. } => {}
            other => panic!("Expected Allowed, got {:?}", other),
        }
        match limiter.check(Some(1)).await {
            RateLimitResult::Allowed { .. } => {}
            other => panic!("Expected Allowed, got {:?}", other),
        }
        // Third request on provider 1 should be denied (provider burst=2 exhausted)
        match limiter.check(Some(1)).await {
            RateLimitResult::Denied { .. } => {}
            other => panic!("Expected Denied for provider, got {:?}", other),
        }
    }

    #[tokio::test]
    async fn test_tokens_replenish_over_time() {
        let config = RateLimitConfig {
            requests_per_second: 100.0,  // 1 token per 10ms
            burst_size: 1,
            enabled: true,
            max_concurrency: None,
        };
        let limiter = RateLimiter::new(config);

        // Use the one token
        match limiter.check_global().await {
            RateLimitResult::Allowed { .. } => {}
            other => panic!("Expected Allowed, got {:?}", other),
        }

        // Denied immediately
        match limiter.check_global().await {
            RateLimitResult::Denied { .. } => {}
            other => panic!("Expected Denied, got {:?}", other),
        }

        // Wait for replenishment
        tokio::time::sleep(Duration::from_millis(20)).await;

        // Should be allowed again
        match limiter.check_global().await {
            RateLimitResult::Allowed { .. } => {}
            other => panic!("Expected Allowed after wait, got {:?}", other),
        }
    }
}
