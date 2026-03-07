use crate::db::{DatabasePool, NewUser, User};
use anyhow::Result;
use sqlx::Row;

impl DatabasePool {
    pub async fn create_user(&self, user: NewUser) -> Result<i64> {
        match self {
            Self::Postgres(pool) => {
                let row = sqlx::query(
                    "INSERT INTO users (username, password_hash, role_id) VALUES ($1, $2, $3) RETURNING id"
                )
                .bind(&user.username)
                .bind(&user.password_hash)
                .bind(&user.role_id)
                .fetch_one(pool)
                .await?;
                Ok(row.try_get("id")?)
            }
        }
    }

    pub async fn create_auth_token(&self, token: &str, user_id: i64) -> Result<()> {
        match self {
            Self::Postgres(pool) => {
                sqlx::query(
                    "INSERT INTO auth_tokens (token, user_id) VALUES ($1, $2) ON CONFLICT (token) DO UPDATE SET user_id = EXCLUDED.user_id",
                )
                .bind(token)
                .bind(user_id)
                .execute(pool)
                .await?;
                Ok(())
            }
        }
    }

    pub async fn get_user_by_token(&self, token: &str) -> Result<Option<User>> {
        match self {
            Self::Postgres(pool) => Ok(sqlx::query_as::<_, User>(
                "SELECT u.id, u.username, u.password_hash, u.role_id, u.status, \
                            (u.created_at AT TIME ZONE 'UTC') as created_at, \
                            (u.updated_at AT TIME ZONE 'UTC') as updated_at, \
                            COALESCE(ou.org_id::BIGINT, 1) as org_id \
                     FROM auth_tokens t \
                     JOIN users u ON u.id = t.user_id \
                     LEFT JOIN org_users ou ON ou.user_id = u.id \
                     WHERE t.token = $1",
            )
            .bind(token)
            .fetch_optional(pool)
            .await?),
        }
    }

    pub async fn get_user_by_username(&self, username: &str) -> Result<Option<User>> {
        match self {
            Self::Postgres(pool) => Ok(sqlx::query_as::<_, User>(
                "SELECT u.id, u.username, u.password_hash, u.role_id, u.status, \
                            (u.created_at AT TIME ZONE 'UTC') as created_at, \
                            (u.updated_at AT TIME ZONE 'UTC') as updated_at, \
                            COALESCE(ou.org_id::BIGINT, 1) as org_id \
                     FROM users u \
                     LEFT JOIN org_users ou ON ou.user_id = u.id \
                     WHERE u.username = $1",
            )
            .bind(username)
            .fetch_optional(pool)
            .await?),
        }
    }

    pub async fn list_users(&self) -> Result<Vec<User>> {
        let query = "SELECT u.id, u.username, u.password_hash, u.role_id, u.status, \
                            (u.created_at AT TIME ZONE 'UTC') as created_at, \
                            (u.updated_at AT TIME ZONE 'UTC') as updated_at, \
                            COALESCE(ou.org_id::BIGINT, 1) as org_id \
                     FROM users u \
                     LEFT JOIN org_users ou ON ou.user_id = u.id \
                     ORDER BY u.created_at DESC";
        match self {
            Self::Postgres(pool) => Ok(sqlx::query_as::<_, User>(query).fetch_all(pool).await?),
        }
    }

    pub async fn delete_user(&self, id: i64) -> Result<bool> {
        let pg_query = "DELETE FROM users WHERE id = $1";
        match self {
            Self::Postgres(pool) => {
                let result = sqlx::query(pg_query).bind(id).execute(pool).await?;
                Ok(result.rows_affected() > 0)
            }
        }
    }

    pub async fn update_user_status(&self, id: i64, status: &str) -> Result<bool> {
        let pg_query = "UPDATE users SET status = $1 WHERE id = $2";
        match self {
            Self::Postgres(pool) => {
                let result = sqlx::query(pg_query)
                    .bind(status)
                    .bind(id)
                    .execute(pool)
                    .await?;
                Ok(result.rows_affected() > 0)
            }
        }
    }

    pub async fn update_user_profile(
        &self,
        id: i64,
        role_id: Option<&str>,
        password_hash: Option<&str>,
    ) -> Result<bool> {
        let pg_query = r#"
            UPDATE users
            SET role_id = COALESCE($1, role_id),
                password_hash = COALESCE($2, password_hash)
            WHERE id = $3
        "#;
        match self {
            Self::Postgres(pool) => {
                let result = sqlx::query(pg_query)
                    .bind(role_id)
                    .bind(password_hash)
                    .bind(id)
                    .execute(pool)
                    .await?;
                Ok(result.rows_affected() > 0)
            }
        }
    }
}
