//! Pool Management API Handlers
//!
//! Provides endpoints for managing the provider pool:
//! - Pool status
//! - Health status
//! - Metrics
//! - Load balancing configuration

use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

use crate::pool::{
    ProviderPool, PoolStatus, LoadBalanceStrategy, HealthStatus,
    metrics::ProviderMetricsSummary,
};

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
pub async fn get_pool_status(
    State(state): State<Arc<PoolState>>,
) -> impl IntoResponse {
    let status = state.pool.get_pool_status().await;
    Json(PoolStatusResponse {
        status,
        load_balance_strategy: "round_robin".to_string(), // TODO: get from pool
    })
}

/// Get all provider health statuses
pub async fn get_all_health(
    State(state): State<Arc<PoolState>>,
) -> impl IntoResponse {
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
pub async fn get_all_metrics(
    State(state): State<Arc<PoolState>>,
) -> impl IntoResponse {
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
            weights: std::collections::HashMap::new()
        },
        "random" => LoadBalanceStrategy::Random,
        "priority" => LoadBalanceStrategy::Priority,
        "latency" | "latency_based" => LoadBalanceStrategy::LatencyBased,
        _ => return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
            "error": "Invalid strategy",
            "valid_strategies": ["round_robin", "least_connections", "weighted", "random", "priority", "latency"]
        }))),
    };

    state.pool.set_load_balance_strategy(strategy).await;
    (StatusCode::OK, Json(serde_json::json!({
        "message": "Strategy updated",
        "strategy": request.strategy
    })))
}

/// Set fallback chain for a provider
pub async fn set_fallback_chain(
    State(state): State<Arc<PoolState>>,
    Path(provider_id): Path<i64>,
    Json(request): Json<SetFallbackChainRequest>,
) -> impl IntoResponse {
    state.pool.set_fallback_chain(provider_id, request.fallback_ids.clone()).await;
    Json(serde_json::json!({
        "message": "Fallback chain updated",
        "provider_id": provider_id,
        "fallback_ids": request.fallback_ids
    }))
}

