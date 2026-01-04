use sqlx::Row;
use anyhow::Result;
use crate::db::{DatabasePool, UserInstance, NewUserInstance};

impl DatabasePool {
    /// Grant user access to a provider instance
    pub async fn grant_user_instance(&self, grant: NewUserInstance) -> Result<i32> {
        match self {
            Self::Sqlite(pool) => {
                let result = sqlx::query(
                    "INSERT INTO user_instances (user_id, provider_id, granted_by) VALUES (?, ?, ?)"
                )
                .bind(grant.user_id)
                .bind(grant.provider_id)
                .bind(grant.granted_by)
                .execute(pool)
                .await?;
                Ok(result.last_insert_rowid() as i32)
            }
            Self::Postgres(pool) => {
                let row = sqlx::query(
                    "INSERT INTO user_instances (user_id, provider_id, granted_by) VALUES ($1, $2, $3) RETURNING id"
                )
                .bind(grant.user_id)
                .bind(grant.provider_id)
                .bind(grant.granted_by)
                .fetch_one(pool)
                .await?;
                Ok(row.get("id"))
            }
        }
    }

    /// Revoke user access to a provider instance
    pub async fn revoke_user_instance(&self, user_id: i32, provider_id: i64) -> Result<bool> {
        let query = "DELETE FROM user_instances WHERE user_id = ? AND provider_id = ?";
        let pg_query = "DELETE FROM user_instances WHERE user_id = $1 AND provider_id = $2";
        match self {
            Self::Sqlite(pool) => {
                let result = sqlx::query(query)
                    .bind(user_id)
                    .bind(provider_id)
                    .execute(pool)
                    .await?;
                Ok(result.rows_affected() > 0)
            }
            Self::Postgres(pool) => {
                let result = sqlx::query(pg_query)
                    .bind(user_id)
                    .bind(provider_id)
                    .execute(pool)
                    .await?;
                Ok(result.rows_affected() > 0)
            }
        }
    }

    /// Get all instances granted to a user
    pub async fn get_user_granted_instances(&self, user_id: i32) -> Result<Vec<UserInstance>> {
        let query = "SELECT id, user_id, provider_id, granted_at, granted_by FROM user_instances WHERE user_id = ? ORDER BY granted_at DESC";
        let pg_query = "SELECT id, user_id, provider_id, granted_at, granted_by FROM user_instances WHERE user_id = $1 ORDER BY granted_at DESC";
        match self {
            Self::Sqlite(pool) => {
                Ok(sqlx::query_as::<_, UserInstance>(query)
                    .bind(user_id)
                    .fetch_all(pool)
                    .await?)
            }
            Self::Postgres(pool) => {
                Ok(sqlx::query_as::<_, UserInstance>(pg_query)
                    .bind(user_id)
                    .fetch_all(pool)
                    .await?)
            }
        }
    }

    /// Get all users granted to a provider instance
    pub async fn get_instance_granted_users(&self, provider_id: i64) -> Result<Vec<UserInstance>> {
        let query = "SELECT id, user_id, provider_id, granted_at, granted_by FROM user_instances WHERE provider_id = ? ORDER BY granted_at DESC";
        let pg_query = "SELECT id, user_id, provider_id, granted_at, granted_by FROM user_instances WHERE provider_id = $1 ORDER BY granted_at DESC";
        match self {
            Self::Sqlite(pool) => {
                Ok(sqlx::query_as::<_, UserInstance>(query)
                    .bind(provider_id)
                    .fetch_all(pool)
                    .await?)
            }
            Self::Postgres(pool) => {
                Ok(sqlx::query_as::<_, UserInstance>(pg_query)
                    .bind(provider_id)
                    .fetch_all(pool)
                    .await?)
            }
        }
    }

    /// Check if user has access to a provider instance
    pub async fn user_has_instance_access(&self, user_id: i32, provider_id: i64) -> Result<bool> {
        let query = "SELECT COUNT(*) as count FROM user_instances WHERE user_id = ? AND provider_id = ?";
        let pg_query = "SELECT COUNT(*) as count FROM user_instances WHERE user_id = $1 AND provider_id = $2";
        match self {
            Self::Sqlite(pool) => {
                let row = sqlx::query(query)
                    .bind(user_id)
                    .bind(provider_id)
                    .fetch_one(pool)
                    .await?;
                let count: i64 = row.get("count");
                Ok(count > 0)
            }
            Self::Postgres(pool) => {
                let row = sqlx::query(pg_query)
                    .bind(user_id)
                    .bind(provider_id)
                    .fetch_one(pool)
                    .await?;
                let count: i64 = row.get("count");
                Ok(count > 0)
            }
        }
    }
}
