use axum::{routing::get, Router};
use crate::endpoints::ProxyState;
use crate::endpoints::basic::{health_check, info};

pub fn build_basic_routes(state: ProxyState) -> Router {
    Router::new()
        .route("/health", get(health_check))
        .route("/api/info", get(info))
        .with_state(state)
}
