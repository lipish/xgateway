use sqlx::{SqlitePool, PgPool, Row};
use anyhow::Result;
use crate::db::{DatabasePool, RequestLog, NewRequestLog};

impl DatabasePool {
    // Request Log operations
    
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
