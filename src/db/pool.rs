use sqlx::PgPool;
use tracing::info;
use anyhow::Result;

#[derive(Clone)]
pub enum DatabasePool {
    Postgres(PgPool),
}

impl DatabasePool {
    pub async fn new_postgres(connection_string: &str) -> Result<Self> {
        info!("Connecting to PostgreSQL: {}", connection_string);
        let pool = PgPool::connect(connection_string).await?;
        sqlx::migrate!("./migrations/postgres").run(&pool).await?;

        Ok(Self::Postgres(pool))
    }

    #[allow(dead_code)]
    pub async fn close(&self) {
        match self {
            Self::Postgres(pool) => pool.close().await,
        }
    }
}