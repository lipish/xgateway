//! Provider Pool Manager Module
//!
//! Global manager for provider pool with:
//! - Background health checking
//! - Load balancing
//! - Failover support
//! - Metrics collection
//! - Rate limiting

use std::sync::Arc;
use std::time::Duration;
use tokio::sync::RwLock;
use anyhow::Result;

use super::pool::{ProviderPool, ProviderInstanceConfig};
use super::health::HealthStatus;
use super::load_balancer::LoadBalanceStrategy;
use super::metrics::ProviderMetricsSummary;
use super::rate_limiter::{RateLimiter, RateLimitConfig, RateLimitResult};
use crate::db::{DatabasePool, Provider, ApiKey};
use crate::provider::ProviderRegistry;

/// Global provider pool manager
pub struct PoolManager {
    pool: Arc<ProviderPool>,
    db_pool: DatabasePool,
    health_check_interval: Duration,
    shutdown: Arc<RwLock<bool>>,
    rate_limiter: Arc<RateLimiter>,
}

impl PoolManager {
    /// Create a new pool manager
    pub fn new(db_pool: DatabasePool) -> Self {
        let default_rate_config = RateLimitConfig {
            requests_per_second: 100.0,
            burst_size: 200,
            enabled: false, // Disabled by default
            max_concurrency: None,
        };
        Self {
            pool: Arc::new(ProviderPool::new()),
            db_pool,
            health_check_interval: Duration::from_secs(30),
            shutdown: Arc::new(RwLock::new(false)),
            rate_limiter: Arc::new(RateLimiter::new(default_rate_config)),
        }
    }

    /// Create with custom health check interval
    pub fn with_health_check_interval(mut self, interval: Duration) -> Self {
        self.health_check_interval = interval;
        self
    }

    /// Get the underlying provider pool
    pub fn pool(&self) -> &Arc<ProviderPool> {
        &self.pool
    }

    /// Initialize pool from database
    pub async fn init(&self) -> Result<()> {
        let providers = self.db_pool.list_providers().await?;
        for provider in providers {
            if provider.enabled {
                self.add_provider(&provider).await?;
            }
        }
        tracing::info!("Pool manager initialized with {} providers", 
            self.pool.get_all_providers().await.len());
        Ok(())
    }

    /// Add a provider to the pool
    pub async fn add_provider(&self, provider: &Provider) -> Result<()> {
        let config: serde_json::Value = serde_json::from_str(&provider.config)
            .unwrap_or_else(|e| {
                tracing::warn!(
                    "Failed to parse provider config for '{}' (id={}): {}",
                    provider.name, provider.id, e
                );
                serde_json::Value::default()
            });

        // Use endpoint if provided (for Volcengine ep-*), otherwise fall back to model from config
        let model = if provider.provider_type == "volcengine" {
            provider.endpoint.clone().unwrap_or_else(|| config.get("model").and_then(|v| v.as_str()).unwrap_or("default").to_string())
        } else {
            config.get("model").and_then(|v| v.as_str()).unwrap_or("default").to_string()
        };

        let instance_config = ProviderInstanceConfig {
            provider_type: provider.provider_type.clone(),
            api_key: config.get("api_key").and_then(|v| v.as_str()).map(String::from),
            base_url: config.get("base_url").and_then(|v| v.as_str()).map(String::from),
            region: config.get("region").and_then(|v| v.as_str()).map(String::from),
            model,
            priority: provider.priority,
            weight: 1,
            enabled: provider.enabled,
            input_price: config.get("input_price").and_then(|v| v.as_f64()).unwrap_or(0.0),
            output_price: config.get("output_price").and_then(|v| v.as_f64()).unwrap_or(0.0),
            quota_limit: config.get("quota_limit").and_then(|v| v.as_u64()),
        };

        self.pool.add_provider(provider.id, provider.name.clone(), instance_config).await;
        
        // Mark as healthy initially (will be updated by health check)
        self.pool.update_health(provider.id, HealthStatus::Healthy).await;
        
        Ok(())
    }

    /// Remove a provider from the pool
    pub async fn remove_provider(&self, provider_id: i64) {
        self.pool.remove_provider(provider_id).await;
    }

    /// Select a provider for request using load balancing
    pub async fn select_provider(&self) -> Option<i64> {
        self.pool.select_provider().await
    }

    /// Select a provider with fallback (excluding a failed one)
    pub async fn select_fallback(&self, exclude_id: i64) -> Option<i64> {
        self.pool.select_provider_with_fallback(Some(exclude_id)).await
    }

    pub async fn select_provider_from_candidates(
        &self,
        candidate_provider_ids: &[i64],
        exclude: Option<i64>,
    ) -> Option<i64> {
        self.pool
            .select_provider_from_candidates(candidate_provider_ids, exclude)
            .await
    }

    pub async fn select_provider_from_candidates_with_strategy(
        &self,
        strategy: LoadBalanceStrategy,
        candidate_provider_ids: &[i64],
        exclude: Option<i64>,
    ) -> Option<i64> {
        self.pool
            .select_provider_from_candidates_with_strategy(strategy, candidate_provider_ids, exclude)
            .await
    }

    /// Record request start (increment active connections)
    pub async fn record_request_start(&self, provider_id: i64) {
        self.pool.record_request_start(provider_id).await;
    }

    /// Record successful request
    pub async fn record_success(&self, provider_id: i64, latency: Duration) {
        let latency_ms = latency.as_millis() as u64;
        self.pool.record_success(provider_id, latency_ms).await;
    }

    /// Record failed request
    pub async fn record_failure(&self, provider_id: i64, error: Option<&str>) {
        self.pool.record_failure(provider_id, error).await;
    }

    /// Get metrics for a provider
    pub async fn get_metrics(&self, provider_id: i64) -> Option<ProviderMetricsSummary> {
        self.pool.get_metrics(provider_id).await
    }

    /// Get all metrics
    pub async fn get_all_metrics(&self) -> std::collections::HashMap<i64, ProviderMetricsSummary> {
        self.pool.get_all_metrics().await
    }

    /// Check if provider is available
    pub async fn is_available(&self, provider_id: i64) -> bool {
        self.pool.is_provider_available(provider_id).await
    }

    /// Set load balance strategy
    pub async fn set_strategy(&self, strategy: LoadBalanceStrategy) {
        self.pool.set_load_balance_strategy(strategy).await;
    }

    /// Check rate limit (global + optional provider)
    pub async fn check_rate_limit(&self, provider_id: Option<i64>) -> RateLimitResult {
        self.rate_limiter.check(provider_id).await
    }

    /// Check API key rate limit and concurrency
    pub async fn check_api_key_limit(&self, key_info: &ApiKey) -> RateLimitResult {
        let config = RateLimitConfig {
            requests_per_second: key_info.qps_limit,
            burst_size: (key_info.qps_limit * 2.0) as u64,
            enabled: key_info.status == "active",
            max_concurrency: Some(key_info.concurrency_limit as u32),
        };
        self.rate_limiter.check_api_key(&key_info.key_hash, Some(config)).await
    }


    /// Set global rate limit config
    pub async fn set_global_rate_limit(&self, config: RateLimitConfig) {
        self.rate_limiter.set_global_config(config).await;
    }

    /// Set provider-specific rate limit config
    pub async fn set_provider_rate_limit(&self, provider_id: i64, config: RateLimitConfig) {
        self.rate_limiter.set_provider_config(provider_id, config).await;
    }

    /// Get rate limit status
    pub async fn get_rate_limit_status(&self) -> (u64, RateLimitConfig) {
        self.rate_limiter.get_global_status().await
    }

    /// Shutdown the manager
    pub async fn shutdown(&self) {
        *self.shutdown.write().await = true;
    }

    /// Start background health check task
    pub fn start_health_check(self: Arc<Self>) -> tokio::task::JoinHandle<()> {
        let manager = Arc::clone(&self);
        let interval = self.health_check_interval;

        tokio::spawn(async move {
            tracing::info!("Starting background health check task (interval: {:?})", interval);

            loop {
                // Check shutdown flag
                if *manager.shutdown.read().await {
                    tracing::info!("Health check task shutting down");
                    break;
                }

                // Perform health checks
                manager.perform_health_checks().await;

                // Wait for next interval
                tokio::time::sleep(interval).await;
            }
        })
    }

    /// Perform health check on all providers
    async fn perform_health_checks(&self) {
        let providers = match self.db_pool.list_providers().await {
            Ok(p) => p,
            Err(e) => {
                tracing::error!("Failed to list providers for health check: {}", e);
                return;
            }
        };

        for provider in providers.iter().filter(|p| p.enabled) {
            let result = self.check_provider_health(provider).await;

            match result {
                Ok(latency_ms) => {
                    self.pool.record_success(provider.id, latency_ms).await;
                    tracing::debug!("Provider {} healthy ({}ms)", provider.name, latency_ms);
                }
                Err(e) => {
                    let err_str = e.to_string();
                    self.pool.record_failure(provider.id, Some(&err_str)).await;
                    let status = self.pool.health_checker().get_status(provider.id).await;
                    tracing::warn!(
                        "Provider {} health check failed: {}, status={:?}",
                        provider.name,
                        err_str,
                        status
                    );
                    
                    // Record health check failure to request logs
                    let model_for_log = provider
                        .endpoint
                        .clone()
                        .unwrap_or_else(|| "unknown".to_string());
                    let error_log = crate::db::NewRequestLog {
                        api_key_id: None,
                        project_id: None,
                        org_id: None,
                        provider_id: Some(provider.id),
                        provider_name: provider.name.clone(),
                        model: model_for_log.clone(),
                        status: "error".to_string(),
                        latency_ms: 0,
                        tokens_used: 0,
                        error_message: Some(format!("Health check failed: {}", err_str)),
                        request_type: "health_check".to_string(),
                        request_content: None,
                        response_content: None,
                    };
                    let _ = self.db_pool.create_request_log(error_log).await;

                    let should_disable_immediately = err_str.contains("insufficient balance")
                        || err_str.contains("(1008)")
                        || err_str.contains("1008");

                    // Only disable if explicitly insufficient balance. 
                    // Do NOT auto-disable for network errors or health check timeouts.
                    if should_disable_immediately {
                        let reason = "insufficient_balance_1008";

                        if let Err(e) = self.db_pool.set_provider_enabled(provider.id, false).await {
                            tracing::error!(
                                "Failed to auto-disable provider {} ({}): {}",
                                provider.name,
                                provider.id,
                                e
                            );
                        } else {
                            tracing::warn!(
                                "Auto-disabled provider {} ({}), reason={}",
                                provider.name,
                                provider.id,
                                reason
                            );
                        }

                        let disabled_log = crate::db::NewRequestLog {
                            api_key_id: None,
                            project_id: None,
                            org_id: None,
                            provider_id: Some(provider.id),
                            provider_name: provider.name.clone(),
                            model: model_for_log,
                            status: "error".to_string(),
                            latency_ms: 0,
                            tokens_used: 0,
                            error_message: Some(format!(
                                "Provider auto-disabled: reason={}, last_error={}",
                                reason, err_str
                            )),
                            request_type: "provider_disabled".to_string(),
                            request_content: None,
                            response_content: None,
                        };
                        let _ = self.db_pool.create_request_log(disabled_log).await;

                        // Stop scheduling/health-checking this provider in the running pool.
                        self.pool.remove_provider(provider.id).await;
                    }
                }
            }
        }
    }

    /// Check single provider health by calling /v1/models endpoint
    /// For providers that don't support /models (like MiniMax), skip the check
    async fn check_provider_health(&self, provider: &Provider) -> Result<u64> {
        let config: serde_json::Value = serde_json::from_str(&provider.config)?;
        let api_key = config.get("api_key").and_then(|v| v.as_str()).unwrap_or("");
        let region = config.get("region").and_then(|v| v.as_str());
        
        let base_url = config.get("base_url")
            .and_then(|v| v.as_str())
            .map(String::from)
            .unwrap_or_else(|| {
                ProviderRegistry::get_default_base_url(&provider.provider_type, region)
                    .unwrap_or_else(|| match provider.provider_type.as_str() {
                        "openai" => "https://api.openai.com/v1",
                        "anthropic" => "https://api.anthropic.com/v1",
                        "zhipu" => "https://open.bigmodel.cn/api/paas/v4",
                        "aliyun" => "https://dashscope.aliyuncs.com/compatible-mode/v1",
                        "volcengine" => "https://ark.cn-beijing.volces.com/api/v3",
                        "tencent" => "https://hunyuan.tencentcloudapi.com",
                        "moonshot" => "https://api.moonshot.cn/v1",
                        "minimax" => "https://api.minimax.io/v1",
                        "deepseek" => "https://api.deepseek.com/v1",
                        _ => "",
                    }).to_string()
            });

        if base_url.is_empty() {
            return Err(anyhow::anyhow!("No base_url configured and no default available for type '{}'", provider.provider_type));
        }

        // Some providers (like MiniMax) don't support /models endpoint
        // For these, we just assume they're healthy if API key is configured
        let provider_type = provider.provider_type.as_str();
        let providers_without_models = ["minimax", "longcat", "volcengine"];

        if providers_without_models.contains(&provider_type) {
            // For providers without /models endpoint, just verify the base_url is reachable
            // by doing a lightweight HEAD request to the base URL
            let client = reqwest::Client::builder()
                .timeout(Duration::from_secs(30))
                .no_proxy() // Disable system proxies to rule out local configuration issues
                .http1_only()
                .build()?;

            let start = std::time::Instant::now();

            // Try HEAD request to base URL - we just want to check connectivity
            let response = client
                .head(base_url)
                .header("Authorization", format!("Bearer {}", api_key))
                .send()
                .await;

            let latency_ms = start.elapsed().as_millis() as u64;

            // For these providers, any response (even 404) means the server is reachable
            // Only connection errors should be treated as failures
            match response {
                Ok(_) => Ok(latency_ms),
                Err(e) if e.is_timeout() => Err(anyhow::anyhow!("Health check timeout")),
                Err(e) if e.is_connect() => Err(anyhow::anyhow!("Connection failed: {}", e)),
                Err(_) => Ok(latency_ms), // Other errors (like 404) are OK for these providers
            }
        } else {
            // Standard /models endpoint check for OpenAI-compatible providers
            let client = reqwest::Client::builder()
                .timeout(Duration::from_secs(30))
                .no_proxy() // Disable system proxies
                .build()?;

            let url = format!("{}/models", base_url.trim_end_matches('/'));
            let start = std::time::Instant::now();

            tracing::debug!("Checking health for {} at {}", provider.name, url);

            let response = client
                .get(&url)
                .header("Authorization", format!("Bearer {}", api_key))
                .send()
                .await;
            
            match response {
                Ok(resp) => {
                    let latency_ms = start.elapsed().as_millis() as u64;
                    if resp.status().is_success() {
                        Ok(latency_ms)
                    } else {
                        tracing::warn!("Health check for {} failed with status: {}", provider.name, resp.status());
                        Err(anyhow::anyhow!("Health check failed: HTTP {}", resp.status()))
                    }
                }
                Err(e) => {
                    tracing::error!("Health check for {} failed with error: {}", provider.name, e);
                    Err(anyhow::anyhow!("Connection failed: {}", e))
                }
            }
        }
    }

    /// Sync pool with database (add new, remove deleted)
    pub async fn sync_with_db(&self) -> Result<()> {
        let db_providers = self.db_pool.list_providers().await?;
        let pool_providers = self.pool.get_all_providers().await;

        // Get IDs
        let db_ids: std::collections::HashSet<i64> = db_providers.iter()
            .filter(|p| p.enabled)
            .map(|p| p.id)
            .collect();
        let pool_ids: std::collections::HashSet<i64> = pool_providers.iter()
            .map(|p| p.id)
            .collect();

        // Add new providers
        for provider in db_providers.iter().filter(|p| p.enabled && !pool_ids.contains(&p.id)) {
            self.add_provider(provider).await?;
            tracing::info!("Added provider {} to pool", provider.name);
        }

        // Remove disabled/deleted providers
        for id in pool_ids.iter().filter(|id| !db_ids.contains(id)) {
            self.remove_provider(*id).await;
            tracing::info!("Removed provider {} from pool", id);
        }

        Ok(())
    }

    /// Get health status for all providers
    pub async fn get_health_status(&self) -> std::collections::HashMap<i64, HealthStatus> {
        let mut statuses = std::collections::HashMap::new();
        for provider in self.pool.get_all_providers().await {
            statuses.insert(provider.id, provider.status);
        }
        statuses
    }

    /// Get pool status summary
    pub async fn get_status_summary(&self) -> PoolStatusSummary {
        let pool_status = self.pool.get_pool_status().await;
        let metrics = self.pool.get_all_metrics().await;

        let total_requests: u64 = metrics.values().map(|m| m.total_requests).sum();
        let total_failures: u64 = metrics.values().map(|m| m.failed_requests).sum();

        PoolStatusSummary {
            total_providers: pool_status.total,
            healthy_providers: pool_status.healthy,
            degraded_providers: pool_status.degraded,
            unhealthy_providers: pool_status.unhealthy,
            total_requests_today: total_requests,
            total_failures,
            success_rate: if total_requests > 0 {
                ((total_requests - total_failures) as f64 / total_requests as f64) * 100.0
            } else {
                100.0
            },
            avg_latency_ms: if !metrics.is_empty() {
                let sum: f64 = metrics.values().map(|m| m.avg_latency_ms).sum();
                sum / metrics.len() as f64
            } else {
                0.0
            },
            load_balance_strategy: "RoundRobin".to_string(), // TODO: Get from pool
        }
    }
}

/// Pool status summary for API response
#[derive(Debug, Clone, serde::Serialize)]
pub struct PoolStatusSummary {
    pub total_providers: usize,
    pub healthy_providers: usize,
    pub degraded_providers: usize,
    pub unhealthy_providers: usize,
    pub total_requests_today: u64,
    pub total_failures: u64,
    pub success_rate: f64,
    pub avg_latency_ms: f64,
    pub load_balance_strategy: String,
}
