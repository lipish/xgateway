use std::sync::Arc;
use axum::Router;
use tower_http::cors::{Any, CorsLayer};
use tower_http::services::{ServeDir, ServeFile};
use crate::db::DatabasePool;
use crate::pool::PoolManager;
use crate::admin::create_admin_app;

mod llm;
mod pool;
mod basic;

use llm::build_llm_proxy_routes;
use pool::build_pool_status_routes;
use basic::build_basic_routes;

pub fn build_multi_mode_app(db_pool: DatabasePool, pool_manager: Arc<PoolManager>) -> Router {
    let admin_routes = create_admin_app(db_pool.clone());
    let llm_proxy_routes = build_llm_proxy_routes(db_pool.clone(), pool_manager.clone());
    let pool_status_routes = build_pool_status_routes(db_pool.clone(), pool_manager.clone());
    let basic_routes = build_basic_routes();

    let static_dir = std::env::current_dir()
        .unwrap_or_default()
        .join("admin/dist");

    let serve_dir = ServeDir::new(&static_dir)
        .not_found_service(ServeFile::new(static_dir.join("index.html")));

    basic_routes
        .merge(admin_routes)
        .merge(llm_proxy_routes)
        .merge(pool_status_routes)
        .fallback_service(serve_dir)
        .layer(
            CorsLayer::new()
                .allow_origin(Any)
                .allow_methods(Any)
                .allow_headers(Any)
        )
}
