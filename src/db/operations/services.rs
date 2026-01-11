use anyhow::Result;
use sqlx::{PgPool, QueryBuilder};

use crate::db::{ApiKey, DatabasePool, Provider, Service};

impl DatabasePool {
    pub async fn list_services(&self) -> Result<Vec<Service>> {
        let query = r#"
            SELECT id, name, enabled, strategy, fallback_chain, created_at, updated_at
            FROM services
            ORDER BY created_at DESC
        "#;

        match self {
            Self::Postgres(pool) => Ok(sqlx::query_as::<_, Service>(query)
                .fetch_all(pool)
                .await?),
        }
    }

    pub async fn create_service(
        &self,
        id: &str,
        name: &str,
        enabled: bool,
        strategy: &str,
        fallback_chain: Option<&str>,
    ) -> Result<()> {
        let query = r#"
            INSERT INTO services (id, name, enabled, strategy, fallback_chain)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (id) DO NOTHING
        "#;

        match self {
            Self::Postgres(pool) => {
                sqlx::query(query)
                    .bind(id)
                    .bind(name)
                    .bind(enabled)
                    .bind(strategy)
                    .bind(fallback_chain)
                    .execute(pool)
                    .await?;
                Ok(())
            }
        }
    }

    pub async fn update_service(
        &self,
        id: &str,
        name: Option<&str>,
        enabled: Option<bool>,
        strategy: Option<&str>,
        fallback_chain: Option<&str>,
    ) -> Result<bool> {
        match self {
            Self::Postgres(pool) => self.update_service_postgres(pool, id, name, enabled, strategy, fallback_chain).await,
        }
    }

    async fn update_service_postgres(
        &self,
        pool: &PgPool,
        id: &str,
        name: Option<&str>,
        enabled: Option<bool>,
        strategy: Option<&str>,
        fallback_chain: Option<&str>,
    ) -> Result<bool> {
        let mut query = QueryBuilder::new("UPDATE services SET updated_at = CURRENT_TIMESTAMP");
        let mut has_updates = false;

        if let Some(name) = name {
            query.push(", name = ");
            query.push_bind(name);
            has_updates = true;
        }
        if let Some(enabled) = enabled {
            query.push(", enabled = ");
            query.push_bind(enabled);
            has_updates = true;
        }
        if let Some(strategy) = strategy {
            query.push(", strategy = ");
            query.push_bind(strategy);
            has_updates = true;
        }
        if let Some(fallback_chain) = fallback_chain {
            query.push(", fallback_chain = ");
            query.push_bind(fallback_chain);
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

    pub async fn delete_service(&self, id: &str) -> Result<bool> {
        let query = "DELETE FROM services WHERE id = $1";
        match self {
            Self::Postgres(pool) => {
                let result = sqlx::query(query).bind(id).execute(pool).await?;
                Ok(result.rows_affected() > 0)
            }
        }
    }

    pub async fn get_service(&self, service_id: &str) -> Result<Option<Service>> {
        let query = r#"
            SELECT id, name, enabled, strategy, fallback_chain, created_at, updated_at
            FROM services
            WHERE id = $1
        "#;

        match self {
            Self::Postgres(pool) => Ok(sqlx::query_as::<_, Service>(query)
                .bind(service_id)
                .fetch_optional(pool)
                .await?),
        }

    }

    pub async fn bind_service_provider(&self, service_id: &str, provider_id: i64) -> Result<()> {
        let query = r#"
            INSERT INTO service_model_services (service_id, provider_id)
            VALUES ($1, $2)
            ON CONFLICT (service_id, provider_id) DO NOTHING
        "#;

        match self {
            Self::Postgres(pool) => {
                sqlx::query(query)
                    .bind(service_id)
                    .bind(provider_id)
                    .execute(pool)
                    .await?;
                Ok(())
            }
        }
    }

    pub async fn unbind_service_provider(&self, service_id: &str, provider_id: i64) -> Result<bool> {
        let query = r#"
            DELETE FROM service_model_services
            WHERE service_id = $1 AND provider_id = $2
        "#;

        match self {
            Self::Postgres(pool) => {
                let result = sqlx::query(query)
                    .bind(service_id)
                    .bind(provider_id)
                    .execute(pool)
                    .await?;
                Ok(result.rows_affected() > 0)
            }
        }
    }

    pub async fn list_api_key_service_ids(&self, api_key_id: i64) -> Result<Vec<String>> {
        let query = r#"
            SELECT service_id
            FROM api_key_services
            WHERE api_key_id = $1
            ORDER BY service_id ASC
        "#;

        match self {
            Self::Postgres(pool) => {
                let rows = sqlx::query_scalar::<_, String>(query)
                    .bind(api_key_id)
                    .fetch_all(pool)
                    .await?;
                Ok(rows)
            }
        }
    }

    pub async fn replace_api_key_services(&self, api_key_id: i64, service_ids: &[String]) -> Result<()> {
        match self {
            Self::Postgres(pool) => {
                let mut tx = pool.begin().await?;
                sqlx::query("DELETE FROM api_key_services WHERE api_key_id = $1")
                    .bind(api_key_id)
                    .execute(&mut *tx)
                    .await?;

                for service_id in service_ids {
                    sqlx::query(
                        "INSERT INTO api_key_services (api_key_id, service_id) VALUES ($1, $2) ON CONFLICT (api_key_id, service_id) DO NOTHING",
                    )
                    .bind(api_key_id)
                    .bind(service_id)
                    .execute(&mut *tx)
                    .await?;
                }

                tx.commit().await?;
                Ok(())
            }
        }
    }

    pub async fn list_service_providers(&self, service_id: &str) -> Result<Vec<Provider>> {
        let query = r#"
            SELECT p.id::BIGINT as id, p.name, p.type, p.config, p.enabled, p.priority, p.endpoint,
                   p.secret_id, p.secret_key, p.version, p.created_at, p.updated_at
            FROM service_model_services sms
            JOIN providers p ON p.id = sms.provider_id
            WHERE sms.service_id = $1
            ORDER BY p.priority DESC, p.created_at ASC
        "#;

        match self {
            Self::Postgres(pool) => Ok(sqlx::query_as::<_, Provider>(query)
                .bind(service_id)
                .fetch_all(pool)
                .await?),
        }
    }

    pub async fn api_key_has_service_access(&self, api_key: &ApiKey, service_id: &str) -> Result<bool> {
        if api_key.scope != "instance" {
            return Ok(true);
        }

        // New model: api_key_services
        let query = r#"
            SELECT 1
            FROM api_key_services
            WHERE api_key_id = $1 AND service_id = $2
            LIMIT 1
        "#;

        let has_new_mapping = match self {
            Self::Postgres(pool) => {
                let row = sqlx::query(query)
                    .bind(api_key.id)
                    .bind(service_id)
                    .fetch_optional(pool)
                    .await?;
                row.is_some()
            }
        };

        if has_new_mapping {
            return Ok(true);
        }

        // Backward compatibility: legacy provider_id/provider_ids
        if let Some(provider_id) = api_key.provider_id {
            let exists_query = r#"
                SELECT 1
                FROM service_model_services
                WHERE service_id = $1 AND provider_id = $2
                LIMIT 1
            "#;

            let exists = match self {
                Self::Postgres(pool) => {
                    let row = sqlx::query(exists_query)
                        .bind(service_id)
                        .bind(provider_id)
                        .fetch_optional(pool)
                        .await?;
                    row.is_some()
                }
            };

            if exists {
                return Ok(true);
            }
        }

        if let Some(ref provider_ids_json) = api_key.provider_ids {
            let allowed_provider_ids: Vec<i64> = serde_json::from_str(provider_ids_json).unwrap_or_default();
            if allowed_provider_ids.is_empty() {
                return Ok(false);
            }

            let exists_query = r#"
                SELECT 1
                FROM service_model_services
                WHERE service_id = $1 AND provider_id = ANY($2)
                LIMIT 1
            "#;

            match self {
                Self::Postgres(pool) => {
                    let row = sqlx::query(exists_query)
                        .bind(service_id)
                        .bind(&allowed_provider_ids)
                        .fetch_optional(pool)
                        .await?;
                    return Ok(row.is_some());
                }
            }
        }

        Ok(false)
    }
}
