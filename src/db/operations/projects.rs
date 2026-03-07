use anyhow::Result;

use crate::db::{DatabasePool, Project};

impl DatabasePool {
    pub async fn list_projects(&self, org_id: Option<i64>) -> Result<Vec<Project>> {
        let query_all = r#"
            SELECT id::BIGINT as id, org_id::BIGINT as org_id, name, status, created_at, updated_at
            FROM projects
            ORDER BY id ASC
        "#;

        let query_by_org = r#"
            SELECT id::BIGINT as id, org_id::BIGINT as org_id, name, status, created_at, updated_at
            FROM projects
            WHERE org_id = $1
            ORDER BY id ASC
        "#;

        match self {
            Self::Postgres(pool) => {
                if let Some(oid) = org_id {
                    Ok(sqlx::query_as::<_, Project>(query_by_org)
                        .bind(oid)
                        .fetch_all(pool)
                        .await?)
                } else {
                    Ok(sqlx::query_as::<_, Project>(query_all)
                        .fetch_all(pool)
                        .await?)
                }
            }
        }
    }

    pub async fn create_project(&self, org_id: i64, name: &str) -> Result<i64> {
        let query = r#"
            INSERT INTO projects (org_id, name)
            VALUES ($1, $2)
            RETURNING id
        "#;

        match self {
            Self::Postgres(pool) => {
                let id: i64 = sqlx::query_scalar(query)
                    .bind(org_id)
                    .bind(name)
                    .fetch_one(pool)
                    .await?;
                Ok(id)
            }
        }
    }

    pub async fn delete_project(&self, id: i64) -> Result<bool> {
        let query = "DELETE FROM projects WHERE id = $1";

        match self {
            Self::Postgres(pool) => {
                let result = sqlx::query(query).bind(id).execute(pool).await?;
                Ok(result.rows_affected() > 0)
            }
        }
    }

    pub async fn get_project_by_id(&self, id: i64) -> Result<Option<Project>> {
        let query = r#"
            SELECT id::BIGINT as id, org_id::BIGINT as org_id, name, status, created_at, updated_at
            FROM projects
            WHERE id = $1
        "#;

        match self {
            Self::Postgres(pool) => Ok(sqlx::query_as::<_, Project>(query)
                .bind(id)
                .fetch_optional(pool)
                .await?),
        }
    }

    pub async fn get_default_project_id_for_org(&self, org_id: i64) -> Result<Option<i64>> {
        let query = r#"
            SELECT id::BIGINT as id
            FROM projects
            WHERE org_id = $1
            ORDER BY id ASC
            LIMIT 1
        "#;

        match self {
            Self::Postgres(pool) => Ok(sqlx::query_scalar(query)
                .bind(org_id)
                .fetch_optional(pool)
                .await?),
        }
    }
}
