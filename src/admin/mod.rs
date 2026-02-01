pub mod handlers;
pub mod pool_handlers;
pub mod auth_handlers;
pub mod api_key_handlers;
pub mod provider_type_handlers;
pub mod conversation_handlers;
pub mod user_handlers;
pub mod log_handlers;
pub mod chat_handlers;
pub mod organization_handlers;
pub mod project_handlers;
pub mod org_user_handlers;
pub mod auth_middleware;



use axum::{Router, routing::{get, post, put, delete}};
use serde::Serialize;
use crate::db::DatabasePool;
use std::sync::Arc;
use crate::pool::manager::PoolManager;
use axum::extract::FromRef;

/// Admin state for combined handlers
#[derive(Clone)]
pub struct AdminState {
    pub db_pool: DatabasePool,
    pub pool_manager: Arc<PoolManager>,
}

impl FromRef<AdminState> for DatabasePool {
    fn from_ref(state: &AdminState) -> Self {
        state.db_pool.clone()
    }
}

impl FromRef<AdminState> for Arc<PoolManager> {
    fn from_ref(state: &AdminState) -> Self {
        state.pool_manager.clone()
    }
}

/// Create admin API router (pure REST API, no HTML pages)
pub fn create_admin_app(db_pool: DatabasePool, pool_manager: Arc<PoolManager>) -> Router {
    let state = AdminState {
        db_pool,
        pool_manager,
    };

    let app = Router::new()
        // Auth API
        .route("/api/auth/login", post(auth_handlers::login_api))
        .route("/api/auth/register", post(auth_handlers::register_api))
        .route("/api/auth/forgot-password", post(auth_handlers::forgot_password_api))
        // Service Instance management API
        .route("/api/instances", get(handlers::list_providers_api).post(handlers::create_provider_api))
        .route("/api/instances/stats", get(handlers::get_provider_stats_api))
        .route("/api/instances/:id", get(handlers::get_provider_api).put(handlers::update_provider_api).delete(handlers::delete_provider_api))
        .route("/api/instances/:id/toggle", post(handlers::toggle_provider_api))
        .route("/api/instances/:id/test", post(handlers::test_provider_api))
        // Provider types API (CRUD)
        .route("/api/provider-types", get(provider_type_handlers::get_provider_types_api).post(provider_type_handlers::create_provider_type_api))
        .route("/api/provider-types/:id", put(provider_type_handlers::update_provider_type_api).delete(provider_type_handlers::delete_provider_type_api))
        // Organizations / Projects (Tenancy)
        .route("/api/organizations", get(organization_handlers::list_organizations_api).post(organization_handlers::create_organization_api))
        .route("/api/organizations/:id", put(organization_handlers::update_organization_api).delete(organization_handlers::delete_organization_api))
        .route("/api/organizations/:id/users", get(org_user_handlers::list_org_users_api).post(org_user_handlers::add_org_user_api))
        .route("/api/organizations/:id/users/:user_id", delete(org_user_handlers::remove_org_user_api))
        .route("/api/projects", get(project_handlers::list_projects_api).post(project_handlers::create_project_api))
        .route("/api/projects/:id", delete(project_handlers::delete_project_api))
        // Pool management API
        .route("/api/pool/status", get(pool_handlers::get_pool_status_api))
        .route("/api/pool/health", get(pool_handlers::get_pool_health_api))
        .route("/api/pool/metrics", get(pool_handlers::get_pool_metrics_api))
        .route("/api/pool/metrics/:id", get(pool_handlers::get_provider_metrics_api))
        .route("/api/pool/settings", get(pool_handlers::get_pool_settings_api).post(pool_handlers::save_pool_settings_api))
        // Logs API
        .route("/api/logs", get(log_handlers::get_logs_api))
        .route("/api/logs/hourly", get(log_handlers::get_hourly_requests_api))
        .route("/api/logs/latencies", get(log_handlers::get_provider_latencies_api))
        .route("/api/logs/today", get(log_handlers::get_today_stats_api))
        .route("/api/logs/performance", get(log_handlers::get_performance_stats_api))
        .route("/api/logs/top-models", get(log_handlers::get_top_models_api))
        .route("/api/logs/tokens/by-org", get(log_handlers::get_token_usage_by_org_api))
        .route("/api/logs/tokens/by-api-key", get(log_handlers::get_token_usage_by_api_key_api))
        .route("/api/logs/tokens/by-user", get(log_handlers::get_token_usage_by_user_api))
        // API Keys management
        .route("/api/api-keys", get(api_key_handlers::list_api_keys_api).post(api_key_handlers::create_api_key_api))
        .route("/api/api-keys/:id", put(api_key_handlers::update_api_key_api).delete(api_key_handlers::delete_api_key_api))
        .route("/api/api-keys/:id/toggle", post(api_key_handlers::toggle_api_key_api))
        .route("/api/api-keys/:id/rotate", post(api_key_handlers::rotate_api_key_api))
        // Conversations API
        .route("/api/conversations", get(conversation_handlers::list_conversations_api).post(conversation_handlers::create_conversation_api))
        .route("/api/conversations/:id", get(conversation_handlers::get_conversation_api).put(conversation_handlers::update_conversation_api).delete(conversation_handlers::delete_conversation_api))
        .route("/api/conversations/:id/messages", get(conversation_handlers::list_messages_api).post(conversation_handlers::create_message_api))
        // Admin chat test API
        .route("/api/chat/completions", post(chat_handlers::handle_admin_chat_completions))
        // User management
        .route("/api/users", get(user_handlers::list_users_api).post(user_handlers::create_user_api))
        .route("/api/users/:id", delete(user_handlers::delete_user_api).put(user_handlers::update_user_api))
        .route("/api/users/:id/toggle", post(user_handlers::toggle_user_api))
        // User-Instance grants
        .route("/api/users/:user_id/instances", get(user_handlers::list_user_instances_api).post(user_handlers::grant_user_instance_api))
        .route("/api/users/:user_id/instances/:provider_id", delete(user_handlers::revoke_user_instance_api))

        .layer(axum::middleware::from_fn_with_state(state.clone(), auth_middleware::admin_auth_middleware))
        .with_state(state);

    app
}

#[derive(Serialize)]
pub struct ApiResponse<T: Serialize> {
    pub success: bool,
    pub data: Option<T>,
    pub message: String,
}
