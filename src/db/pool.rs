use sqlx::{SqlitePool, PgPool};
use std::path::Path;
use tracing::info;
use anyhow::Result;

#[derive(Clone)]
pub enum DatabasePool {
    Sqlite(SqlitePool),
    Postgres(PgPool),
}

impl DatabasePool {
    pub async fn new_sqlite(db_path: &Path) -> Result<Self> {
        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| anyhow::anyhow!("Failed to create directory: {}", e))?;
        }

        let connection_string = format!("sqlite://{}?mode=rwc", db_path.display());
        info!("Connecting to SQLite: {}", connection_string);
        
        let pool = SqlitePool::connect(&connection_string).await?;
        sqlx::migrate!("./migrations/sqlite").run(&pool).await?;

        Ok(Self::Sqlite(pool))
    }

    pub async fn new_postgres(connection_string: &str) -> Result<Self> {
        info!("Connecting to PostgreSQL: {}", connection_string);
        let pool = PgPool::connect(connection_string).await?;
        sqlx::migrate!("./migrations/postgres").run(&pool).await?;

        Ok(Self::Postgres(pool))
    }

    pub async fn new_sqlite_memory() -> Result<Self> {
        info!("Creating in-memory SQLite database");
        let pool = SqlitePool::connect("sqlite::memory:?mode=memory&cache=shared").await?;
        sqlx::migrate!("./migrations/sqlite").run(&pool).await?;

        Ok(Self::Sqlite(pool))
    }

    pub async fn close(&self) {
        match self {
            Self::Sqlite(pool) => pool.close().await,
            Self::Postgres(pool) => pool.close().await,
        }
    }
}