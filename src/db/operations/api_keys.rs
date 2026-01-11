use sqlx::{Row};
use anyhow::Result;
use crate::db::{DatabasePool, ApiKey, NewApiKey};

impl DatabasePool {
    pub async fn create_api_key(&self, api_key: NewApiKey) -> Result<i64> {
        let provider_ids_json = api_key.provider_ids.as_ref().map(|ids| {
            serde_json::to_string(ids).unwrap_or_else(|_| "[]".to_string())
        });

        match self {
            Self::Postgres(pool) => {
                let row = sqlx::query(
                    "INSERT INTO api_keys (owner_id, key_hash, name, scope, provider_id, provider_ids, qps_limit, concurrency_limit, expires_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id"
                )
                .bind(api_key.owner_id)
                .bind(&api_key.key_hash)
                .bind(&api_key.name)
                .bind(&api_key.scope)
                .bind(api_key.provider_id)
                .bind(provider_ids_json.as_ref())
                .bind(api_key.qps_limit)
                .bind(api_key.concurrency_limit)
                .bind(api_key.expires_at)
                .fetch_one(pool)
                .await?;
                Ok(row.try_get("id")?)
            }
        }
    }

    pub async fn get_api_key_by_hash(&self, key_hash: &str) -> Result<Option<ApiKey>> {
        let pg_query = "SELECT id, owner_id, key_hash, name, scope, provider_id::BIGINT as provider_id, provider_ids, qps_limit, concurrency_limit, status, (expires_at AT TIME ZONE 'UTC') as expires_at, (created_at AT TIME ZONE 'UTC') as created_at, (updated_at AT TIME ZONE 'UTC') as updated_at FROM api_keys WHERE key_hash = $1 AND status = 'active'";

        match self {
            Self::Postgres(pool) => {
                Ok(sqlx::query_as::<_, ApiKey>(pg_query)
                    .bind(key_hash)
                    .fetch_optional(pool)
                    .await?)
            }
        }
    }

    pub async fn list_api_keys(&self) -> Result<Vec<ApiKey>> {
        let query = "SELECT id, owner_id, key_hash, name, scope, provider_id::BIGINT as provider_id, provider_ids, qps_limit, concurrency_limit, status, (expires_at AT TIME ZONE 'UTC') as expires_at, (created_at AT TIME ZONE 'UTC') as created_at, (updated_at AT TIME ZONE 'UTC') as updated_at FROM api_keys ORDER BY created_at DESC";
        match self {
            Self::Postgres(pool) => Ok(sqlx::query_as::<_, ApiKey>(query).fetch_all(pool).await?),
        }
    }

    pub async fn get_api_key_by_id(&self, id: i64) -> Result<Option<ApiKey>> {
        let pg_query = "SELECT id, owner_id, key_hash, name, scope, provider_id::BIGINT as provider_id, provider_ids, qps_limit, concurrency_limit, status, (expires_at AT TIME ZONE 'UTC') as expires_at, (created_at AT TIME ZONE 'UTC') as created_at, (updated_at AT TIME ZONE 'UTC') as updated_at FROM api_keys WHERE id = $1";
        match self {
            Self::Postgres(pool) => Ok(sqlx::query_as::<_, ApiKey>(pg_query).bind(id).fetch_optional(pool).await?),
        }
    }

    pub async fn delete_api_key(&self, id: i64) -> Result<bool> {
        let pg_query = "DELETE FROM api_keys WHERE id = $1";
        match self {
            Self::Postgres(pool) => {
                let result = sqlx::query(pg_query).bind(id).execute(pool).await?;
                Ok(result.rows_affected() > 0)
            }
        }
    }

    pub async fn update_api_key_status(&self, id: i64, status: &str) -> Result<bool> {
        let pg_query = "UPDATE api_keys SET status = $1 WHERE id = $2";
        match self {
            Self::Postgres(pool) => {
                let result = sqlx::query(pg_query).bind(status).bind(id).execute(pool).await?;
                Ok(result.rows_affected() > 0)
            }
        }
    }

    pub async fn update_api_key(
        &self,
        id: i64,
        name: &str,
        scope: &str,
        provider_id: Option<i64>,
        provider_ids: Option<Vec<i64>>,
        qps_limit: f64,
        concurrency_limit: i32,
    ) -> Result<bool> {
        let provider_ids_json = provider_ids.as_ref().map(|ids| {
            serde_json::to_string(ids).unwrap_or_else(|_| "[]".to_string())
        });

        let pg_query = "UPDATE api_keys SET name = $1, scope = $2, provider_id = $3, provider_ids = $4, qps_limit = $5, concurrency_limit = $6, updated_at = CURRENT_TIMESTAMP WHERE id = $7";

        match self {
            Self::Postgres(pool) => {
                let result = sqlx::query(pg_query)
                    .bind(name)
                    .bind(scope)
                    .bind(provider_id)
                    .bind(provider_ids_json.as_ref())
                    .bind(qps_limit)
                    .bind(concurrency_limit)
                    .bind(id)
                    .execute(pool)
                    .await?;
                Ok(result.rows_affected() > 0)
            }
        }
    }

    pub async fn update_api_key_hash(&self, id: i64, key_hash: &str) -> Result<bool> {
        let pg_query = "UPDATE api_keys SET key_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2";

        match self {
            Self::Postgres(pool) => {
                let result = sqlx::query(pg_query)
                    .bind(key_hash)
                    .bind(id)
                    .execute(pool)
                    .await?;
                Ok(result.rows_affected() > 0)
            }
        }
    }
}