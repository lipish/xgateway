use sqlx::{SqlitePool, PgPool, QueryBuilder, Row};
use anyhow::Result;
use crate::db::{DatabasePool, Provider, NewProvider, UpdateProvider, ProviderStats};

impl DatabasePool {
    pub async fn create_provider(&self, provider: NewProvider) -> Result<i64> {
        match self {
            Self::Sqlite(pool) => {
                let result = sqlx::query(
                    "INSERT INTO providers (name, type, config, enabled, priority, endpoint, secret_id, secret_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
                )
                .bind(&provider.name)
                .bind(&provider.provider_type)
                .bind(&provider.config)
                .bind(provider.enabled)
                .bind(provider.priority)
                .bind(&provider.endpoint)
                .bind(&provider.secret_id)
                .bind(&provider.secret_key)
                .execute(pool)
                .await?;
                Ok(result.last_insert_rowid())
            }
            Self::Postgres(pool) => {
                let row = sqlx::query(
                    "INSERT INTO providers (name, type, config, enabled, priority, endpoint, secret_id, secret_key) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id"
                )
                .bind(&provider.name)
                .bind(&provider.provider_type)
                .bind(&provider.config)
                .bind(provider.enabled)
                .bind(provider.priority)
                .bind(&provider.endpoint)
                .bind(&provider.secret_id)
                .bind(&provider.secret_key)
                .fetch_one(pool)
                .await?;
                Ok(row.get("id"))
            }
        }
    }

    pub async fn list_providers(&self) -> Result<Vec<Provider>> {
        let query = r#"
            SELECT id, name, type, config, enabled, priority, endpoint, secret_id, secret_key, created_at, updated_at
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
                    "SELECT id, name, type, config, enabled, priority, endpoint, secret_id, secret_key, created_at, updated_at FROM providers WHERE id = ?"
                )
                .bind(id)
                .fetch_optional(pool)
                .await?)
            }
            Self::Postgres(pool) => {
                Ok(sqlx::query_as::<_, Provider>(
                    "SELECT id, name, type, config, enabled, priority, endpoint, secret_id, secret_key, created_at, updated_at FROM providers WHERE id = $1"
                )
                .bind(id)
                .fetch_optional(pool)
                .await?)
            }
        }
    }

    #[allow(dead_code)]
    pub async fn get_enabled_providers(&self) -> Result<Vec<Provider>> {
        let query = r#"
            SELECT id, name, type, config, enabled, priority, endpoint, secret_id, secret_key, created_at, updated_at
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
        let mut query = QueryBuilder::new("UPDATE providers SET updated_at = CURRENT_TIMESTAMP");
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
        if let Some(endpoint) = &update.endpoint {
            query.push(", endpoint = ");
            query.push_bind(endpoint);
            has_updates = true;
        }
        if let Some(secret_id) = &update.secret_id {
            query.push(", secret_id = ");
            query.push_bind(secret_id);
            has_updates = true;
        }
        if let Some(secret_key) = &update.secret_key {
            query.push(", secret_key = ");
            query.push_bind(secret_key);
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
        let mut query = QueryBuilder::new("UPDATE providers SET updated_at = CURRENT_TIMESTAMP");
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
        if let Some(endpoint) = &update.endpoint {
            query.push(", endpoint = ");
            query.push_bind(endpoint);
            has_updates = true;
        }
        if let Some(secret_id) = &update.secret_id {
            query.push(", secret_id = ");
            query.push_bind(secret_id);
            has_updates = true;
        }
        if let Some(secret_key) = &update.secret_key {
            query.push(", secret_key = ");
            query.push_bind(secret_key);
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
                    .fetch_one(pool)
                    .await?;
                let enabled: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM providers WHERE enabled = true")
                    .fetch_one(pool)
                    .await?;
                Ok(ProviderStats {
                    total: total as usize,
                    enabled: enabled as usize,
                    disabled: (total - enabled) as usize,
                })
            }
            Self::Postgres(pool) => {
                let total: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM providers")
                    .fetch_one(pool)
                    .await?;
                let enabled: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM providers WHERE enabled = true")
                    .fetch_one(pool)
                    .await?;
                Ok(ProviderStats {
                    total: total as usize,
                    enabled: enabled as usize,
                    disabled: (total - enabled) as usize,
                })
            }
        }
    }
}