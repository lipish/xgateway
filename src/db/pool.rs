use sqlx::SqlitePool;
use std::path::Path;
use tracing::info;
use crate::db::{initialize_database, Provider, NewProvider, UpdateProvider, ProviderStats, ProviderType, NewProviderType, UpdateProviderType, ModelInfo, Conversation, NewConversation, UpdateConversation, Message, NewMessage, ConversationListItem, ConversationWithMessages, RequestLog, NewRequestLog};
use anyhow::Result;

#[derive(Clone)]
pub struct DatabasePool {
    pool: SqlitePool,
}

impl DatabasePool {
    /// Create new database pool with migrations
    pub async fn new(db_path: &Path) -> Result<Self> {
        let pool = initialize_database(db_path).await?;
        Ok(Self { pool })
    }

    /// Create in-memory database pool for Phase 1 fallback
    pub async fn new_memory() -> Result<Self> {
        info!("Creating in-memory database pool...");

        // Use shared cache mode so all connections share the same in-memory database
        // Without this, each connection in the pool gets its own empty database
        let pool = SqlitePool::connect("sqlite::memory:?mode=memory&cache=shared").await?;

        // Run migrations on in-memory database
        sqlx::migrate!("./migrations").run(&pool).await?;

        Ok(Self { pool })
    }

    /// Get the underlying SqlitePool
    #[allow(dead_code)] // Will be used in Phase 2 for advanced database operations
    pub fn inner(&self) -> &SqlitePool {
        &self.pool
    }

    /// Create a new provider
    pub async fn create_provider(&self, provider: NewProvider) -> Result<i64> {
        let result = sqlx::query(
            r#"
            INSERT INTO providers (name, type, config, enabled, priority)
            VALUES (?, ?, ?, ?, ?)
            "#
        )
        .bind(&provider.name)
        .bind(&provider.provider_type)
        .bind(&provider.config)
        .bind(provider.enabled)
        .bind(provider.priority)
        .execute(&self.pool)
        .await?;

        Ok(result.last_insert_rowid())
    }

    /// Get all providers
    pub async fn list_providers(&self) -> Result<Vec<Provider>> {
        let providers = sqlx::query_as::<_, Provider>(
            r#"
            SELECT 
                id,
                name,
                type,
                config,
                enabled,
                priority,
                created_at,
                updated_at
            FROM providers 
            ORDER BY priority DESC, created_at ASC
            "#
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(providers)
    }

    /// Get provider by ID
    pub async fn get_provider(&self, id: i64) -> Result<Option<Provider>> {
        let provider = sqlx::query_as::<_, Provider>(
            r#"
            SELECT 
                id,
                name,
                type,
                config,
                enabled,
                priority,
                created_at,
                updated_at
            FROM providers 
            WHERE id = ?
            "#
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(provider)
    }

    /// Get enabled providers
    #[allow(dead_code)] // Will be used in Phase 3 for multi-provider routing
    pub async fn get_enabled_providers(&self) -> Result<Vec<Provider>> {
        let providers = sqlx::query_as::<_, Provider>(
            r#"
            SELECT 
                id,
                name,
                type,
                config,
                enabled,
                priority,
                created_at,
                updated_at
            FROM providers 
            WHERE enabled = true
            ORDER BY priority DESC, created_at ASC
            "#
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(providers)
    }

    /// Update provider
    pub async fn update_provider(&self, id: i64, update: UpdateProvider) -> Result<bool> {
        let mut query = sqlx::QueryBuilder::new("UPDATE providers SET updated_at = CURRENT_TIMESTAMP");
        let mut has_updates = false;

        if let Some(name) = &update.name {
            query.push(", name = ");
            query.push_bind(name);
            has_updates = true;
        }
        if let Some(provider_type) = &update.provider_type {
            query.push(", type = ");
            query.push_bind(provider_type);
            has_updates = true;
        }
        if let Some(config) = &update.config {
            query.push(", config = ");
            query.push_bind(config);
            has_updates = true;
        }
        if let Some(enabled) = update.enabled {
            query.push(", enabled = ");
            query.push_bind(enabled);
            has_updates = true;
        }
        if let Some(priority) = update.priority {
            query.push(", priority = ");
            query.push_bind(priority);
            has_updates = true;
        }

        if !has_updates {
            return Ok(false);
        }

        query.push(" WHERE id = ");
        query.push_bind(id);

        let result = query.build().execute(&self.pool).await?;
        Ok(result.rows_affected() > 0)
    }

    /// Delete provider
    pub async fn delete_provider(&self, id: i64) -> Result<bool> {
        let result = sqlx::query("DELETE FROM providers WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }

    /// Check if this is the first run (no providers configured)
    pub async fn is_first_run(&self) -> Result<bool> {
        let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM providers")
            .fetch_one(&self.pool)
            .await?;

        Ok(count == 0)
    }

    /// Store configuration value
    pub async fn set_config(&self, key: &str, value: &str) -> Result<()> {
        sqlx::query(
            "INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)"
        )
        .bind(key)
        .bind(value)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// Get configuration value
    pub async fn get_config(&self, key: &str) -> Result<Option<String>> {
        let value: Option<String> = sqlx::query_scalar(
            "SELECT value FROM config WHERE key = ?"
        )
        .bind(key)
        .fetch_one(&self.pool)
        .await?;

        Ok(value)
    }

    /// Close database pool
    #[allow(dead_code)] // Will be used in Phase 2 for proper cleanup
    pub async fn close(&self) {
        self.pool.close().await;
    }

    /// Toggle provider enabled status
    pub async fn toggle_provider(&self, id: i64) -> Result<bool> {
        let result = sqlx::query(
            "UPDATE providers SET enabled = NOT enabled, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
        )
        .bind(id)
        .execute(&self.pool)
        .await?;

        Ok(result.rows_affected() > 0)
    }

    /// Get provider statistics
    pub async fn get_provider_stats(&self) -> Result<ProviderStats> {
        let total: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM providers")
            .fetch_one(&self.pool)
            .await?;

        let enabled: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM providers WHERE enabled = true")
            .fetch_one(&self.pool)
            .await?;

        Ok(ProviderStats {
            total: total as usize,
            enabled: enabled as usize,
            disabled: (total - enabled) as usize,
        })
    }

    // ========== Provider Types CRUD ==========

    /// List all provider types
    pub async fn list_provider_types(&self) -> Result<Vec<ProviderType>> {
        let types = sqlx::query_as::<_, ProviderType>(
            r#"
            SELECT id, label, base_url, default_model, models, enabled, sort_order, created_at, updated_at
            FROM provider_types
            WHERE enabled = true
            ORDER BY sort_order ASC, id ASC
            "#
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(types)
    }

    /// Get provider type by ID
    pub async fn get_provider_type(&self, id: &str) -> Result<Option<ProviderType>> {
        let pt = sqlx::query_as::<_, ProviderType>(
            r#"
            SELECT id, label, base_url, default_model, models, enabled, sort_order, created_at, updated_at
            FROM provider_types
            WHERE id = ?
            "#
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(pt)
    }

    /// Create a new provider type
    pub async fn create_provider_type(&self, pt: NewProviderType) -> Result<()> {
        let models_json = serde_json::to_string(&pt.models)?;

        sqlx::query(
            r#"
            INSERT INTO provider_types (id, label, base_url, default_model, models, enabled, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            "#
        )
        .bind(&pt.id)
        .bind(&pt.label)
        .bind(&pt.base_url)
        .bind(&pt.default_model)
        .bind(&models_json)
        .bind(pt.enabled.unwrap_or(true))
        .bind(pt.sort_order.unwrap_or(0))
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// Update a provider type
    pub async fn update_provider_type(&self, id: &str, update: UpdateProviderType) -> Result<bool> {
        let mut query = sqlx::QueryBuilder::new("UPDATE provider_types SET updated_at = CURRENT_TIMESTAMP");
        let mut has_updates = false;

        if let Some(label) = &update.label {
            query.push(", label = ");
            query.push_bind(label);
            has_updates = true;
        }
        if let Some(base_url) = &update.base_url {
            query.push(", base_url = ");
            query.push_bind(base_url);
            has_updates = true;
        }
        if let Some(default_model) = &update.default_model {
            query.push(", default_model = ");
            query.push_bind(default_model);
            has_updates = true;
        }
        if let Some(models) = &update.models {
            let models_json = serde_json::to_string(models)?;
            query.push(", models = ");
            query.push_bind(models_json);
            has_updates = true;
        }
        if let Some(enabled) = update.enabled {
            query.push(", enabled = ");
            query.push_bind(enabled);
            has_updates = true;
        }
        if let Some(sort_order) = update.sort_order {
            query.push(", sort_order = ");
            query.push_bind(sort_order);
            has_updates = true;
        }

        if !has_updates {
            return Ok(false);
        }

        query.push(" WHERE id = ");
        query.push_bind(id);

        let result = query.build().execute(&self.pool).await?;
        Ok(result.rows_affected() > 0)
    }

    /// Delete a provider type
    pub async fn delete_provider_type(&self, id: &str) -> Result<bool> {
        let result = sqlx::query("DELETE FROM provider_types WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }

    /// Check if provider_types table is empty
    pub async fn is_provider_types_empty(&self) -> Result<bool> {
        let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM provider_types")
            .fetch_one(&self.pool)
            .await?;

        Ok(count == 0)
    }

    /// Batch insert provider types (for initialization)
    pub async fn batch_insert_provider_types(&self, types: Vec<NewProviderType>) -> Result<()> {
        for (i, pt) in types.into_iter().enumerate() {
            let models_json = serde_json::to_string(&pt.models)?;

            sqlx::query(
                r#"
                INSERT OR IGNORE INTO provider_types (id, label, base_url, default_model, models, enabled, sort_order)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                "#
            )
            .bind(&pt.id)
            .bind(&pt.label)
            .bind(&pt.base_url)
            .bind(&pt.default_model)
            .bind(&models_json)
            .bind(pt.enabled.unwrap_or(true))
            .bind(pt.sort_order.unwrap_or(i as i32))
            .execute(&self.pool)
            .await?;
        }

        Ok(())
    }

    // ========== Conversation CRUD ==========

    /// Create a new conversation
    pub async fn create_conversation(&self, conv: NewConversation) -> Result<Conversation> {
        let title = conv.title.unwrap_or_else(|| "新对话".to_string());

        let result = sqlx::query(
            r#"
            INSERT INTO conversations (title, provider_id)
            VALUES (?, ?)
            "#
        )
        .bind(&title)
        .bind(conv.provider_id)
        .execute(&self.pool)
        .await?;

        let id = result.last_insert_rowid();

        // Fetch and return the created conversation
        let conversation = sqlx::query_as::<_, Conversation>(
            "SELECT id, title, provider_id, created_at, updated_at FROM conversations WHERE id = ?"
        )
        .bind(id)
        .fetch_one(&self.pool)
        .await?;

        Ok(conversation)
    }

    /// List conversations with provider info
    pub async fn list_conversations(&self, provider_id: Option<i64>, limit: i64) -> Result<Vec<ConversationListItem>> {
        let conversations = if let Some(pid) = provider_id {
            sqlx::query_as::<_, ConversationListItem>(
                r#"
                SELECT
                    c.id, c.title, c.provider_id, p.name as provider_name, c.updated_at,
                    (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as message_count
                FROM conversations c
                LEFT JOIN providers p ON c.provider_id = p.id
                WHERE c.provider_id = ?
                ORDER BY c.updated_at DESC
                LIMIT ?
                "#
            )
            .bind(pid)
            .bind(limit)
            .fetch_all(&self.pool)
            .await?
        } else {
            sqlx::query_as::<_, ConversationListItem>(
                r#"
                SELECT
                    c.id, c.title, c.provider_id, p.name as provider_name, c.updated_at,
                    (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as message_count
                FROM conversations c
                LEFT JOIN providers p ON c.provider_id = p.id
                ORDER BY c.updated_at DESC
                LIMIT ?
                "#
            )
            .bind(limit)
            .fetch_all(&self.pool)
            .await?
        };

        Ok(conversations)
    }

    /// Get conversation by ID
    pub async fn get_conversation(&self, id: i64) -> Result<Option<Conversation>> {
        let conv = sqlx::query_as::<_, Conversation>(
            "SELECT id, title, provider_id, created_at, updated_at FROM conversations WHERE id = ?"
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(conv)
    }

    /// Get conversation with messages
    pub async fn get_conversation_with_messages(&self, id: i64) -> Result<Option<ConversationWithMessages>> {
        let conv = self.get_conversation(id).await?;

        if let Some(c) = conv {
            let messages = self.list_messages(id).await?;
            Ok(Some(ConversationWithMessages {
                id: c.id,
                title: c.title,
                provider_id: c.provider_id,
                created_at: c.created_at,
                updated_at: c.updated_at,
                messages,
            }))
        } else {
            Ok(None)
        }
    }

    /// Update conversation
    pub async fn update_conversation(&self, id: i64, update: UpdateConversation) -> Result<bool> {
        if let Some(title) = update.title {
            let result = sqlx::query(
                "UPDATE conversations SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
            )
            .bind(&title)
            .bind(id)
            .execute(&self.pool)
            .await?;
            Ok(result.rows_affected() > 0)
        } else {
            Ok(false)
        }
    }

    /// Delete conversation (messages will be cascade deleted)
    pub async fn delete_conversation(&self, id: i64) -> Result<bool> {
        let result = sqlx::query("DELETE FROM conversations WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }

    // ========== Message CRUD ==========

    /// Create a new message
    pub async fn create_message(&self, msg: NewMessage) -> Result<Message> {
        let result = sqlx::query(
            r#"
            INSERT INTO messages (conversation_id, role, content)
            VALUES (?, ?, ?)
            "#
        )
        .bind(msg.conversation_id)
        .bind(&msg.role)
        .bind(&msg.content)
        .execute(&self.pool)
        .await?;

        let id = result.last_insert_rowid();

        // Update conversation's updated_at
        sqlx::query("UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?")
            .bind(msg.conversation_id)
            .execute(&self.pool)
            .await?;

        // Fetch and return the created message
        let message = sqlx::query_as::<_, Message>(
            "SELECT id, conversation_id, role, content, created_at FROM messages WHERE id = ?"
        )
        .bind(id)
        .fetch_one(&self.pool)
        .await?;

        Ok(message)
    }

    /// List messages for a conversation
    pub async fn list_messages(&self, conversation_id: i64) -> Result<Vec<Message>> {
        let messages = sqlx::query_as::<_, Message>(
            r#"
            SELECT id, conversation_id, role, content, created_at
            FROM messages
            WHERE conversation_id = ?
            ORDER BY created_at ASC
            "#
        )
        .bind(conversation_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(messages)
    }

    // ========== Request Log CRUD ==========

    /// Create a new request log
    pub async fn create_request_log(&self, log: NewRequestLog) -> Result<RequestLog> {
        let result = sqlx::query(
            r#"
            INSERT INTO request_logs (provider_id, provider_name, model, status, latency_ms, tokens_used, error_message, request_type, request_content, response_content)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#
        )
        .bind(log.provider_id)
        .bind(&log.provider_name)
        .bind(&log.model)
        .bind(&log.status)
        .bind(log.latency_ms)
        .bind(log.tokens_used)
        .bind(&log.error_message)
        .bind(&log.request_type)
        .bind(&log.request_content)
        .bind(&log.response_content)
        .execute(&self.pool)
        .await?;

        let id = result.last_insert_rowid();

        let created = sqlx::query_as::<_, RequestLog>(
            "SELECT * FROM request_logs WHERE id = ?"
        )
        .bind(id)
        .fetch_one(&self.pool)
        .await?;

        Ok(created)
    }

    /// List request logs with pagination
    pub async fn list_request_logs(&self, limit: i64, offset: i64, status_filter: Option<&str>) -> Result<Vec<RequestLog>> {
        let logs = if let Some(status) = status_filter {
            sqlx::query_as::<_, RequestLog>(
                r#"
                SELECT * FROM request_logs
                WHERE status = ?
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
                "#
            )
            .bind(status)
            .bind(limit)
            .bind(offset)
            .fetch_all(&self.pool)
            .await?
        } else {
            sqlx::query_as::<_, RequestLog>(
                r#"
                SELECT * FROM request_logs
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
                "#
            )
            .bind(limit)
            .bind(offset)
            .fetch_all(&self.pool)
            .await?
        };

        Ok(logs)
    }

    /// Get request log count
    pub async fn get_request_log_count(&self, status_filter: Option<&str>) -> Result<i64> {
        let count: (i64,) = if let Some(status) = status_filter {
            sqlx::query_as("SELECT COUNT(*) FROM request_logs WHERE status = ?")
                .bind(status)
                .fetch_one(&self.pool)
                .await?
        } else {
            sqlx::query_as("SELECT COUNT(*) FROM request_logs")
                .fetch_one(&self.pool)
                .await?
        };

        Ok(count.0)
    }

    /// Delete old request logs (cleanup)
    pub async fn delete_old_request_logs(&self, days: i64) -> Result<u64> {
        let result = sqlx::query(
            "DELETE FROM request_logs WHERE created_at < datetime('now', ? || ' days')"
        )
        .bind(-days)
        .execute(&self.pool)
        .await?;

        Ok(result.rows_affected())
    }
}
