use anyhow::Result;
use tracing::info;
use super::DatabasePool;

pub async fn try_database() -> Result<DatabasePool> {
    if let Ok(database_url) = std::env::var("DATABASE_URL") {
        if database_url.starts_with("postgres://") || database_url.starts_with("postgresql://") {
            info!("Found PostgreSQL DATABASE_URL, connecting...");
            return DatabasePool::new_postgres(&database_url).await;
        }
    }

    anyhow::bail!("DATABASE_URL is not set to a postgres/postgresql URL; PostgreSQL is required");
}
