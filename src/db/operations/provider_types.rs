use sqlx::{SqlitePool, PgPool, QueryBuilder};
use anyhow::Result;
use crate::db::{DatabasePool, ProviderType, NewProviderType, UpdateProviderType};

impl DatabasePool {
    // Provider Type CRUD operations
    
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
        let mut query = QueryBuilder::new("UPDATE provider_types SET updated_at = CURRENT_TIMESTAMP");
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
        let mut query = QueryBuilder::new("UPDATE provider_types SET updated_at = CURRENT_TIMESTAMP");
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

    #[allow(dead_code)]
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

    #[allow(dead_code)]
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
}