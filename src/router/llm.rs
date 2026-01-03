use std::sync::Arc;
use axum::{routing::{get, post}, Router};
use crate::db::DatabasePool;
use crate::pool::PoolManager;
use crate::endpoints::{ProxyState, handle_chat_completions, handle_list_models, handle_get_model};
use crate::endpoints::emulators::{openai, ollama, anthropic};

use crate::service::Service as LlmService;
use crate::settings::Settings;
use tokio::sync::RwLock;

pub fn build_llm_proxy_routes(
    db_pool: DatabasePool, 
    pool_manager: Arc<PoolManager>,
    llm_service: Arc<RwLock<LlmService>>,
    config: Arc<RwLock<Settings>>,
) -> Router {
    let state = ProxyState { 
        db_pool, 
        pool_manager,
        llm_service,
        config,
    };

    let mut router = Router::new()
        // OpenAI Compatibility (Standard)
        .route("/v1/chat/completions", post(handle_chat_completions))
        .route("/v1/models", get(handle_list_models))
        .route("/v1/models/:model", get(handle_get_model));

    // Add specialized emulators from configuration
    // Note: In a more dynamic setup, these could be added based on settings
    
    // OpenAI Emulator (with specific adaptations)
    router = router.route("/openai/v1/chat/completions", post(openai::chat))
                   .route("/openai/v1/models", get(openai::models));

    // Ollama Emulator
    router = router.route("/api/chat", post(ollama::chat))
                   .route("/api/tags", get(ollama::models))
                   .route("/api/show", post(ollama::show_handler))
                   .route("/api/version", get(|| async {
                       axum::Json(serde_json::json!({
                           "version": "0.1.0",
                           "build": "llm-link"
                       }))
                   }));

    // Anthropic Emulator
    router = router.route("/v1/messages", post(anthropic::messages))
                   .route("/v1/complete", post(anthropic::messages)); // Fallback

    router.with_state(state)
}
