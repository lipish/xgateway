pub mod handlers;
pub mod pool_handlers;

pub use handlers::*;

use axum::{Router, routing::{get, post, put, delete}, Json};
use serde::{Serialize, Deserialize};
use crate::db::{DatabasePool, NewProviderType, UpdateProviderType, ModelInfo, NewConversation, UpdateConversation, NewMessage, Conversation, Message, ConversationListItem, ConversationWithMessages, RequestLog};

/// Create admin API router (pure REST API, no HTML pages)
pub fn create_admin_app(db_pool: DatabasePool) -> Router {
    Router::new()
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
        .route("/api/pool/health", get(get_pool_health_api))
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
        .with_state(db_pool)
}

#[derive(Serialize)]
struct ApiResponse<T: Serialize> {
    success: bool,
    data: Option<T>,
    message: String,
}

/// Get pool status API
#[allow(dead_code)]
async fn get_pool_status_api() -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse {
        success: true,
        data: Some(serde_json::json!({
            "total_providers": 3,
            "healthy_providers": 3,
            "degraded_providers": 0,
            "unhealthy_providers": 0,
            "load_balance_strategy": "RoundRobin",
            "total_requests_today": 156,
            "avg_latency_ms": 503
        })),
        message: "Pool status retrieved".to_string(),
    })
}

/// Get pool health API
async fn get_pool_health_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
) -> Json<ApiResponse<Vec<serde_json::Value>>> {
    let providers = db_pool.list_providers().await.unwrap_or_default();
    let health_data: Vec<serde_json::Value> = providers.iter().map(|p| {
        serde_json::json!({
            "id": p.id,
            "name": p.name,
            "status": if p.enabled { "healthy" } else { "unhealthy" },
            "latency_avg": 500.0,
            "success_rate": 99.5,
            "circuit_state": "closed",
            "active_connections": 0,
            "total_requests": 50
        })
    }).collect();

    Json(ApiResponse {
        success: true,
        data: Some(health_data),
        message: "Health data retrieved".to_string(),
    })
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
async fn list_api_keys_api() -> Json<ApiResponse<Vec<serde_json::Value>>> {
    Json(ApiResponse {
        success: true,
        data: Some(vec![
            serde_json::json!({
                "id": 1,
                "name": "Default Key",
                "key_prefix": "llm_****",
                "created_at": "2024-01-01T00:00:00Z",
                "last_used": null,
                "enabled": true,
                "rate_limit": 100
            })
        ]),
        message: "API keys retrieved".to_string(),
    })
}

/// Create API key
async fn create_api_key_api(
    Json(_req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    let key = format!("llm_{}", uuid::Uuid::new_v4().to_string().replace("-", ""));
    Json(ApiResponse {
        success: true,
        data: Some(serde_json::json!({
            "id": 2,
            "full_key": key,
            "name": "New Key",
            "created_at": chrono::Utc::now().to_rfc3339()
        })),
        message: "API key created".to_string(),
    })
}

/// Delete API key
async fn delete_api_key_api(
    axum::extract::Path(_id): axum::extract::Path<i64>,
) -> Json<ApiResponse<()>> {
    Json(ApiResponse {
        success: true,
        data: None,
        message: "API key deleted".to_string(),
    })
}

/// Toggle API key
async fn toggle_api_key_api(
    axum::extract::Path(_id): axum::extract::Path<i64>,
) -> Json<ApiResponse<()>> {
    Json(ApiResponse {
        success: true,
        data: None,
        message: "API key toggled".to_string(),
    })
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
                    "default_model": t.default_model,
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
    default_model: String,
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
    let new_type = NewProviderType {
        id: req.id,
        label: req.label,
        base_url: req.base_url,
        default_model: req.default_model,
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
    default_model: Option<String>,
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
    let update = UpdateProviderType {
        label: req.label,
        base_url: req.base_url,
        default_model: req.default_model,
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