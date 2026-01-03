use std::sync::Arc;
use axum::{routing::{get, post}, Router};
use crate::db::DatabasePool;
use crate::pool::PoolManager;
use crate::endpoints::{ProxyState, handle_chat_completions, handle_list_models, handle_get_model};

pub fn build_llm_proxy_routes(db_pool: DatabasePool, pool_manager: Arc<PoolManager>) -> Router {
    let state = ProxyState { db_pool, pool_manager };

    Router::new()
        .route("/v1/chat/completions", post(handle_chat_completions))
        .route("/v1/models", get(handle_list_models))
        .route("/v1/models/:model", get(handle_get_model))
        .with_state(state)
}
