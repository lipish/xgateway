use anyhow::Result;

use crate::db::{DatabasePool, Organization};

impl DatabasePool {
    pub async fn list_organizations(&self) -> Result<Vec<Organization>> {
        let query = r#"
            SELECT id::BIGINT as id, name, status, owner_id::BIGINT as owner_id, created_at, updated_at
            FROM organizations
            ORDER BY id ASC
        "#;

        match self {
            Self::Postgres(pool) => Ok(sqlx::query_as::<_, Organization>(query)
                .fetch_all(pool)
                .await?),
        }
    }

    pub async fn create_organization(&self, name: &str, owner_id: Option<i64>) -> Result<i64> {
        let query = r#"
            INSERT INTO organizations (name, owner_id)
            VALUES ($1, $2)
            RETURNING id
        "#;

        match self {
            Self::Postgres(pool) => {
                let id: i64 = sqlx::query_scalar(query)
                    .bind(name)
                    .bind(owner_id)
                    .fetch_one(pool)
                    .await?;
                Ok(id)
            }
        }
    }

    pub async fn get_organization_owner_id(&self, id: i64) -> Result<Option<i64>> {
        let query = "SELECT owner_id::BIGINT as owner_id FROM organizations WHERE id = $1";

        match self {
            Self::Postgres(pool) => Ok(sqlx::query_scalar(query)
                .bind(id)
                .fetch_optional(pool)
                .await?),
        }
    }

    pub async fn update_organization(&self, id: i64, name: &str) -> Result<bool> {
        let query = "UPDATE organizations SET name = $1, updated_at = NOW() WHERE id = $2";

        match self {
            Self::Postgres(pool) => {
                let result = sqlx::query(query).bind(name).bind(id).execute(pool).await?;
                Ok(result.rows_affected() > 0)
            }
        }
    }
    pub async fn delete_organization(&self, id: i64) -> Result<bool> {
        let query = "DELETE FROM organizations WHERE id = $1";

        match self {
            Self::Postgres(pool) => {
                let result = sqlx::query(query).bind(id).execute(pool).await?;
                Ok(result.rows_affected() > 0)
            }
        }
    }
}
