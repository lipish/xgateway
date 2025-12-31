use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Provider {
    pub id: i64,
    pub name: String,
    #[sqlx(rename = "type")]
    pub provider_type: String,
    pub config: String,  // JSON string
    pub enabled: bool,
    pub priority: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewProvider {
    pub name: String,
    pub provider_type: String,
    pub config: String,
    pub enabled: bool,
    pub priority: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateProvider {
    pub name: Option<String>,
    pub provider_type: Option<String>,
    pub config: Option<String>,
    pub enabled: Option<bool>,
    pub priority: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(dead_code)]
pub struct Config {
    pub key: String,
    pub value: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderStats {
    pub total: usize,
    pub enabled: usize,
    pub disabled: usize,
}

impl Provider {
    #[allow(dead_code)] // Will be used in Phase 2 for provider creation
    pub fn new(name: String, provider_type: String, config: String) -> Self {
        let now = Utc::now();
        Self {
            id: 0,  // Will be set by database
            name,
            provider_type,
            config,
            enabled: true,
            priority: 0,
            created_at: now,
            updated_at: now,
        }
    }

    #[allow(dead_code)] // Will be used in Phase 2 for provider conversion
    pub fn from_new(new_provider: NewProvider) -> Self {
        let now = Utc::now();
        Self {
            id: 0,
            name: new_provider.name,
            provider_type: new_provider.provider_type,
            config: new_provider.config,
            enabled: new_provider.enabled,
            priority: new_provider.priority,
            created_at: now,
            updated_at: now,
        }
    }
}

impl NewProvider {
    #[allow(dead_code)]
    pub fn new(name: String, provider_type: String, config: String) -> Self {
        Self {
            name,
            provider_type,
            config,
            enabled: true,
            priority: 0,
        }
    }
}

/// Provider type configuration (stored in database, initialized from models.yaml)
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ProviderType {
    pub id: String,              // e.g., "openai", "anthropic"
    pub label: String,           // Display name
    pub base_url: String,        // Default API base URL
    pub default_model: String,   // Default model ID
    pub models: String,          // JSON array of model objects
    pub enabled: bool,
    pub sort_order: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Model info within a provider type
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelInfo {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub supports_tools: Option<bool>,
    #[serde(default)]
    pub context_length: Option<u32>,
}

/// For creating a new provider type
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewProviderType {
    pub id: String,
    pub label: String,
    pub base_url: String,
    pub default_model: String,
    pub models: Vec<ModelInfo>,
    #[serde(default)]
    pub enabled: Option<bool>,
    #[serde(default)]
    pub sort_order: Option<i32>,
}

/// For updating a provider type
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateProviderType {
    pub label: Option<String>,
    pub base_url: Option<String>,
    pub default_model: Option<String>,
    pub models: Option<Vec<ModelInfo>>,
    pub enabled: Option<bool>,
    pub sort_order: Option<i32>,
}

/// API response format for provider types
#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(dead_code)]
pub struct ProviderTypeResponse {
    pub id: String,
    pub label: String,
    pub base_url: String,
    pub default_model: String,
    pub models: Vec<String>,  // Just model IDs for the dropdown
}

impl ProviderType {
    /// Convert to API response format
    #[allow(dead_code)]
    pub fn to_response(&self) -> ProviderTypeResponse {
        let model_ids: Vec<String> = serde_json::from_str(&self.models)
            .map(|models: Vec<ModelInfo>| models.into_iter().map(|m| m.id).collect())
            .unwrap_or_default();

        ProviderTypeResponse {
            id: self.id.clone(),
            label: self.label.clone(),
            base_url: self.base_url.clone(),
            default_model: self.default_model.clone(),
            models: model_ids,
        }
    }
}

// ============= Conversation Models =============

/// Conversation - represents a chat session
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Conversation {
    pub id: i64,
    pub title: String,
    pub provider_id: i64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// For creating a new conversation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewConversation {
    pub title: Option<String>,
    pub provider_id: i64,
}

/// For updating a conversation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateConversation {
    pub title: Option<String>,
}

/// Message - represents a single message in a conversation
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Message {
    pub id: i64,
    pub conversation_id: i64,
    pub role: String,
    pub content: String,
    pub created_at: DateTime<Utc>,
}

/// For creating a new message
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewMessage {
    pub conversation_id: i64,
    pub role: String,
    pub content: String,
}

/// Conversation with messages for API response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConversationWithMessages {
    pub id: i64,
    pub title: String,
    pub provider_id: i64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub messages: Vec<Message>,
}

/// Conversation list item for sidebar
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ConversationListItem {
    pub id: i64,
    pub title: String,
    pub provider_id: i64,
    pub provider_name: Option<String>,
    pub updated_at: DateTime<Utc>,
    pub message_count: i64,
}


// ============ Request Log Models ============

/// Request log record
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct RequestLog {
    pub id: i64,
    pub provider_id: Option<i64>,
    pub provider_name: String,
    pub model: String,
    pub status: String,
    pub latency_ms: i64,
    pub tokens_used: i64,
    pub error_message: Option<String>,
    pub request_type: String,
    pub request_content: Option<String>,
    pub response_content: Option<String>,
    pub created_at: DateTime<Utc>,
}

/// New request log
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewRequestLog {
    pub provider_id: Option<i64>,
    pub provider_name: String,
    pub model: String,
    pub status: String,
    pub latency_ms: i64,
    pub tokens_used: i64,
    pub error_message: Option<String>,
    pub request_type: String,
    pub request_content: Option<String>,
    pub response_content: Option<String>,
}