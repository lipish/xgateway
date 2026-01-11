use sqlx::{Row};
use anyhow::Result;
use crate::db::{DatabasePool, User, NewUser};

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

    pub async fn get_user_by_username(&self, username: &str) -> Result<Option<User>> {
        match self {
            Self::Postgres(pool) => {
                Ok(sqlx::query_as::<_, User>("SELECT id, username, password_hash, role_id, status, (created_at AT TIME ZONE 'UTC') as created_at, (updated_at AT TIME ZONE 'UTC') as updated_at FROM users WHERE username = $1")
                    .bind(username)
                    .fetch_optional(pool)
                    .await?)
            }
        }
    }

    pub async fn list_users(&self) -> Result<Vec<User>> {
        let query = "SELECT id, username, password_hash, role_id, status, (created_at AT TIME ZONE 'UTC') as created_at, (updated_at AT TIME ZONE 'UTC') as updated_at FROM users ORDER BY created_at DESC";
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
                let result = sqlx::query(pg_query).bind(status).bind(id).execute(pool).await?;
                Ok(result.rows_affected() > 0)
            }
        }
    }
}
