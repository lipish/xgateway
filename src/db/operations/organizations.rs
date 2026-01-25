use anyhow::Result;

use crate::db::{DatabasePool, Organization};

impl DatabasePool {
    pub async fn list_organizations(&self) -> Result<Vec<Organization>> {
        let query = r#"
            SELECT id::BIGINT as id, name, status, created_at, updated_at
            FROM organizations
            ORDER BY id ASC
        "#;

        match self {
            Self::Postgres(pool) => Ok(sqlx::query_as::<_, Organization>(query)
                .fetch_all(pool)
                .await?),
        }
    }

    pub async fn create_organization(&self, name: &str) -> Result<i64> {
        let query = r#"
            INSERT INTO organizations (name)
            VALUES ($1)
            RETURNING id
        "#;

        match self {
            Self::Postgres(pool) => {
                let id: i64 = sqlx::query_scalar(query)
                    .bind(name)
                    .fetch_one(pool)
                    .await?;
                Ok(id)
            }
        }
    }


    pub async fn update_organization(&self, id: i64, name: &str) -> Result<bool> {
        let query = "UPDATE organizations SET name = $1, updated_at = NOW() WHERE id = $2";

        match self {
            Self::Postgres(pool) => {
                let result = sqlx::query(query)
                    .bind(name)
                    .bind(id)
                    .execute(pool)
                    .await?;
                Ok(result.rows_affected() > 0)
            }
        }
    }
    pub async fn delete_organization(&self, id: i64) -> Result<bool> {
        let query = "DELETE FROM organizations WHERE id = $1";

        match self {
            Self::Postgres(pool) => {
                let result = sqlx::query(query)
                    .bind(id)
                    .execute(pool)
                    .await?;
                Ok(result.rows_affected() > 0)
            }
        }
    }
}
