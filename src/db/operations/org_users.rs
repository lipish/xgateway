use anyhow::Result;

use crate::db::{DatabasePool, User};

impl DatabasePool {
    pub async fn get_primary_org_id_for_user(&self, user_id: i64) -> Result<Option<i64>> {
        match self {
            Self::Postgres(pool) => {
                let org_id = sqlx::query_scalar::<_, i64>(
                    r#"
                    SELECT org_id::BIGINT as org_id
                    FROM org_users
                    WHERE user_id = $1
                    ORDER BY org_id ASC
                    LIMIT 1
                    "#,
                )
                .bind(user_id)
                .fetch_optional(pool)
                .await?;
                Ok(org_id)
            }
        }
    }

    pub async fn is_user_in_org(&self, org_id: i64, user_id: i64) -> Result<bool> {
        match self {
            Self::Postgres(pool) => {
                let exists: Option<i64> = sqlx::query_scalar(
                    r#"
                    SELECT 1
                    FROM org_users
                    WHERE org_id = $1 AND user_id = $2
                    LIMIT 1
                    "#,
                )
                .bind(org_id)
                .bind(user_id)
                .fetch_optional(pool)
                .await?;
                Ok(exists.is_some())
            }
        }
    }

    pub async fn get_org_user_role(&self, org_id: i64, user_id: i64) -> Result<Option<String>> {
        match self {
            Self::Postgres(pool) => {
                let role = sqlx::query_scalar::<_, String>(
                    r#"
                    SELECT role
                    FROM org_users
                    WHERE org_id = $1 AND user_id = $2
                    "#,
                )
                .bind(org_id)
                .bind(user_id)
                .fetch_optional(pool)
                .await?;
                Ok(role)
            }
        }
    }

    pub async fn list_users_by_org_id(&self, org_id: i64) -> Result<Vec<User>> {
        let query = r#"
            SELECT u.id, u.username, u.password_hash, u.role_id, u.status,
                   (u.created_at AT TIME ZONE 'UTC') as created_at,
                   (u.updated_at AT TIME ZONE 'UTC') as updated_at
            FROM org_users ou
            JOIN users u ON u.id = ou.user_id
            WHERE ou.org_id = $1
            ORDER BY u.created_at DESC
        "#;

        match self {
            Self::Postgres(pool) => Ok(sqlx::query_as::<_, User>(query)
                .bind(org_id)
                .fetch_all(pool)
                .await?),
        }
    }

    pub async fn add_user_to_org(&self, org_id: i64, user_id: i64, role: Option<&str>) -> Result<()> {
        let query = r#"
            INSERT INTO org_users (org_id, user_id, role)
            VALUES ($1, $2, COALESCE($3, 'member'))
            ON CONFLICT (org_id, user_id) DO UPDATE SET role = EXCLUDED.role, updated_at = CURRENT_TIMESTAMP
        "#;

        match self {
            Self::Postgres(pool) => {
                sqlx::query(query)
                    .bind(org_id)
                    .bind(user_id)
                    .bind(role)
                    .execute(pool)
                    .await?;
                Ok(())
            }
        }
    }

    pub async fn remove_user_from_org(&self, org_id: i64, user_id: i64) -> Result<bool> {
        let query = "DELETE FROM org_users WHERE org_id = $1 AND user_id = $2";

        match self {
            Self::Postgres(pool) => {
                let result = sqlx::query(query)
                    .bind(org_id)
                    .bind(user_id)
                    .execute(pool)
                    .await?;
                Ok(result.rows_affected() > 0)
            }
        }
    }
}
