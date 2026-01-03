use axum::{routing::get, Router};

pub fn build_basic_routes() -> Router {
    Router::new()
        .route("/health", get(|| async {
            axum::Json(serde_json::json!({
                "status": "healthy",
                "timestamp": chrono::Utc::now().to_rfc3339()
            }))
        }))
        .route("/api/info", get(|| async {
            axum::Json(serde_json::json!({
                "service": "LLM Link",
                "version": env!("CARGO_PKG_VERSION"),
                "mode": "multi-provider",
                "endpoints": {
                    "llm_api": "/v1/*",
                    "admin_api": "/api/*",
                    "pool_status": "/api/pool/status",
                    "pool_metrics": "/api/pool/metrics",
                    "health": "/health"
                }
            }))
        }))
}
