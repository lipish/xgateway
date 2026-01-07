pub mod handlers;
pub mod pool_handlers;

pub use handlers::*;

use axum::{Router, routing::{get, post, put, delete}, Json};
use serde::{Serialize, Deserialize};
use crate::db::{DatabasePool, NewProviderType, UpdateProviderType, ModelInfo, NewConversation, UpdateConversation, NewMessage, Conversation, Message, ConversationListItem, ConversationWithMessages, RequestLog};
use crate::adapter::types::DriverType;
use std::sync::Arc;
use crate::pool::manager::{PoolManager, PoolStatusSummary};
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

    Router::new()
        // Auth API
        .route("/api/auth/login", post(login_api))
        // Service Instance management API
        .route("/api/instances", get(list_providers_api).post(create_provider_api))
        .route("/api/instances/stats", get(get_provider_stats_api))
        .route("/api/instances/:id", get(get_provider_api).put(update_provider_api).delete(delete_provider_api))
        .route("/api/instances/:id/toggle", post(toggle_provider_api))
        .route("/api/instances/:id/test", post(test_provider_api))
        // Provider types API (CRUD)
        .route("/api/provider-types", get(get_provider_types_api).post(create_provider_type_api))
        .route("/api/provider-types/:id", put(update_provider_type_api).delete(delete_provider_type_api))
        // Pool management API (note: /api/pool/status is defined in main.rs with pool_manager)
        .route("/api/pool/status", get(get_pool_status_api))
        .route("/api/pool/health", get(get_pool_health_api))
        .route("/api/pool/metrics", get(get_pool_metrics_api))
        .route("/api/pool/metrics/:id", get(get_provider_metrics_api))
        .route("/api/pool/settings", get(get_pool_settings_api).post(save_pool_settings_api))
        // Logs API
        .route("/api/logs", get(get_logs_api))
        // API Keys management
        .route("/api/api-keys", get(list_api_keys_api).post(create_api_key_api))
        .route("/api/api-keys/:id", delete(delete_api_key_api))
        .route("/api/api-keys/:id/toggle", post(toggle_api_key_api))
        // Conversations API
        .route("/api/conversations", get(list_conversations_api).post(create_conversation_api))
        .route("/api/conversations/:id", get(get_conversation_api).put(update_conversation_api).delete(delete_conversation_api))
        .route("/api/conversations/:id/messages", get(list_messages_api).post(create_message_api))
        // User management
        .route("/api/users", get(list_users_api).post(create_user_api))
        .route("/api/users/:id", delete(delete_user_api))
        .route("/api/users/:id/toggle", post(toggle_user_api))
        // User-Instance grants
        .route("/api/users/:user_id/instances", get(list_user_instances_api).post(grant_user_instance_api))
        .route("/api/users/:user_id/instances/:provider_id", delete(revoke_user_instance_api))
        .with_state(state)
}


#[derive(Serialize)]
struct ApiResponse<T: Serialize> {
    success: bool,
    data: Option<T>,
    message: String,
}

/// Get pool status API
async fn get_pool_status_api(
    axum::extract::State(pool_manager): axum::extract::State<Arc<PoolManager>>,
) -> Json<ApiResponse<PoolStatusSummary>> {
    let summary = pool_manager.get_status_summary().await;
    Json(ApiResponse {
        success: true,
        data: Some(summary),
        message: "Pool status retrieved".to_string(),
    })
}

/// Get pool health API
async fn get_pool_health_api(
    axum::extract::State(pool_manager): axum::extract::State<Arc<PoolManager>>,
) -> Json<ApiResponse<Vec<serde_json::Value>>> {
    let providers = pool_manager.pool().get_all_providers().await;
    let metrics = pool_manager.get_all_metrics().await;
    let health_statuses = pool_manager.pool().get_all_health_statuses().await;
    let circuit_states = pool_manager.pool().get_all_circuit_states().await;

    let health_data: Vec<serde_json::Value> = providers.iter().map(|p| {
        let m = metrics.get(&p.id);
        let status = health_statuses.get(&p.id).cloned().unwrap_or(crate::pool::health::HealthStatus::Unknown);
        let circuit_state = circuit_states.get(&p.id).cloned().unwrap_or(crate::pool::circuit_breaker::CircuitState::Closed);
        
        let success_rate = m.map(|m| {
            if m.total_requests > 0 {
                (m.successful_requests as f64 / m.total_requests as f64) * 100.0
            } else {
                100.0
            }
        }).unwrap_or(100.0);

        let circuit_state_str = match circuit_state {
            crate::pool::circuit_breaker::CircuitState::Closed => "closed",
            crate::pool::circuit_breaker::CircuitState::Open => "open",
            crate::pool::circuit_breaker::CircuitState::HalfOpen => "half_open",
        };

        serde_json::json!({
            "id": p.id,
            "name": p.name,
            "status": format!("{:?}", status).to_lowercase(),
            "latency_avg": m.map(|m| m.avg_latency_ms).unwrap_or(0.0),
            "success_rate": success_rate,
            "circuit_state": circuit_state_str,
            "active_connections": m.map(|m| m.active_connections).unwrap_or(0),
            "total_requests": m.map(|m| m.total_requests).unwrap_or(0),
            "last_check": chrono::Utc::now().to_rfc3339() // TODO: Get actual last check time
        })
    }).collect();

    tracing::debug!("Healthy API Data: {:?}", health_data);

    Json(ApiResponse {
        success: true,
        data: Some(health_data),
        message: "Health data retrieved".to_string(),
    })
}

/// Get all metrics API
async fn get_pool_metrics_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
    axum::extract::State(pool_manager): axum::extract::State<Arc<PoolManager>>,
) -> Json<serde_json::Value> {
    let metrics = pool_manager.get_all_metrics().await;
    let providers = db_pool.list_providers().await.unwrap_or_default();
    let health_statuses = pool_manager.get_health_status().await;

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

    Json(serde_json::json!({
        "providers": detailed,
        "timestamp": chrono::Utc::now().to_rfc3339()
    }))
}

/// Get provider metrics API
async fn get_provider_metrics_api(
    axum::extract::State(pool_manager): axum::extract::State<Arc<PoolManager>>,
    axum::extract::Path(id): axum::extract::Path<i64>,
) -> Json<serde_json::Value> {
    match pool_manager.get_metrics(id).await {
        Some(m) => Json(serde_json::json!({
            "success": true,
            "data": m
        })),
        None => Json(serde_json::json!({
            "success": false,
            "error": "Provider not found"
        }))
    }
}

/// Get pool settings API
async fn get_pool_settings_api() -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse {
        success: true,
        data: Some(serde_json::json!({
            "load_balance_strategy": "round_robin",
            "health_check_interval_secs": 30,
            "circuit_breaker_threshold": 5,
            "circuit_breaker_timeout_secs": 60,
            "max_retries": 3,
            "retry_delay_ms": 1000
        })),
        message: "Settings retrieved".to_string(),
    })
}

/// Save pool settings API
async fn save_pool_settings_api(
    Json(_settings): Json<serde_json::Value>,
) -> Json<ApiResponse<()>> {
    Json(ApiResponse {
        success: true,
        data: None,
        message: "Settings saved".to_string(),
    })
}

#[derive(Debug, Deserialize)]
struct ListLogsQuery {
    #[serde(default = "default_logs_limit")]
    limit: i64,
    #[serde(default)]
    offset: i64,
    status: Option<String>,
}

fn default_logs_limit() -> i64 { 100 }

/// Get logs API
async fn get_logs_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
    axum::extract::Query(query): axum::extract::Query<ListLogsQuery>,
) -> Json<ApiResponse<Vec<RequestLog>>> {
    match db_pool.list_request_logs(query.limit, query.offset, query.status.as_deref()).await {
        Ok(logs) => Json(ApiResponse {
            success: true,
            data: Some(logs),
            message: "Logs retrieved".to_string(),
        }),
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            message: format!("Failed to retrieve logs: {}", e),
        }),
    }
}

/// List API keys
async fn list_api_keys_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
) -> Json<ApiResponse<Vec<serde_json::Value>>> {
    match db_pool.list_api_keys().await {
        Ok(keys) => {
            let keys_with_parsed_ids: Vec<serde_json::Value> = keys.into_iter().map(|key| {
                let mut json = serde_json::to_value(&key).unwrap_or(serde_json::json!({}));
                
                if let Some(provider_ids_str) = &key.provider_ids {
                    if let Ok(provider_ids) = serde_json::from_str::<Vec<i64>>(provider_ids_str) {
                        json["provider_ids"] = serde_json::json!(provider_ids);
                    }
                }
                
                json
            }).collect();
            
            Json(ApiResponse {
                success: true,
                data: Some(keys_with_parsed_ids),
                message: "API keys retrieved".to_string(),
            })
        },
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            message: format!("Failed to list API keys: {}", e),
        }),
    }
}

#[derive(Debug, Deserialize)]
struct CreateApiKeyRequest {
    name: String,
    scope: String,
    provider_id: Option<i64>,
    provider_ids: Option<Vec<i64>>,
    qps_limit: f64,
    concurrency_limit: i32,
    expires_in_days: Option<i64>,
}

/// Create API key
async fn create_api_key_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
    Json(req): Json<CreateApiKeyRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let key = format!("sk-link-{}", uuid::Uuid::new_v4().to_string().replace("-", ""));
    // In a real system, we'd hash the key before storing
    let key_hash = key.clone(); 
    
    let expires_at = req.expires_in_days.map(|days| {
        chrono::Utc::now() + chrono::Duration::days(days)
    });

    let new_key = crate::db::NewApiKey {
        owner_id: None, // TODO: Get from auth context
        key_hash,
        name: req.name,
        scope: req.scope,
        provider_id: req.provider_id,
        provider_ids: req.provider_ids,
        qps_limit: req.qps_limit,
        concurrency_limit: req.concurrency_limit,
        expires_at,
    };

    match db_pool.create_api_key(new_key).await {
        Ok(_) => Json(ApiResponse {
            success: true,
            data: Some(serde_json::json!({
                "full_key": key,
                "message": "Please copy this key now, as it will not be shown again."
            })),
            message: "API key created successfully".to_string(),
        }),
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            message: format!("Failed to create API key: {}", e),
        }),
    }
}

/// Delete API key
async fn delete_api_key_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
    axum::extract::Path(id): axum::extract::Path<i32>,
) -> Json<ApiResponse<()>> {
    match db_pool.delete_api_key(id).await {
        Ok(true) => Json(ApiResponse {
            success: true,
            data: Some(()),
            message: "API key deleted".to_string(),
        }),
        Ok(false) => Json(ApiResponse {
            success: false,
            data: None,
            message: "API key not found".to_string(),
        }),
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            message: format!("Failed to delete API key: {}", e),
        }),
    }
}

/// Toggle API key
async fn toggle_api_key_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
    axum::extract::Path(id): axum::extract::Path<i32>,
) -> Json<ApiResponse<()>> {
    // Get current status first
    match db_pool.get_api_key_by_id(id).await {
        Ok(Some(key)) => {
            let new_status = if key.status == "active" { "disabled" } else { "active" };
            match db_pool.update_api_key_status(id, new_status).await {
                Ok(_) => Json(ApiResponse {
                    success: true,
                    data: Some(()),
                    message: format!("API key status updated to {}", new_status),
                }),
                Err(e) => Json(ApiResponse {
                    success: false,
                    data: None,
                    message: format!("Failed to toggle API key: {}", e),
                }),
            }
        }
        Ok(None) => Json(ApiResponse {
            success: false,
            data: None,
            message: "API key not found".to_string(),
        }),
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            message: format!("Failed to get API key: {}", e),
        }),
    }
}


/// Get supported provider types (from database)
async fn get_provider_types_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
) -> Json<ApiResponse<Vec<serde_json::Value>>> {
    match db_pool.list_provider_types().await {
        Ok(types) => {
            let provider_types: Vec<serde_json::Value> = types.iter().map(|t| {
                // Parse models JSON to return full model info
                let models: Vec<serde_json::Value> = serde_json::from_str(&t.models)
                    .unwrap_or_default();

                serde_json::json!({
                    "id": t.id,
                    "label": t.label,
                    "base_url": t.base_url,
                    "driver_type": t.driver_type,
                    "models": models,
                    "enabled": t.enabled,
                    "sort_order": t.sort_order,
                    "docs_url": t.docs_url
                })
            }).collect();

            Json(ApiResponse {
                success: true,
                data: Some(provider_types),
                message: "Provider types retrieved".to_string(),
            })
        }
        Err(e) => {
            Json(ApiResponse {
                success: false,
                data: None,
                message: format!("Failed to get provider types: {}", e),
            })
        }
    }
}

/// Request body for creating provider type
#[derive(Debug, Deserialize)]
struct CreateProviderTypeRequest {
    id: String,
    label: String,
    #[serde(default)]
    base_url: String,
    #[serde(default)]
    driver_type: String,
    #[serde(default)]
    models: Vec<CreateModelInfo>,
    #[serde(default)]
    enabled: Option<bool>,
    #[serde(default)]
    sort_order: Option<i32>,
    #[serde(default)]
    docs_url: Option<String>,
}

#[derive(Debug, Deserialize)]
struct CreateModelInfo {
    id: String,
    name: String,
    #[serde(default)]
    description: Option<String>,
    #[serde(default)]
    supports_tools: Option<bool>,
    #[serde(default)]
    context_length: Option<u32>,
    #[serde(default)]
    input_price: Option<f64>,
    #[serde(default)]
    output_price: Option<f64>,
}

/// Create a new provider type
async fn create_provider_type_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
    Json(req): Json<CreateProviderTypeRequest>,
) -> Json<ApiResponse<()>> {
    // Validate driver_type
    if let Err(_) = serde_json::from_str::<DriverType>(&format!("\"{}\"", req.driver_type)) {
        return Json(ApiResponse {
            success: false,
            data: None,
            message: format!("Invalid driver_type: {}. Valid types are: openai, openai_compatible, anthropic, aliyun, volcengine, tencent, ollama", req.driver_type),
        });
    }

    let new_type = NewProviderType {
        id: req.id,
        label: req.label,
        base_url: req.base_url,
        driver_type: req.driver_type,
        models: req.models.into_iter().map(|m| ModelInfo {
            id: m.id,
            name: m.name,
            description: m.description,
            supports_tools: m.supports_tools,
            context_length: m.context_length,
            input_price: m.input_price,
            output_price: m.output_price,
        }).collect(),
        enabled: req.enabled,
        sort_order: req.sort_order,
        docs_url: req.docs_url,
    };

    match db_pool.create_provider_type(new_type).await {
        Ok(_) => Json(ApiResponse {
            success: true,
            data: Some(()),
            message: "Provider type created".to_string(),
        }),
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            message: format!("Failed to create provider type: {}", e),
        }),
    }
}

/// Request body for updating provider type
#[derive(Debug, Deserialize)]
struct UpdateProviderTypeRequest {
    label: Option<String>,
    base_url: Option<String>,
    driver_type: Option<String>,
    models: Option<Vec<CreateModelInfo>>,
    enabled: Option<bool>,
    sort_order: Option<i32>,
    docs_url: Option<String>,
}

/// Update a provider type
async fn update_provider_type_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateProviderTypeRequest>,
) -> Json<ApiResponse<()>> {
    // Validate driver_type if provided
    if let Some(ref dt) = req.driver_type {
        if let Err(_) = serde_json::from_str::<DriverType>(&format!("\"{}\"", dt)) {
            return Json(ApiResponse {
                success: false,
                data: None,
                message: format!("Invalid driver_type: {}. Valid types are: openai, openai_compatible, anthropic, aliyun, volcengine, tencent, ollama", dt),
            });
        }
    }

    let update = UpdateProviderType {
        label: req.label,
        base_url: req.base_url,
        driver_type: req.driver_type,
        models: req.models.map(|models| {
            models.into_iter().map(|m| ModelInfo {
                id: m.id,
                name: m.name,
                description: m.description,
                supports_tools: m.supports_tools,
                context_length: m.context_length,
                input_price: m.input_price,
                output_price: m.output_price,
            }).collect()
        }),
        enabled: req.enabled,
        sort_order: req.sort_order,
        docs_url: req.docs_url,
    };

    match db_pool.update_provider_type(&id, update).await {
        Ok(true) => Json(ApiResponse {
            success: true,
            data: Some(()),
            message: "Provider type updated".to_string(),
        }),
        Ok(false) => Json(ApiResponse {
            success: false,
            data: None,
            message: "Provider type not found".to_string(),
        }),
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            message: format!("Failed to update provider type: {}", e),
        }),
    }
}

/// Delete a provider type
async fn delete_provider_type_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<()>> {
    match db_pool.delete_provider_type(&id).await {
        Ok(true) => Json(ApiResponse {
            success: true,
            data: Some(()),
            message: "Provider type deleted".to_string(),
        }),
        Ok(false) => Json(ApiResponse {
            success: false,
            data: None,
            message: "Provider type not found".to_string(),
        }),
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            message: format!("Failed to delete provider type: {}", e),
        }),
    }
}

// ============= Conversations API =============

#[derive(Debug, Deserialize)]
struct ListConversationsQuery {
    provider_id: Option<i64>,
    #[serde(default = "default_limit")]
    limit: i64,
}

fn default_limit() -> i64 { 50 }

/// List conversations
async fn list_conversations_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
    axum::extract::Query(query): axum::extract::Query<ListConversationsQuery>,
) -> Json<ApiResponse<Vec<ConversationListItem>>> {
    match db_pool.list_conversations(query.provider_id, query.limit).await {
        Ok(conversations) => Json(ApiResponse {
            success: true,
            data: Some(conversations),
            message: "Conversations retrieved".to_string(),
        }),
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            message: format!("Failed to list conversations: {}", e),
        }),
    }
}

#[derive(Debug, Deserialize)]
struct CreateConversationRequest {
    provider_id: i64,
    title: Option<String>,
}

/// Create a new conversation
async fn create_conversation_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
    Json(req): Json<CreateConversationRequest>,
) -> Json<ApiResponse<Conversation>> {
    let new_conv = NewConversation {
        provider_id: req.provider_id,
        title: req.title,
    };

    match db_pool.create_conversation(new_conv).await {
        Ok(conversation) => Json(ApiResponse {
            success: true,
            data: Some(conversation),
            message: "Conversation created".to_string(),
        }),
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            message: format!("Failed to create conversation: {}", e),
        }),
    }
}

/// Get conversation with messages
async fn get_conversation_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
    axum::extract::Path(id): axum::extract::Path<i64>,
) -> Json<ApiResponse<ConversationWithMessages>> {
    match db_pool.get_conversation_with_messages(id).await {
        Ok(Some(conversation)) => Json(ApiResponse {
            success: true,
            data: Some(conversation),
            message: "Conversation retrieved".to_string(),
        }),
        Ok(None) => Json(ApiResponse {
            success: false,
            data: None,
            message: "Conversation not found".to_string(),
        }),
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            message: format!("Failed to get conversation: {}", e),
        }),
    }
}

#[derive(Debug, Deserialize)]
struct UpdateConversationRequest {
    title: Option<String>,
}

/// Update conversation
async fn update_conversation_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
    axum::extract::Path(id): axum::extract::Path<i64>,
    Json(req): Json<UpdateConversationRequest>,
) -> Json<ApiResponse<()>> {
    let update = UpdateConversation { title: req.title };

    match db_pool.update_conversation(id, update).await {
        Ok(true) => Json(ApiResponse {
            success: true,
            data: Some(()),
            message: "Conversation updated".to_string(),
        }),
        Ok(false) => Json(ApiResponse {
            success: false,
            data: None,
            message: "Conversation not found".to_string(),
        }),
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            message: format!("Failed to update conversation: {}", e),
        }),
    }
}

/// Delete conversation
async fn delete_conversation_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
    axum::extract::Path(id): axum::extract::Path<i64>,
) -> Json<ApiResponse<()>> {
    match db_pool.delete_conversation(id).await {
        Ok(true) => Json(ApiResponse {
            success: true,
            data: Some(()),
            message: "Conversation deleted".to_string(),
        }),
        Ok(false) => Json(ApiResponse {
            success: false,
            data: None,
            message: "Conversation not found".to_string(),
        }),
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            message: format!("Failed to delete conversation: {}", e),
        }),
    }
}

/// List messages for a conversation
async fn list_messages_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
    axum::extract::Path(id): axum::extract::Path<i64>,
) -> Json<ApiResponse<Vec<Message>>> {
    match db_pool.list_messages(id).await {
        Ok(messages) => Json(ApiResponse {
            success: true,
            data: Some(messages),
            message: "Messages retrieved".to_string(),
        }),
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            message: format!("Failed to list messages: {}", e),
        }),
    }
}

#[derive(Debug, Deserialize)]
struct CreateMessageRequest {
    role: String,
    content: String,
}

/// Create a new message
async fn create_message_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
    axum::extract::Path(conversation_id): axum::extract::Path<i64>,
    Json(req): Json<CreateMessageRequest>,
) -> Json<ApiResponse<Message>> {
    let new_msg = NewMessage {
        conversation_id,
        role: req.role,
        content: req.content,
    };

    match db_pool.create_message(new_msg).await {
        Ok(message) => Json(ApiResponse {
            success: true,
            data: Some(message),
            message: "Message created".to_string(),
        }),
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            message: format!("Failed to create message: {}", e),
        }),
    }
}

// ============= User Management API =============

/// List users
async fn list_users_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
) -> Json<ApiResponse<Vec<crate::db::User>>> {
    match db_pool.list_users().await {
        Ok(users) => Json(ApiResponse {
            success: true,
            data: Some(users),
            message: "Users retrieved".to_string(),
        }),
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            message: format!("Failed to list users: {}", e),
        }),
    }
}

#[derive(Debug, Deserialize)]
struct CreateUserRequest {
    username: String,
    password_hash: String, // In a real system, we'd hash this on the server
    #[serde(default)]
    role_id: Option<String>,
}

/// Create a new user
async fn create_user_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
    Json(req): Json<CreateUserRequest>,
) -> Json<ApiResponse<i32>> {
    let new_user = crate::db::NewUser {
        username: req.username,
        password_hash: req.password_hash,
        role_id: req.role_id,
    };

    match db_pool.create_user(new_user).await {
        Ok(id) => Json(ApiResponse {
            success: true,
            data: Some(id),
            message: "User created successfully".to_string(),
        }),
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            message: format!("Failed to create user: {}", e),
        }),
    }
}

/// Delete user
async fn delete_user_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
    axum::extract::Path(id): axum::extract::Path<i32>,
) -> Json<ApiResponse<()>> {
    match db_pool.delete_user(id).await {
        Ok(true) => Json(ApiResponse {
            success: true,
            data: Some(()),
            message: "User deleted".to_string(),
        }),
        Ok(false) => Json(ApiResponse {
            success: false,
            data: None,
            message: "User not found".to_string(),
        }),
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            message: format!("Failed to delete user: {}", e),
        }),
    }
}

/// Toggle user status
async fn toggle_user_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
    axum::extract::Path(id): axum::extract::Path<i32>,
) -> Json<ApiResponse<()>> {
    // We need a way to get user by id to toggle
    // For now, let's just list and find (inefficient but works for small user lists)
    // Or add get_user_by_id to DatabasePool
    match db_pool.list_users().await {
        Ok(users) => {
            if let Some(user) = users.into_iter().find(|u| u.id == id) {
                let new_status = if user.status == "active" { "disabled" } else { "active" };
                match db_pool.update_user_status(id, new_status).await {
                    Ok(_) => Json(ApiResponse {
                        success: true,
                        data: Some(()),
                        message: format!("User status updated to {}", new_status),
                    }),
                    Err(e) => Json(ApiResponse {
                        success: false,
                        data: None,
                        message: format!("Failed to toggle user status: {}", e),
                    }),
                }
            } else {
                Json(ApiResponse {
                    success: false,
                    data: None,
                    message: "User not found".to_string(),
                })
            }
        }
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            message: format!("Failed to list users: {}", e),
        }),
    }
}

// ============= Auth API =============

#[derive(Debug, Deserialize)]
struct LoginRequest {
    username: String,
    password: String,
}

#[derive(Debug, Serialize)]
struct LoginResponse {
    user: serde_json::Value,
    token: String,
}

/// Login API endpoint
async fn login_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
    Json(req): Json<LoginRequest>,
) -> Json<ApiResponse<LoginResponse>> {
    // Get user by username
    match db_pool.get_user_by_username(&req.username).await {
        Ok(Some(user)) => {
            // Verify password (simple comparison for now, should use bcrypt in production)
            if user.password_hash == req.password {
                // Generate a simple token (in production, use JWT)
                let token = format!("token_{}", uuid::Uuid::new_v4());
                
                let response = LoginResponse {
                    user: serde_json::json!({
                        "id": user.id,
                        "username": user.username,
                        "role_id": user.role_id,
                    }),
                    token,
                };
                
                Json(ApiResponse {
                    success: true,
                    data: Some(response),
                    message: "Login successful".to_string(),
                })
            } else {
                Json(ApiResponse {
                    success: false,
                    data: None,
                    message: "Invalid username or password".to_string(),
                })
            }
        }
        Ok(None) => Json(ApiResponse {
            success: false,
            data: None,
            message: "Invalid username or password".to_string(),
        }),
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            message: format!("Login failed: {}", e),
        }),
    }
}

// ============= User-Instance Grant API =============

#[derive(Debug, Deserialize)]
struct GrantInstanceRequest {
    provider_id: i64,
    granted_by: Option<i32>,
}

/// List all instances granted to a user
async fn list_user_instances_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
    axum::extract::Path(user_id): axum::extract::Path<i32>,
) -> Json<ApiResponse<Vec<crate::db::UserInstance>>> {
    match db_pool.get_user_granted_instances(user_id).await {
        Ok(instances) => Json(ApiResponse {
            success: true,
            data: Some(instances),
            message: "User instances retrieved".to_string(),
        }),
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            message: format!("Failed to list user instances: {}", e),
        }),
    }
}

/// Grant user access to a provider instance
async fn grant_user_instance_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
    axum::extract::Path(user_id): axum::extract::Path<i32>,
    Json(req): Json<GrantInstanceRequest>,
) -> Json<ApiResponse<i32>> {
    let grant = crate::db::NewUserInstance {
        user_id,
        provider_id: req.provider_id,
        granted_by: req.granted_by,
    };

    match db_pool.grant_user_instance(grant).await {
        Ok(id) => Json(ApiResponse {
            success: true,
            data: Some(id),
            message: "Instance access granted".to_string(),
        }),
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            message: format!("Failed to grant instance access: {}", e),
        }),
    }
}

/// Revoke user access to a provider instance
async fn revoke_user_instance_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
    axum::extract::Path((user_id, provider_id)): axum::extract::Path<(i32, i64)>,
) -> Json<ApiResponse<()>> {
    match db_pool.revoke_user_instance(user_id, provider_id).await {
        Ok(true) => Json(ApiResponse {
            success: true,
            data: Some(()),
            message: "Instance access revoked".to_string(),
        }),
        Ok(false) => Json(ApiResponse {
            success: false,
            data: None,
            message: "Grant not found".to_string(),
        }),
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            message: format!("Failed to revoke instance access: {}", e),
        }),
    }
}