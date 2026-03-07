use super::ApiResponse;
use crate::db::{
    Conversation, ConversationListItem, ConversationWithMessages, DatabasePool, Message,
    NewConversation, NewMessage, UpdateConversation,
};
use axum::Json;
use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct ListConversationsQuery {
    pub provider_id: Option<i64>,
    #[serde(default = "default_limit")]
    pub limit: i64,
}

fn default_limit() -> i64 {
    50
}

/// List conversations
pub async fn list_conversations_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
    axum::extract::Query(query): axum::extract::Query<ListConversationsQuery>,
) -> Json<ApiResponse<Vec<ConversationListItem>>> {
    match db_pool
        .list_conversations(query.provider_id, query.limit)
        .await
    {
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
pub struct CreateConversationRequest {
    pub provider_id: i64,
    pub title: Option<String>,
}

/// Create a new conversation
pub async fn create_conversation_api(
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
pub async fn get_conversation_api(
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
pub struct UpdateConversationRequest {
    pub title: Option<String>,
}

/// Update conversation
pub async fn update_conversation_api(
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
pub async fn delete_conversation_api(
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
pub async fn list_messages_api(
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
pub struct CreateMessageRequest {
    pub role: String,
    pub content: String,
}

/// Create a new message
pub async fn create_message_api(
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
