use anyhow::Result;
use tracing::{info, warn};
use super::DatabasePool;

pub async fn try_database() -> Result<DatabasePool> {
    if let Ok(database_url) = std::env::var("DATABASE_URL") {
        if database_url.starts_with("postgres://") || database_url.starts_with("postgresql://") {
            info!("Found PostgreSQL DATABASE_URL, connecting...");
            return DatabasePool::new_postgres(&database_url).await;
        }
    }
    
    try_file_database().await
}

pub async fn try_file_database() -> Result<DatabasePool> {
    info!("Attempting file-based database initialization...");
    
    let db_path = std::env::current_dir()
        .map_err(|e| anyhow::anyhow!("Failed to get current directory: {}", e))?
        .join("data")
        .join("llm_link.db");
    
    info!("Database path: {:?}", db_path);
    
    let tmp_path = std::path::Path::new("/tmp").join("llm_link_test.db");
    info!("Testing with temp path: {:?}", tmp_path);
    
    match test_sqlite_connection(&tmp_path).await {
        Ok(_) => info!("Temp directory SQLite test passed"),
        Err(e) => {
            warn!("Temp directory SQLite test failed: {}", e);
            return Err(anyhow::anyhow!("File-based SQLite not working: {}", e));
        }
    }
    
    let data_dir = db_path.parent().unwrap();
    
    std::fs::create_dir_all(data_dir)
        .map_err(|e| anyhow::anyhow!("Failed to create data directory: {}", e))?;
    
    match std::fs::metadata(data_dir) {
        Ok(metadata) => {
            info!("Data directory exists, is_dir: {}, readonly: {}", 
                  metadata.is_dir(), metadata.permissions().readonly());
        }
        Err(e) => {
            warn!("Cannot access data directory: {}", e);
            return Err(anyhow::anyhow!("Directory access failed: {}", e));
        }
    }
    
    let test_file = data_dir.join(".test_write");
    match std::fs::write(&test_file, "test") {
        Ok(_) => {
            info!("Data directory is writable");
            let _ = std::fs::remove_file(&test_file);
        }
        Err(e) => {
            warn!("Data directory is not writable: {}", e);
            return Err(anyhow::anyhow!("Directory not writable: {}", e));
        }
    }
    
    DatabasePool::new_sqlite(&db_path).await
}

pub async fn test_in_memory_database() -> Result<()> {
    info!("Testing in-memory SQLite database...");
    
    let pool = sqlx::SqlitePool::connect(":memory:").await?;
    
    let result: i64 = sqlx::query_scalar("SELECT 1")
        .fetch_one(&pool)
        .await?;
    
    if result == 1 {
        info!("In-memory database test successful");
        pool.close().await;
        Ok(())
    } else {
        anyhow::bail!("Unexpected query result: {}", result);
    }
}

pub async fn test_sqlite_connection(db_path: &std::path::Path) -> Result<()> {
    info!("Testing SQLite connectivity...");

    let test_conn_str = format!("sqlite://{}?mode=rwc", db_path.display());
    let pool = sqlx::SqlitePool::connect(&test_conn_str).await?;
    
    let result: i64 = sqlx::query_scalar("SELECT 1")
        .fetch_one(&pool)
        .await?;
    
    if result == 1 {
        info!("Basic SQLite query successful");
        pool.close().await;
        Ok(())
    } else {
        anyhow::bail!("Unexpected query result: {}", result);
    }
}
