use sqlx::{PgPool, Row};
use anyhow::Result;
use crate::db::{DatabasePool, Conversation, NewConversation, UpdateConversation, ConversationListItem, ConversationWithMessages};

impl DatabasePool {
    // Conversation CRUD operations

    pub async fn create_conversation(&self, conv: NewConversation) -> Result<Conversation> {
        let title = conv.title.unwrap_or_else(|| "新对话".to_string());

        match self {
            Self::Postgres(pool) => {
                let row = sqlx::query(
                    "INSERT INTO conversations (title, provider_id) VALUES ($1, $2) RETURNING id::BIGINT as id, title, provider_id::BIGINT as provider_id, created_at, updated_at"
                )
                .bind(&title).bind(conv.provider_id).fetch_one(pool).await?;
                Ok(Conversation {
                    id: row.try_get("id")?,
                    title: row.try_get("title")?,
                    provider_id: row.try_get("provider_id")?,
                    created_at: row.try_get("created_at")?,
                    updated_at: row.try_get("updated_at")?,
                })
            }
        }
    }

    pub async fn list_conversations(&self, provider_id: Option<i64>, limit: i64) -> Result<Vec<ConversationListItem>> {
        match self {
            Self::Postgres(pool) => self.list_conversations_postgres(pool, provider_id, limit).await,
        }
    }

    async fn list_conversations_postgres(&self, pool: &PgPool, provider_id: Option<i64>, limit: i64) -> Result<Vec<ConversationListItem>> {
        if let Some(pid) = provider_id {
            Ok(sqlx::query_as::<_, ConversationListItem>(
                r#"SELECT c.id::BIGINT as id, c.title, c.provider_id::BIGINT as provider_id, p.name as provider_name, c.updated_at,
                   (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as message_count
                   FROM conversations c LEFT JOIN providers p ON c.provider_id = p.id
                   WHERE c.provider_id = $1 ORDER BY c.updated_at DESC LIMIT $2"#
            ).bind(pid).bind(limit).fetch_all(pool).await?)
        } else {
            Ok(sqlx::query_as::<_, ConversationListItem>(
                r#"SELECT c.id::BIGINT as id, c.title, c.provider_id::BIGINT as provider_id, p.name as provider_name, c.updated_at,
                   (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as message_count
                   FROM conversations c LEFT JOIN providers p ON c.provider_id = p.id
                   ORDER BY c.updated_at DESC LIMIT $1"#
            ).bind(limit).fetch_all(pool).await?)
        }
    }

    pub async fn get_conversation(&self, id: i64) -> Result<Option<Conversation>> {
        match self {
            Self::Postgres(pool) => {
                Ok(sqlx::query_as::<_, Conversation>(
                    "SELECT id::BIGINT as id, title, provider_id::BIGINT as provider_id, created_at, updated_at FROM conversations WHERE id = $1"
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
            Self::Postgres(pool) => {
                let result = sqlx::query("DELETE FROM conversations WHERE id = $1")
                    .bind(id).execute(pool).await?;
                Ok(result.rows_affected() > 0)
            }
        }
    }

    #[allow(dead_code)]
    pub async fn update_conversation_timestamp(&self, id: i64) -> Result<()> {
        match self {
            Self::Postgres(pool) => {
                sqlx::query("UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1")
                    .bind(id).execute(pool).await?;
            }
        }
        Ok(())
    }
}