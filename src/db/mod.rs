pub mod models;
pub mod pool;
pub mod init;

pub use models::*;
pub use pool::*;
pub use init::*;

use sqlx::SqlitePool;
use std::path::Path;

/// Initialize SQLite database with migrations
pub async fn initialize_database(db_path: &Path) -> Result<SqlitePool, sqlx::Error> {
    // Ensure data directory exists (synchronously)
    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| sqlx::Error::Io(e))?;
    }

    // Log current working directory for debugging
    let current_dir = std::env::current_dir()
        .map_err(|e| sqlx::Error::Io(e))?;
    tracing::info!("Current working directory: {:?}", current_dir);
    tracing::info!("Attempting to create database at: {:?}", db_path);

    // Create database connection pool with proper connection string
    // mode=rwc enables read-write-create mode so the database file is created if it doesn't exist
    let connection_string = format!("sqlite://{}?mode=rwc", db_path.display());
    tracing::info!("Using connection string: {}", connection_string);

    let pool = SqlitePool::connect(&connection_string).await?;
    
    // Run migrations
    sqlx::migrate!("./migrations").run(&pool).await?;
    
    tracing::info!("✅ Database initialized successfully");
    Ok(pool)
}

/// Create test database for unit tests
#[cfg(test)]
#[allow(dead_code)] // Will be used in Phase 2 testing
pub async fn create_test_db() -> Result<SqlitePool, sqlx::Error> {
    let pool = SqlitePool::connect(":memory:").await?;
    sqlx::migrate!("./migrations").run(&pool).await?;
    Ok(pool)
}
