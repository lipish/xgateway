use std::sync::Arc;
use axum::{routing::get, Router};
use crate::db::DatabasePool;
use crate::pool::PoolManager;

pub fn build_pool_status_routes(db_pool: DatabasePool, pool_manager: Arc<PoolManager>) -> Router {
    let pool_manager_for_status = pool_manager.clone();
    let pool_manager_for_metrics = pool_manager.clone();
    let db_pool_for_metrics = db_pool.clone();

    Router::new()
        .route("/api/pool/status", get(move || {
            let pm = pool_manager_for_status.clone();
            async move {
                let summary = pm.get_status_summary().await;
                axum::Json(summary)
            }
        }))
        .route("/api/pool/metrics", get(move || {
            let pm = pool_manager_for_metrics.clone();
            let db = db_pool_for_metrics.clone();
            async move {
                let metrics = pm.get_all_metrics().await;
                let providers = db.list_providers().await.unwrap_or_default();
                let health_statuses = pm.get_health_status().await;

                let detailed: Vec<serde_json::Value> = providers.iter().map(|p| {
                    let m = metrics.get(&p.id).cloned().unwrap_or_default();
                    let health = health_statuses.get(&p.id).map(|s| format!("{:?}", s)).unwrap_or("Unknown".to_string());
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
                }).collect();

                axum::Json(serde_json::json!({
                    "providers": detailed,
                    "timestamp": chrono::Utc::now().to_rfc3339()
                }))
            }
        }))
        .route("/api/pool/metrics/:provider_id", get({
            let pm = pool_manager.clone();
            move |axum::extract::Path(provider_id): axum::extract::Path<i64>| {
                let pm = pm.clone();
                async move {
                    match pm.get_metrics(provider_id).await {
                        Some(m) => axum::Json(serde_json::json!({
                            "success": true,
                            "data": m
                        })),
                        None => axum::Json(serde_json::json!({
                            "success": false,
                            "error": "Provider not found"
                        }))
                    }
                }
            }
        }))
}
