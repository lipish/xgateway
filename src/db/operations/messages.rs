use crate::db::{DatabasePool, Message, NewMessage};
use anyhow::Result;
use sqlx::Row;

impl DatabasePool {
    // Message CRUD operations

    pub async fn create_message(&self, msg: NewMessage) -> Result<Message> {
        match self {
            Self::Postgres(pool) => {
                let row = sqlx::query(
                    "INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3) RETURNING id::BIGINT as id, conversation_id::BIGINT as conversation_id, role, content, created_at"
                )
                .bind(msg.conversation_id).bind(&msg.role).bind(&msg.content).fetch_one(pool).await?;
                Ok(Message {
                    id: row.try_get("id")?,
                    conversation_id: row.try_get("conversation_id")?,
                    role: row.try_get("role")?,
                    content: row.try_get("content")?,
                    created_at: row.try_get("created_at")?,
                })
            }
        }
    }

    pub async fn list_messages(&self, conversation_id: i64) -> Result<Vec<Message>> {
        match self {
            Self::Postgres(pool) => {
                Ok(sqlx::query_as::<_, Message>(
                    "SELECT id::BIGINT as id, conversation_id::BIGINT as conversation_id, role, content, created_at FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC"
                ).bind(conversation_id).fetch_all(pool).await?)
            }
        }
    }
}
