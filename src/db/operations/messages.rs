use sqlx::{SqlitePool, PgPool, Row};
use anyhow::Result;
use crate::db::{DatabasePool, Message, NewMessage};

impl DatabasePool {
    // Message CRUD operations
    
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
}
