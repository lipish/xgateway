use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::{RwLock, Semaphore, OwnedSemaphorePermit};
use rand::{thread_rng, Rng};
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

    /// Service queue is full (bounded waiting queue)
    QueueFull,

    /// Waiting for service concurrency permit timed out
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

    /// Per-service rate limit buckets
    services: Arc<RwLock<HashMap<String, TokenBucket>>>,

    /// Per-service concurrency semaphores
    service_semaphores: Arc<RwLock<HashMap<String, (usize, Arc<Semaphore>)>>>,

    /// Per-service bounded waiting queue semaphores
    service_queue_semaphores: Arc<RwLock<HashMap<String, (usize, Arc<Semaphore>)>>>,
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
            services: Arc::new(RwLock::new(HashMap::new())),
            service_semaphores: Arc::new(RwLock::new(HashMap::new())),
            service_queue_semaphores: Arc::new(RwLock::new(HashMap::new())),
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

    /// Check Service rate limit (RPS) + bounded queue + concurrency (with wait timeout)
    pub async fn check_service(
        &self,
        service_id: &str,
        config: RateLimitConfig,
        max_queue_size: usize,
        max_queue_wait: Duration,
    ) -> RateLimitResult {
        // 1. Check RPS
        {
            let mut services = self.services.write().await;
            let bucket = services
                .entry(service_id.to_string())
                .or_insert_with(|| TokenBucket::new(config.clone()));

            if bucket.config.requests_per_second != config.requests_per_second {
                bucket.config = config.clone();
            }

            if !bucket.try_acquire() {
                return RateLimitResult::Denied { retry_after: bucket.time_until_available() };
            }
        }

        // 2. Bounded waiting queue
        let _queue_permit = if max_queue_size > 0 {
            let mut semaphores = self.service_queue_semaphores.write().await;
            let sem = match semaphores.get(service_id) {
                Some((existing_max, existing_sem)) if *existing_max == max_queue_size => existing_sem.clone(),
                _ => {
                    let new_sem = Arc::new(Semaphore::new(max_queue_size));
                    semaphores.insert(service_id.to_string(), (max_queue_size, new_sem.clone()));
                    new_sem
                }
            };

            match sem.try_acquire_owned() {
                Ok(permit) => Some(permit),
                Err(_) => return RateLimitResult::QueueFull,
            }
        } else {
            None
        };

        // 3. Concurrency (randomized polling within wait timeout)
        let permit = if let Some(max) = config.max_concurrency {
            let max_usize = max as usize;
            let mut semaphores = self.service_semaphores.write().await;
            let sem = match semaphores.get(service_id) {
                Some((existing_max, existing_sem)) if *existing_max == max_usize => existing_sem.clone(),
                _ => {
                    let new_sem = Arc::new(Semaphore::new(max_usize));
                    semaphores.insert(service_id.to_string(), (max_usize, new_sem.clone()));
                    new_sem
                }
            };
            let deadline = Instant::now() + max_queue_wait;
            loop {
                match sem.clone().try_acquire_owned() {
                    Ok(permit) => break Some(permit),
                    Err(_) => {
                        if Instant::now() >= deadline {
                            return RateLimitResult::WaitTimeout;
                        }
                        let jitter_ms: u64 = thread_rng().gen_range(5..=25);
                        let remaining = deadline.saturating_duration_since(Instant::now());
                        let sleep_for = Duration::from_millis(jitter_ms).min(remaining);
                        tokio::time::sleep(sleep_for).await;
                    }
                }
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
