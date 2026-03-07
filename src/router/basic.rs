use crate::endpoints::basic::{health_check, info};
use crate::endpoints::ProxyState;
use axum::{routing::get, Router};

pub fn build_basic_routes(state: ProxyState) -> Router {
    Router::new()
        .route("/health", get(health_check))
        .route("/api/info", get(info))
        .with_state(state)
}
