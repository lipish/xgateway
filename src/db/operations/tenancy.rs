use anyhow::Result;

use crate::db::DatabasePool;

impl DatabasePool {
    pub async fn get_org_id_by_project_id(&self, project_id: i64) -> Result<Option<i64>> {
        match self {
            Self::Postgres(pool) => {
                let row = sqlx::query_scalar::<_, i64>(
                    r#"
                    SELECT org_id::BIGINT as org_id
                    FROM projects
                    WHERE id = $1
                    "#,
                )
                .bind(project_id)
                .fetch_optional(pool)
                .await?;
                Ok(row)
            }
        }
    }
}
