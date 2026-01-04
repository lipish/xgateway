use sqlx::{Row};
use anyhow::Result;
use crate::db::{DatabasePool, ApiKey, NewApiKey};

impl DatabasePool {
    pub async fn create_api_key(&self, api_key: NewApiKey) -> Result<i32> {
        match self {
            Self::Sqlite(pool) => {
                let result = sqlx::query(
                    "INSERT INTO api_keys (owner_id, key_hash, name, scope, provider_id, qps_limit, concurrency_limit, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
                )
                .bind(api_key.owner_id)
                .bind(&api_key.key_hash)
                .bind(&api_key.name)
                .bind(&api_key.scope)
                .bind(api_key.provider_id)
                .bind(api_key.qps_limit)
                .bind(api_key.concurrency_limit)
                .bind(api_key.expires_at)
                .execute(pool)
                .await?;
                Ok(result.last_insert_rowid() as i32)
            }
            Self::Postgres(pool) => {
                let row = sqlx::query(
                    "INSERT INTO api_keys (owner_id, key_hash, name, scope, provider_id, qps_limit, concurrency_limit, expires_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id"
                )
                .bind(api_key.owner_id)
                .bind(&api_key.key_hash)
                .bind(&api_key.name)
                .bind(&api_key.scope)
                .bind(api_key.provider_id)
                .bind(api_key.qps_limit)
                .bind(api_key.concurrency_limit)
                .bind(api_key.expires_at)
                .fetch_one(pool)
                .await?;
                Ok(row.get("id"))
            }
        }
    }

    pub async fn get_api_key_by_hash(&self, key_hash: &str) -> Result<Option<ApiKey>> {
        let query = "SELECT id, owner_id, key_hash, name, scope, provider_id, qps_limit, concurrency_limit, status, expires_at, created_at, updated_at FROM api_keys WHERE key_hash = ? AND status = 'active'";
        let pg_query = "SELECT id, owner_id, key_hash, name, scope, provider_id, qps_limit, concurrency_limit, status, expires_at, created_at, updated_at FROM api_keys WHERE key_hash = $1 AND status = 'active'";

        match self {
            Self::Sqlite(pool) => {
                Ok(sqlx::query_as::<_, ApiKey>(query)
                    .bind(key_hash)
                    .fetch_optional(pool)
                    .await?)
            }
            Self::Postgres(pool) => {
                Ok(sqlx::query_as::<_, ApiKey>(pg_query)
                    .bind(key_hash)
                    .fetch_optional(pool)
                    .await?)
            }
        }
    }

    pub async fn list_api_keys(&self) -> Result<Vec<ApiKey>> {
        let query = "SELECT id, owner_id, key_hash, name, scope, provider_id, qps_limit, concurrency_limit, status, expires_at, created_at, updated_at FROM api_keys ORDER BY created_at DESC";
        match self {
            Self::Sqlite(pool) => Ok(sqlx::query_as::<_, ApiKey>(query).fetch_all(pool).await?),
            Self::Postgres(pool) => Ok(sqlx::query_as::<_, ApiKey>(query).fetch_all(pool).await?),
        }
    }

    pub async fn get_api_key_by_id(&self, id: i32) -> Result<Option<ApiKey>> {
        let query = "SELECT id, owner_id, key_hash, name, scope, provider_id, qps_limit, concurrency_limit, status, expires_at, created_at, updated_at FROM api_keys WHERE id = ?";
        let pg_query = "SELECT id, owner_id, key_hash, name, scope, provider_id, qps_limit, concurrency_limit, status, expires_at, created_at, updated_at FROM api_keys WHERE id = $1";
        match self {
            Self::Sqlite(pool) => Ok(sqlx::query_as::<_, ApiKey>(query).bind(id).fetch_optional(pool).await?),
            Self::Postgres(pool) => Ok(sqlx::query_as::<_, ApiKey>(pg_query).bind(id).fetch_optional(pool).await?),
        }
    }

    pub async fn delete_api_key(&self, id: i32) -> Result<bool> {
        let query = "DELETE FROM api_keys WHERE id = ?";
        let pg_query = "DELETE FROM api_keys WHERE id = $1";
        match self {
            Self::Sqlite(pool) => {
                let result = sqlx::query(query).bind(id).execute(pool).await?;
                Ok(result.rows_affected() > 0)
            }
            Self::Postgres(pool) => {
                let result = sqlx::query(pg_query).bind(id).execute(pool).await?;
                Ok(result.rows_affected() > 0)
            }
        }
    }

    pub async fn update_api_key_status(&self, id: i32, status: &str) -> Result<bool> {
        let query = "UPDATE api_keys SET status = ? WHERE id = ?";
        let pg_query = "UPDATE api_keys SET status = $1 WHERE id = $2";
        match self {
            Self::Sqlite(pool) => {
                let result = sqlx::query(query).bind(status).bind(id).execute(pool).await?;
                Ok(result.rows_affected() > 0)
            }
            Self::Postgres(pool) => {
                let result = sqlx::query(pg_query).bind(status).bind(id).execute(pool).await?;
                Ok(result.rows_affected() > 0)
            }
        }
    }
}
