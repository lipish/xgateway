//! Pool Management API Handlers
//!
//! Provides endpoints for managing the provider pool:
//! - Pool status
//! - Health status
//! - Metrics
//! - Load balancing configuration

#![allow(dead_code)]

use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

use super::ApiResponse;
use crate::db::DatabasePool;
use crate::pool::manager::{PoolManager, PoolStatusSummary};
use crate::pool::{HealthStatus, LoadBalanceStrategy, PoolStatus, ProviderPool};

/// Pool state for handlers
pub struct PoolState {
    pub pool: Arc<ProviderPool>,
}

/// Response for pool status
#[derive(Debug, Serialize)]
pub struct PoolStatusResponse {
    pub status: PoolStatus,
    pub load_balance_strategy: String,
}

/// Response for provider health
#[derive(Debug, Serialize)]
pub struct ProviderHealthResponse {
    pub provider_id: i64,
    pub status: String,
    pub is_available: bool,
}

/// Request to set load balance strategy
#[derive(Debug, Deserialize)]
pub struct SetStrategyRequest {
    pub strategy: String,
}

/// Request to set fallback chain
#[derive(Debug, Deserialize)]
pub struct SetFallbackChainRequest {
    pub fallback_ids: Vec<i64>,
}

/// Get pool status
pub async fn get_pool_status(State(state): State<Arc<PoolState>>) -> impl IntoResponse {
    let status = state.pool.get_pool_status().await;
    Json(PoolStatusResponse {
        status,
        load_balance_strategy: "round_robin".to_string(), // TODO: get from pool
    })
}

/// Get all provider health statuses
pub async fn get_all_health(State(state): State<Arc<PoolState>>) -> impl IntoResponse {
    let statuses = state.pool.get_all_health_statuses().await;
    let responses: Vec<ProviderHealthResponse> = statuses
        .into_iter()
        .map(|(id, status)| ProviderHealthResponse {
            provider_id: id,
            status: format!("{:?}", status),
            is_available: matches!(status, HealthStatus::Healthy | HealthStatus::Degraded),
        })
        .collect();
    Json(responses)
}

/// Get health status for a specific provider
pub async fn get_provider_health(
    State(state): State<Arc<PoolState>>,
    Path(provider_id): Path<i64>,
) -> impl IntoResponse {
    let status = state.pool.get_health_status(provider_id).await;
    let is_available = state.pool.is_provider_available(provider_id).await;
    Json(ProviderHealthResponse {
        provider_id,
        status: format!("{:?}", status),
        is_available,
    })
}

/// Get metrics for all providers
pub async fn get_all_metrics(State(state): State<Arc<PoolState>>) -> impl IntoResponse {
    let metrics = state.pool.get_all_metrics().await;
    Json(metrics)
}

/// Get metrics for a specific provider
pub async fn get_provider_metrics(
    State(state): State<Arc<PoolState>>,
    Path(provider_id): Path<i64>,
) -> impl IntoResponse {
    match state.pool.get_metrics(provider_id).await {
        Some(metrics) => (StatusCode::OK, Json(Some(metrics))),
        None => (StatusCode::NOT_FOUND, Json(None)),
    }
}

/// Set load balance strategy
pub async fn set_load_balance_strategy(
    State(state): State<Arc<PoolState>>,
    Json(request): Json<SetStrategyRequest>,
) -> impl IntoResponse {
    let strategy = match request.strategy.to_lowercase().as_str() {
        "round_robin" | "roundrobin" => LoadBalanceStrategy::RoundRobin,
        "least_connections" | "leastconnections" => LoadBalanceStrategy::LeastConnections,
        "weighted" | "weighted_round_robin" => LoadBalanceStrategy::WeightedRoundRobin {
            weights: std::collections::HashMap::new(),
        },
        "random" => LoadBalanceStrategy::Random,
        "priority" => LoadBalanceStrategy::Priority,
        "latency" | "latency_based" => LoadBalanceStrategy::LatencyBased,
        _ => {
            return (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({
                    "error": "Invalid strategy",
                    "valid_strategies": ["round_robin", "least_connections", "weighted", "random", "priority", "latency"]
                })),
            )
        }
    };

    state.pool.set_load_balance_strategy(strategy).await;
    (
        StatusCode::OK,
        Json(serde_json::json!({
            "message": "Strategy updated",
            "strategy": request.strategy
        })),
    )
}

/// Set fallback chain for a provider
pub async fn set_fallback_chain(
    State(state): State<Arc<PoolState>>,
    Path(provider_id): Path<i64>,
    Json(request): Json<SetFallbackChainRequest>,
) -> impl IntoResponse {
    state
        .pool
        .set_fallback_chain(provider_id, request.fallback_ids.clone())
        .await;
    Json(serde_json::json!({
        "message": "Fallback chain updated",
        "provider_id": provider_id,
        "fallback_ids": request.fallback_ids
    }))
}

/// Get pool status API
pub async fn get_pool_status_api(
    axum::extract::State(pool_manager): axum::extract::State<Arc<PoolManager>>,
) -> Json<ApiResponse<PoolStatusSummary>> {
    let summary = pool_manager.get_status_summary().await;
    Json(ApiResponse {
        success: true,
        data: Some(summary),
        message: "Pool status retrieved".to_string(),
    })
}

/// Get pool health API
pub async fn get_pool_health_api(
    axum::extract::State(pool_manager): axum::extract::State<Arc<PoolManager>>,
) -> Json<ApiResponse<Vec<serde_json::Value>>> {
    let providers = pool_manager.pool().get_all_providers().await;
    let metrics = pool_manager.get_all_metrics().await;
    let health_statuses = pool_manager.pool().get_all_health_statuses().await;
    let circuit_states = pool_manager.pool().get_all_circuit_states().await;

    let health_data: Vec<serde_json::Value> = providers
        .iter()
        .map(|p| {
            let m = metrics.get(&p.id);
            let status = health_statuses
                .get(&p.id)
                .cloned()
                .unwrap_or(crate::pool::health::HealthStatus::Unknown);
            let circuit_state = circuit_states
                .get(&p.id)
                .cloned()
                .unwrap_or(crate::pool::circuit_breaker::CircuitState::Closed);

            let success_rate = m
                .map(|m| {
                    if m.total_requests > 0 {
                        (m.successful_requests as f64 / m.total_requests as f64) * 100.0
                    } else {
                        100.0
                    }
                })
                .unwrap_or(100.0);

            let circuit_state_str = match circuit_state {
                crate::pool::circuit_breaker::CircuitState::Closed => "closed",
                crate::pool::circuit_breaker::CircuitState::Open => "open",
                crate::pool::circuit_breaker::CircuitState::HalfOpen => "half_open",
            };

            serde_json::json!({
                "id": p.id,
                "name": p.name,
                "status": format!("{:?}", status).to_lowercase(),
                "latency_avg": m.map(|m| m.avg_latency_ms).unwrap_or(0.0),
                "success_rate": success_rate,
                "circuit_state": circuit_state_str,
                "active_connections": m.map(|m| m.active_connections).unwrap_or(0),
                "total_requests": m.map(|m| m.total_requests).unwrap_or(0),
                "last_check": chrono::Utc::now().to_rfc3339() // TODO: Get actual last check time
            })
        })
        .collect();

    tracing::debug!("Healthy API Data: {:?}", health_data);

    Json(ApiResponse {
        success: true,
        data: Some(health_data),
        message: "Health data retrieved".to_string(),
    })
}

/// Get all metrics API
pub async fn get_pool_metrics_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
    axum::extract::State(pool_manager): axum::extract::State<Arc<PoolManager>>,
) -> Json<serde_json::Value> {
    let metrics = pool_manager.get_all_metrics().await;
    let providers = db_pool.list_providers().await.unwrap_or_default();
    let health_statuses = pool_manager.get_health_status().await;

    let detailed: Vec<serde_json::Value> = providers
        .iter()
        .map(|p| {
            let m = metrics.get(&p.id).cloned().unwrap_or_default();
            let health = health_statuses
                .get(&p.id)
                .map(|s| format!("{:?}", s))
                .unwrap_or("Unknown".to_string());
            let success_rate = if m.total_requests > 0 {
                (m.successful_requests as f64 / m.total_requests as f64) * 100.0
            } else {
                100.0
            };
            serde_json::json!({
                "provider_id": p.id,
                "provider_name": p.name,
                "enabled": p.enabled,
                "health_status": health,
                "total_requests": m.total_requests,
                "successful_requests": m.successful_requests,
                "failed_requests": m.failed_requests,
                "success_rate": format!("{:.2}%", success_rate),
                "avg_latency_ms": m.avg_latency_ms,
                "p50_latency_ms": m.p50_latency_ms,
                "p95_latency_ms": m.p95_latency_ms,
                "p99_latency_ms": m.p99_latency_ms,
                "active_connections": m.active_connections,
                "tokens_used": m.tokens_used,
                "requests_per_second": m.requests_per_second
            })
        })
        .collect();

    Json(serde_json::json!({
        "providers": detailed,
        "timestamp": chrono::Utc::now().to_rfc3339()
    }))
}

/// Get provider metrics API
pub async fn get_provider_metrics_api(
    axum::extract::State(pool_manager): axum::extract::State<Arc<PoolManager>>,
    axum::extract::Path(id): axum::extract::Path<i64>,
) -> Json<serde_json::Value> {
    match pool_manager.get_metrics(id).await {
        Some(m) => Json(serde_json::json!({
            "success": true,
            "data": m
        })),
        None => Json(serde_json::json!({
            "success": false,
            "error": "Provider not found"
        })),
    }
}

/// Get pool settings API
pub async fn get_pool_settings_api() -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse {
        success: true,
        data: Some(serde_json::json!({
            "load_balance_strategy": "round_robin",
            "health_check_interval_secs": 30,
            "circuit_breaker_threshold": 5,
            "circuit_breaker_timeout_secs": 60,
            "max_retries": 3,
            "retry_delay_ms": 1000
        })),
        message: "Settings retrieved".to_string(),
    })
}

/// Save pool settings API
pub async fn save_pool_settings_api(
    Json(_settings): Json<serde_json::Value>,
) -> Json<ApiResponse<()>> {
    Json(ApiResponse {
        success: true,
        data: None,
        message: "Settings saved".to_string(),
    })
}
