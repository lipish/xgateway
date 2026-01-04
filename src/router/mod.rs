use std::sync::Arc;
use axum::Router;
use tower_http::cors::{Any, CorsLayer};
use tower_http::services::{ServeDir, ServeFile};
use crate::db::DatabasePool;
use crate::pool::PoolManager;
use crate::admin::create_admin_app;

mod llm;
mod basic;

use llm::build_llm_proxy_routes;
use basic::build_basic_routes;

use crate::service::Service as LlmService;
use crate::settings::Settings;
use tokio::sync::RwLock;

pub fn build_multi_mode_app(
    db_pool: DatabasePool, 
    pool_manager: Arc<PoolManager>,
    llm_service: Arc<RwLock<LlmService>>,
    config: Arc<RwLock<Settings>>,
) -> Router {
    let admin_routes = create_admin_app(db_pool.clone(), pool_manager.clone());
    let llm_proxy_routes = build_llm_proxy_routes(
        db_pool.clone(), 
        pool_manager.clone(),
        llm_service.clone(),
        config.clone(),
    );
    
    // Create state for direct use in basic routes
    let state = crate::endpoints::ProxyState {
        db_pool,
        pool_manager,
        llm_service: llm_service.clone(),
        config: config.clone(),
    };
    let basic_routes = build_basic_routes(state);

    let static_dir = std::env::current_dir()
        .unwrap_or_default()
        .join("admin/dist");

    let serve_dir = ServeDir::new(&static_dir)
        .not_found_service(ServeFile::new(static_dir.join("index.html")));

    basic_routes
        .merge(admin_routes)
        .merge(llm_proxy_routes)
        .fallback_service(serve_dir)
        .layer(
            CorsLayer::new()
                .allow_origin(Any)
                .allow_methods(Any)
                .allow_headers(Any)
        )
}
