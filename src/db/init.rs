use super::DatabasePool;
use anyhow::Result;
use std::io::{self, Write};
use tracing::{error, info, warn};

pub async fn try_database() -> Result<DatabasePool> {
    let mut database_url = std::env::var("DATABASE_URL").ok();

    if database_url.is_none() {
        warn!("DATABASE_URL environment variable is not set.");
        print!("Please enter PostgreSQL DATABASE_URL: ");
        io::stdout().flush()?;

        let mut input = String::new();
        io::stdin().read_line(&mut input)?;
        let input = input.trim().trim_matches('"');

        if !input.is_empty() {
            database_url = Some(input.to_string());
        } else {
            let user = std::env::var("USER").unwrap_or_else(|_| "postgres".to_string());
            let default_url = format!("postgresql://{}@localhost:5432/xgateway", user);
            info!("No input provided, trying default: {}", default_url);
            database_url = Some(default_url);
        }
    }

    let database_url = database_url.unwrap();

    if database_url.starts_with("postgres://") || database_url.starts_with("postgresql://") {
        info!("Connecting to PostgreSQL...");
        return DatabasePool::new_postgres(&database_url)
            .await
            .map_err(|e| {
                error!("Connection failed: {}", e);
                anyhow::anyhow!(
                    "Failed to connect to PostgreSQL at {}.\n\n\
                Troubleshooting:\n\
                1. Is PostgreSQL running? (brew services start postgresql)\n\
                2. Does the database exist? (createdb xgateway)\n\
                3. Are the credentials correct?\n\n\
                Error: {}",
                    database_url,
                    e
                )
            });
    }

    anyhow::bail!("DATABASE_URL must be a postgres/postgresql URL");
}
