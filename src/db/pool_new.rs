use sqlx::{SqlitePool, PgPool, Row};
use std::path::Path;
use tracing::info;
use anyhow::Result;

use crate::db::{
    Provider, NewProvider, UpdateProvider, ProviderStats,
    ProviderType, NewProviderType, UpdateProviderType,
    Conversation, NewConversation, UpdateConversation,
    Message, NewMessage, ConversationListItem, ConversationWithMessages,
    RequestLog, NewRequestLog,
};

#[derive(Clone)]
pub enum DatabasePool {
    Sqlite(SqlitePool),
    Postgres(PgPool),
}

impl DatabasePool {
    pub async fn new_sqlite(db_path: &Path) -> Result<Self> {
        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| anyhow::anyhow!("Failed to create directory: {}", e))?;
        }

        let connection_string = format!("sqlite://{}?mode=rwc", db_path.display());
        info!("Connecting to SQLite: {}", connection_string);
        
        let pool = SqlitePool::connect(&connection_string).await?;
        sqlx::migrate!("./migrations/sqlite").run(&pool).await?;
        
        info!("✅ SQLite database initialized");
        Ok(Self::Sqlite(pool))
    }

    pub async fn new_postgres(connection_string: &str) -> Result<Self> {
        info!("Connecting to PostgreSQL...");
        
        let pool = PgPool::connect(connection_string).await?;
        sqlx::migrate!("./migrations/postgres").run(&pool).await?;
        
        info!("✅ PostgreSQL database initialized");
        Ok(Self::Postgres(pool))
    }

    pub async fn new_sqlite_memory() -> Result<Self> {
        info!("Creating in-memory SQLite database...");
        
        let pool = SqlitePool::connect("sqlite::memory:?mode=memory&cache=shared").await?;
        sqlx::migrate!("./migrations/sqlite").run(&pool).await?;
        
        Ok(Self::Sqlite(pool))
    }

    pub async fn close(&self) {
        match self {
            Self::Sqlite(pool) => pool.close().await,
            Self::Postgres(pool) => pool.close().await,
        }
    }

    // ========== Provider CRUD ==========

    pub async fn create_provider(&self, provider: NewProvider) -> Result<i64> {
        match self {
            Self::Sqlite(pool) => {
                let result = sqlx::query(
                    "INSERT INTO providers (name, type, config, enabled, priority) VALUES (?, ?, ?, ?, ?)"
                )
                .bind(&provider.name)
                .bind(&provider.provider_type)
                .bind(&provider.config)
                .bind(provider.enabled)
                .bind(provider.priority)
                .execute(pool)
                .await?;
                Ok(result.last_insert_rowid())
            }
            Self::Postgres(pool) => {
                let row = sqlx::query(
                    "INSERT INTO providers (name, type, config, enabled, priority) VALUES ($1, $2, $3, $4, $5) RETURNING id"
                )
                .bind(&provider.name)
                .bind(&provider.provider_type)
                .bind(&provider.config)
                .bind(provider.enabled)
                .bind(provider.priority)
                .fetch_one(pool)
                .await?;
                Ok(row.get("id"))
            }
        }
    }

    pub async fn list_providers(&self) -> Result<Vec<Provider>> {
        let query = r#"
            SELECT id, name, type, config, enabled, priority, created_at, updated_at
            FROM providers 
            ORDER BY priority DESC, created_at ASC
        "#;
        
        match self {
            Self::Sqlite(pool) => {
                Ok(sqlx::query_as::<_, Provider>(query).fetch_all(pool).await?)
            }
            Self::Postgres(pool) => {
                Ok(sqlx::query_as::<_, Provider>(query).fetch_all(pool).await?)
            }
        }
    }

    pub async fn get_provider(&self, id: i64) -> Result<Option<Provider>> {
        match self {
            Self::Sqlite(pool) => {
                Ok(sqlx::query_as::<_, Provider>(
                    "SELECT id, name, type, config, enabled, priority, created_at, updated_at FROM providers WHERE id = ?"
                )
                .bind(id)
                .fetch_optional(pool)
                .await?)
            }
            Self::Postgres(pool) => {
                Ok(sqlx::query_as::<_, Provider>(
                    "SELECT id, name, type, config, enabled, priority, created_at, updated_at FROM providers WHERE id = $1"
                )
                .bind(id)
                .fetch_optional(pool)
                .await?)
            }
        }
    }

    pub async fn get_enabled_providers(&self) -> Result<Vec<Provider>> {
        let query = r#"
            SELECT id, name, type, config, enabled, priority, created_at, updated_at
            FROM providers 
            WHERE enabled = true
            ORDER BY priority DESC, created_at ASC
        "#;
        
        match self {
            Self::Sqlite(pool) => {
                Ok(sqlx::query_as::<_, Provider>(query).fetch_all(pool).await?)
            }
            Self::Postgres(pool) => {
                Ok(sqlx::query_as::<_, Provider>(query).fetch_all(pool).await?)
            }
        }
    }

    pub async fn update_provider(&self, id: i64, update: UpdateProvider) -> Result<bool> {
        match self {
            Self::Sqlite(pool) => self.update_provider_sqlite(pool, id, update).await,
            Self::Postgres(pool) => self.update_provider_postgres(pool, id, update).await,
        }
    }

    async fn update_provider_sqlite(&self, pool: &SqlitePool, id: i64, update: UpdateProvider) -> Result<bool> {
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

        let result = query.build().execute(pool).await?;
        Ok(result.rows_affected() > 0)
    }

    async fn update_provider_postgres(&self, pool: &PgPool, id: i64, update: UpdateProvider) -> Result<bool> {
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

        let result = query.build().execute(pool).await?;
        Ok(result.rows_affected() > 0)
    }

    pub async fn delete_provider(&self, id: i64) -> Result<bool> {
        match self {
            Self::Sqlite(pool) => {
                let result = sqlx::query("DELETE FROM providers WHERE id = ?")
                    .bind(id)
                    .execute(pool)
                    .await?;
                Ok(result.rows_affected() > 0)
            }
            Self::Postgres(pool) => {
                let result = sqlx::query("DELETE FROM providers WHERE id = $1")
                    .bind(id)
                    .execute(pool)
                    .await?;
                Ok(result.rows_affected() > 0)
            }
        }
    }

    pub async fn toggle_provider(&self, id: i64) -> Result<bool> {
        match self {
            Self::Sqlite(pool) => {
                let result = sqlx::query(
                    "UPDATE providers SET enabled = NOT enabled, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
                )
                .bind(id)
                .execute(pool)
                .await?;
                Ok(result.rows_affected() > 0)
            }
            Self::Postgres(pool) => {
                let result = sqlx::query(
                    "UPDATE providers SET enabled = NOT enabled, updated_at = CURRENT_TIMESTAMP WHERE id = $1"
                )
                .bind(id)
                .execute(pool)
                .await?;
                Ok(result.rows_affected() > 0)
            }
        }
    }

    pub async fn get_provider_stats(&self) -> Result<ProviderStats> {
        match self {
            Self::Sqlite(pool) => {
                let total: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM providers")
                    .fetch_one(pool).await?;
                let enabled: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM providers WHERE enabled = true")
                    .fetch_one(pool).await?;
                Ok(ProviderStats {
                    total: total as usize,
                    enabled: enabled as usize,
                    disabled: (total - enabled) as usize,
                })
            }
            Self::Postgres(pool) => {
                let total: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM providers")
                    .fetch_one(pool).await?;
                let enabled: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM providers WHERE enabled = true")
                    .fetch_one(pool).await?;
                Ok(ProviderStats {
                    total: total as usize,
                    enabled: enabled as usize,
                    disabled: (total - enabled) as usize,
                })
            }
        }
    }

    pub async fn is_first_run(&self) -> Result<bool> {
        match self {
            Self::Sqlite(pool) => {
                let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM providers")
                    .fetch_one(pool).await?;
                Ok(count == 0)
            }
            Self::Postgres(pool) => {
                let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM providers")
                    .fetch_one(pool).await?;
                Ok(count == 0)
            }
        }
    }

    // ========== Config ==========

    pub async fn set_config(&self, key: &str, value: &str) -> Result<()> {
        match self {
            Self::Sqlite(pool) => {
                sqlx::query("INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)")
                    .bind(key).bind(value)
                    .execute(pool).await?;
            }
            Self::Postgres(pool) => {
                sqlx::query("INSERT INTO config (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2")
                    .bind(key).bind(value)
                    .execute(pool).await?;
            }
        }
        Ok(())
    }

    pub async fn get_config(&self, key: &str) -> Result<Option<String>> {
        match self {
            Self::Sqlite(pool) => {
                Ok(sqlx::query_scalar("SELECT value FROM config WHERE key = ?")
                    .bind(key).fetch_optional(pool).await?)
            }
            Self::Postgres(pool) => {
                Ok(sqlx::query_scalar("SELECT value FROM config WHERE key = $1")
                    .bind(key).fetch_optional(pool).await?)
            }
        }
    }

    // ========== Provider Types CRUD ==========

    pub async fn list_provider_types(&self) -> Result<Vec<ProviderType>> {
        let query = r#"
            SELECT id, label, base_url, default_model, models, enabled, sort_order, docs_url, created_at, updated_at
            FROM provider_types
            WHERE enabled = true
            ORDER BY sort_order ASC, id ASC
        "#;
        
        match self {
            Self::Sqlite(pool) => Ok(sqlx::query_as::<_, ProviderType>(query).fetch_all(pool).await?),
            Self::Postgres(pool) => Ok(sqlx::query_as::<_, ProviderType>(query).fetch_all(pool).await?),
        }
    }

    pub async fn get_provider_type(&self, id: &str) -> Result<Option<ProviderType>> {
        match self {
            Self::Sqlite(pool) => {
                Ok(sqlx::query_as::<_, ProviderType>(
                    "SELECT id, label, base_url, default_model, models, enabled, sort_order, docs_url, created_at, updated_at FROM provider_types WHERE id = ?"
                )
                .bind(id).fetch_optional(pool).await?)
            }
            Self::Postgres(pool) => {
                Ok(sqlx::query_as::<_, ProviderType>(
                    "SELECT id, label, base_url, default_model, models, enabled, sort_order, docs_url, created_at, updated_at FROM provider_types WHERE id = $1"
                )
                .bind(id).fetch_optional(pool).await?)
            }
        }
    }

    pub async fn create_provider_type(&self, pt: NewProviderType) -> Result<()> {
        let models_json = serde_json::to_string(&pt.models)?;
        
        match self {
            Self::Sqlite(pool) => {
                sqlx::query(
                    "INSERT INTO provider_types (id, label, base_url, default_model, models, enabled, sort_order, docs_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
                )
                .bind(&pt.id).bind(&pt.label).bind(&pt.base_url).bind(&pt.default_model)
                .bind(&models_json).bind(pt.enabled.unwrap_or(true)).bind(pt.sort_order.unwrap_or(0)).bind(pt.docs_url.unwrap_or_default())
                .execute(pool).await?;
            }
            Self::Postgres(pool) => {
                sqlx::query(
                    "INSERT INTO provider_types (id, label, base_url, default_model, models, enabled, sort_order, docs_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)"
                )
                .bind(&pt.id).bind(&pt.label).bind(&pt.base_url).bind(&pt.default_model)
                .bind(&models_json).bind(pt.enabled.unwrap_or(true)).bind(pt.sort_order.unwrap_or(0)).bind(pt.docs_url.unwrap_or_default())
                .execute(pool).await?;
            }
        }
        Ok(())
    }

    pub async fn update_provider_type(&self, id: &str, update: UpdateProviderType) -> Result<bool> {
        match self {
            Self::Sqlite(pool) => self.update_provider_type_sqlite(pool, id, update).await,
            Self::Postgres(pool) => self.update_provider_type_postgres(pool, id, update).await,
        }
    }

    async fn update_provider_type_sqlite(&self, pool: &SqlitePool, id: &str, update: UpdateProviderType) -> Result<bool> {
        let mut query = sqlx::QueryBuilder::new("UPDATE provider_types SET updated_at = CURRENT_TIMESTAMP");
        let mut has_updates = false;

        if let Some(label) = &update.label {
            query.push(", label = "); query.push_bind(label); has_updates = true;
        }
        if let Some(base_url) = &update.base_url {
            query.push(", base_url = "); query.push_bind(base_url); has_updates = true;
        }
        if let Some(default_model) = &update.default_model {
            query.push(", default_model = "); query.push_bind(default_model); has_updates = true;
        }
        if let Some(models) = &update.models {
            let models_json = serde_json::to_string(models)?;
            query.push(", models = "); query.push_bind(models_json); has_updates = true;
        }
        if let Some(enabled) = update.enabled {
            query.push(", enabled = "); query.push_bind(enabled); has_updates = true;
        }
        if let Some(sort_order) = update.sort_order {
            query.push(", sort_order = "); query.push_bind(sort_order); has_updates = true;
        }
        if let Some(docs_url) = &update.docs_url {
            query.push(", docs_url = "); query.push_bind(docs_url); has_updates = true;
        }

        if !has_updates { return Ok(false); }

        query.push(" WHERE id = "); query.push_bind(id);
        let result = query.build().execute(pool).await?;
        Ok(result.rows_affected() > 0)
    }

    async fn update_provider_type_postgres(&self, pool: &PgPool, id: &str, update: UpdateProviderType) -> Result<bool> {
        let mut query = sqlx::QueryBuilder::new("UPDATE provider_types SET updated_at = CURRENT_TIMESTAMP");
        let mut has_updates = false;

        if let Some(label) = &update.label {
            query.push(", label = "); query.push_bind(label); has_updates = true;
        }
        if let Some(base_url) = &update.base_url {
            query.push(", base_url = "); query.push_bind(base_url); has_updates = true;
        }
        if let Some(default_model) = &update.default_model {
            query.push(", default_model = "); query.push_bind(default_model); has_updates = true;
        }
        if let Some(models) = &update.models {
            let models_json = serde_json::to_string(models)?;
            query.push(", models = "); query.push_bind(models_json); has_updates = true;
        }
        if let Some(enabled) = update.enabled {
            query.push(", enabled = "); query.push_bind(enabled); has_updates = true;
        }
        if let Some(sort_order) = update.sort_order {
            query.push(", sort_order = "); query.push_bind(sort_order); has_updates = true;
        }
        if let Some(docs_url) = &update.docs_url {
            query.push(", docs_url = "); query.push_bind(docs_url); has_updates = true;
        }

        if !has_updates { return Ok(false); }

        query.push(" WHERE id = "); query.push_bind(id);
        let result = query.build().execute(pool).await?;
        Ok(result.rows_affected() > 0)
    }

    pub async fn delete_provider_type(&self, id: &str) -> Result<bool> {
        match self {
            Self::Sqlite(pool) => {
                let result = sqlx::query("DELETE FROM provider_types WHERE id = ?")
                    .bind(id).execute(pool).await?;
                Ok(result.rows_affected() > 0)
            }
            Self::Postgres(pool) => {
                let result = sqlx::query("DELETE FROM provider_types WHERE id = $1")
                    .bind(id).execute(pool).await?;
                Ok(result.rows_affected() > 0)
            }
        }
    }

    pub async fn is_provider_types_empty(&self) -> Result<bool> {
        match self {
            Self::Sqlite(pool) => {
                let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM provider_types")
                    .fetch_one(pool).await?;
                Ok(count == 0)
            }
            Self::Postgres(pool) => {
                let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM provider_types")
                    .fetch_one(pool).await?;
                Ok(count == 0)
            }
        }
    }

    pub async fn batch_insert_provider_types(&self, types: Vec<NewProviderType>) -> Result<()> {
        for (i, pt) in types.into_iter().enumerate() {
            let models_json = serde_json::to_string(&pt.models)?;
            
            match self {
                Self::Sqlite(pool) => {
                    sqlx::query(
                        "INSERT OR IGNORE INTO provider_types (id, label, base_url, default_model, models, enabled, sort_order, docs_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
                    )
                    .bind(&pt.id).bind(&pt.label).bind(&pt.base_url).bind(&pt.default_model)
                    .bind(&models_json).bind(pt.enabled.unwrap_or(true)).bind(pt.sort_order.unwrap_or(i as i32)).bind(pt.docs_url.unwrap_or_default())
                    .execute(pool).await?;
                }
                Self::Postgres(pool) => {
                    sqlx::query(
                        "INSERT INTO provider_types (id, label, base_url, default_model, models, enabled, sort_order, docs_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (id) DO NOTHING"
                    )
                    .bind(&pt.id).bind(&pt.label).bind(&pt.base_url).bind(&pt.default_model)
                    .bind(&models_json).bind(pt.enabled.unwrap_or(true)).bind(pt.sort_order.unwrap_or(i as i32)).bind(pt.docs_url.unwrap_or_default())
                    .execute(pool).await?;
                }
            }
        }
        Ok(())
    }

    // ========== Conversation CRUD ==========

    pub async fn create_conversation(&self, conv: NewConversation) -> Result<Conversation> {
        let title = conv.title.unwrap_or_else(|| "新对话".to_string());
        
        match self {
            Self::Sqlite(pool) => {
                let result = sqlx::query("INSERT INTO conversations (title, provider_id) VALUES (?, ?)")
                    .bind(&title).bind(conv.provider_id).execute(pool).await?;
                let id = result.last_insert_rowid();
                Ok(sqlx::query_as::<_, Conversation>(
                    "SELECT id, title, provider_id, created_at, updated_at FROM conversations WHERE id = ?"
                ).bind(id).fetch_one(pool).await?)
            }
            Self::Postgres(pool) => {
                let row = sqlx::query(
                    "INSERT INTO conversations (title, provider_id) VALUES ($1, $2) RETURNING id, title, provider_id, created_at, updated_at"
                )
                .bind(&title).bind(conv.provider_id).fetch_one(pool).await?;
                Ok(Conversation {
                    id: row.get("id"),
                    title: row.get("title"),
                    provider_id: row.get("provider_id"),
                    created_at: row.get("created_at"),
                    updated_at: row.get("updated_at"),
                })
            }
        }
    }

    pub async fn list_conversations(&self, provider_id: Option<i64>, limit: i64) -> Result<Vec<ConversationListItem>> {
        match self {
            Self::Sqlite(pool) => self.list_conversations_sqlite(pool, provider_id, limit).await,
            Self::Postgres(pool) => self.list_conversations_postgres(pool, provider_id, limit).await,
        }
    }

    async fn list_conversations_sqlite(&self, pool: &SqlitePool, provider_id: Option<i64>, limit: i64) -> Result<Vec<ConversationListItem>> {
        if let Some(pid) = provider_id {
            Ok(sqlx::query_as::<_, ConversationListItem>(
                r#"SELECT c.id, c.title, c.provider_id, p.name as provider_name, c.updated_at,
                   (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as message_count
                   FROM conversations c LEFT JOIN providers p ON c.provider_id = p.id
                   WHERE c.provider_id = ? ORDER BY c.updated_at DESC LIMIT ?"#
            ).bind(pid).bind(limit).fetch_all(pool).await?)
        } else {
            Ok(sqlx::query_as::<_, ConversationListItem>(
                r#"SELECT c.id, c.title, c.provider_id, p.name as provider_name, c.updated_at,
                   (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as message_count
                   FROM conversations c LEFT JOIN providers p ON c.provider_id = p.id
                   ORDER BY c.updated_at DESC LIMIT ?"#
            ).bind(limit).fetch_all(pool).await?)
        }
    }

    async fn list_conversations_postgres(&self, pool: &PgPool, provider_id: Option<i64>, limit: i64) -> Result<Vec<ConversationListItem>> {
        if let Some(pid) = provider_id {
            Ok(sqlx::query_as::<_, ConversationListItem>(
                r#"SELECT c.id, c.title, c.provider_id, p.name as provider_name, c.updated_at,
                   (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as message_count
                   FROM conversations c LEFT JOIN providers p ON c.provider_id = p.id
                   WHERE c.provider_id = $1 ORDER BY c.updated_at DESC LIMIT $2"#
            ).bind(pid).bind(limit).fetch_all(pool).await?)
        } else {
            Ok(sqlx::query_as::<_, ConversationListItem>(
                r#"SELECT c.id, c.title, c.provider_id, p.name as provider_name, c.updated_at,
                   (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as message_count
                   FROM conversations c LEFT JOIN providers p ON c.provider_id = p.id
                   ORDER BY c.updated_at DESC LIMIT $1"#
            ).bind(limit).fetch_all(pool).await?)
        }
    }

    pub async fn get_conversation(&self, id: i64) -> Result<Option<Conversation>> {
        match self {
            Self::Sqlite(pool) => {
                Ok(sqlx::query_as::<_, Conversation>(
                    "SELECT id, title, provider_id, created_at, updated_at FROM conversations WHERE id = ?"
                ).bind(id).fetch_optional(pool).await?)
            }
            Self::Postgres(pool) => {
                Ok(sqlx::query_as::<_, Conversation>(
                    "SELECT id, title, provider_id, created_at, updated_at FROM conversations WHERE id = $1"
                ).bind(id).fetch_optional(pool).await?)
            }
        }
    }

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

    pub async fn update_conversation(&self, id: i64, update: UpdateConversation) -> Result<bool> {
        match self {
            Self::Sqlite(pool) => {
                if let Some(title) = &update.title {
                    let result = sqlx::query("UPDATE conversations SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
                        .bind(title).bind(id).execute(pool).await?;
                    Ok(result.rows_affected() > 0)
                } else {
                    Ok(false)
                }
            }
            Self::Postgres(pool) => {
                if let Some(title) = &update.title {
                    let result = sqlx::query("UPDATE conversations SET title = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2")
                        .bind(title).bind(id).execute(pool).await?;
                    Ok(result.rows_affected() > 0)
                } else {
                    Ok(false)
                }
            }
        }
    }

    pub async fn delete_conversation(&self, id: i64) -> Result<bool> {
        match self {
            Self::Sqlite(pool) => {
                let result = sqlx::query("DELETE FROM conversations WHERE id = ?")
                    .bind(id).execute(pool).await?;
                Ok(result.rows_affected() > 0)
            }
            Self::Postgres(pool) => {
                let result = sqlx::query("DELETE FROM conversations WHERE id = $1")
                    .bind(id).execute(pool).await?;
                Ok(result.rows_affected() > 0)
            }
        }
    }

    pub async fn update_conversation_timestamp(&self, id: i64) -> Result<()> {
        match self {
            Self::Sqlite(pool) => {
                sqlx::query("UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?")
                    .bind(id).execute(pool).await?;
            }
            Self::Postgres(pool) => {
                sqlx::query("UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1")
                    .bind(id).execute(pool).await?;
            }
        }
        Ok(())
    }

    // ========== Message CRUD ==========

    pub async fn create_message(&self, msg: NewMessage) -> Result<Message> {
        match self {
            Self::Sqlite(pool) => {
                let result = sqlx::query("INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)")
                    .bind(msg.conversation_id).bind(&msg.role).bind(&msg.content).execute(pool).await?;
                let id = result.last_insert_rowid();
                Ok(sqlx::query_as::<_, Message>(
                    "SELECT id, conversation_id, role, content, created_at FROM messages WHERE id = ?"
                ).bind(id).fetch_one(pool).await?)
            }
            Self::Postgres(pool) => {
                let row = sqlx::query(
                    "INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3) RETURNING id, conversation_id, role, content, created_at"
                )
                .bind(msg.conversation_id).bind(&msg.role).bind(&msg.content).fetch_one(pool).await?;
                Ok(Message {
                    id: row.get("id"),
                    conversation_id: row.get("conversation_id"),
                    role: row.get("role"),
                    content: row.get("content"),
                    created_at: row.get("created_at"),
                })
            }
        }
    }

    pub async fn list_messages(&self, conversation_id: i64) -> Result<Vec<Message>> {
        match self {
            Self::Sqlite(pool) => {
                Ok(sqlx::query_as::<_, Message>(
                    "SELECT id, conversation_id, role, content, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at ASC"
                ).bind(conversation_id).fetch_all(pool).await?)
            }
            Self::Postgres(pool) => {
                Ok(sqlx::query_as::<_, Message>(
                    "SELECT id, conversation_id, role, content, created_at FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC"
                ).bind(conversation_id).fetch_all(pool).await?)
            }
        }
    }

    // ========== Request Logs ==========

    pub async fn create_request_log(&self, log: NewRequestLog) -> Result<RequestLog> {
        match self {
            Self::Sqlite(pool) => {
                let result = sqlx::query(
                    r#"INSERT INTO request_logs (provider_id, provider_name, model, status, latency_ms, tokens_used, error_message, request_type, request_content, response_content)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"#
                )
                .bind(log.provider_id).bind(&log.provider_name).bind(&log.model).bind(&log.status)
                .bind(log.latency_ms).bind(log.tokens_used).bind(&log.error_message).bind(&log.request_type)
                .bind(&log.request_content).bind(&log.response_content)
                .execute(pool).await?;
                let id = result.last_insert_rowid();
                Ok(sqlx::query_as::<_, RequestLog>(
                    r#"SELECT id, provider_id, provider_name, model, status, latency_ms, tokens_used,
                       error_message, request_type, request_content, response_content, created_at
                       FROM request_logs WHERE id = ?"#
                ).bind(id).fetch_one(pool).await?)
            }
            Self::Postgres(pool) => {
                let row = sqlx::query(
                    r#"INSERT INTO request_logs (provider_id, provider_name, model, status, latency_ms, tokens_used, error_message, request_type, request_content, response_content)
                       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                       RETURNING id, provider_id, provider_name, model, status, latency_ms, tokens_used, error_message, request_type, request_content, response_content, created_at"#
                )
                .bind(log.provider_id).bind(&log.provider_name).bind(&log.model).bind(&log.status)
                .bind(log.latency_ms).bind(log.tokens_used).bind(&log.error_message).bind(&log.request_type)
                .bind(&log.request_content).bind(&log.response_content)
                .fetch_one(pool).await?;
                Ok(RequestLog {
                    id: row.get("id"),
                    provider_id: row.get("provider_id"),
                    provider_name: row.get("provider_name"),
                    model: row.get("model"),
                    status: row.get("status"),
                    latency_ms: row.get("latency_ms"),
                    tokens_used: row.get("tokens_used"),
                    error_message: row.get("error_message"),
                    request_type: row.get("request_type"),
                    request_content: row.get("request_content"),
                    response_content: row.get("response_content"),
                    created_at: row.get("created_at"),
                })
            }
        }
    }

    pub async fn list_request_logs(&self, limit: i64, offset: i64, status_filter: Option<&str>) -> Result<Vec<RequestLog>> {
        match self {
            Self::Sqlite(pool) => {
                if let Some(status) = status_filter {
                    Ok(sqlx::query_as::<_, RequestLog>(
                        r#"SELECT id, provider_id, provider_name, model, status, latency_ms, tokens_used, 
                           error_message, request_type, request_content, response_content, created_at
                           FROM request_logs WHERE status = ? ORDER BY created_at DESC LIMIT ? OFFSET ?"#
                    ).bind(status).bind(limit).bind(offset).fetch_all(pool).await?)
                } else {
                    Ok(sqlx::query_as::<_, RequestLog>(
                        r#"SELECT id, provider_id, provider_name, model, status, latency_ms, tokens_used, 
                           error_message, request_type, request_content, response_content, created_at
                           FROM request_logs ORDER BY created_at DESC LIMIT ? OFFSET ?"#
                    ).bind(limit).bind(offset).fetch_all(pool).await?)
                }
            }
            Self::Postgres(pool) => {
                if let Some(status) = status_filter {
                    Ok(sqlx::query_as::<_, RequestLog>(
                        r#"SELECT id, provider_id, provider_name, model, status, latency_ms, tokens_used, 
                           error_message, request_type, request_content, response_content, created_at
                           FROM request_logs WHERE status = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"#
                    ).bind(status).bind(limit).bind(offset).fetch_all(pool).await?)
                } else {
                    Ok(sqlx::query_as::<_, RequestLog>(
                        r#"SELECT id, provider_id, provider_name, model, status, latency_ms, tokens_used, 
                           error_message, request_type, request_content, response_content, created_at
                           FROM request_logs ORDER BY created_at DESC LIMIT $1 OFFSET $2"#
                    ).bind(limit).bind(offset).fetch_all(pool).await?)
                }
            }
        }
    }

    pub async fn get_request_log(&self, id: i64) -> Result<Option<RequestLog>> {
        match self {
            Self::Sqlite(pool) => {
                Ok(sqlx::query_as::<_, RequestLog>(
                    r#"SELECT id, provider_id, provider_name, model, status, latency_ms, tokens_used,
                       error_message, request_type, request_content, response_content, created_at
                       FROM request_logs WHERE id = ?"#
                ).bind(id).fetch_optional(pool).await?)
            }
            Self::Postgres(pool) => {
                Ok(sqlx::query_as::<_, RequestLog>(
                    r#"SELECT id, provider_id, provider_name, model, status, latency_ms, tokens_used,
                       error_message, request_type, request_content, response_content, created_at
                       FROM request_logs WHERE id = $1"#
                ).bind(id).fetch_optional(pool).await?)
            }
        }
    }
}