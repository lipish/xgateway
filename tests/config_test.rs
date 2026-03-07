#[cfg(test)]
mod tests {
    use std::env;
    use xgateway::config::{ConfigLoader, ConfigManager};

    #[tokio::test]
    async fn test_config_file_loading() {
        env::set_var(
            "DATABASE_URL",
            "postgresql://test:test@localhost:5432/testdb",
        );

        let config_manager = ConfigManager::load().await.unwrap();
        let config = config_manager.get();

        println!("=== Config loaded successfully ===");
        println!("Version: {}", config.version);
        println!("Server host: {}", config.server.host);
        println!("Server port: {}", config.server.port);
        println!("Log level: {}", config.server.log_level);
        println!(
            "Database max connections: {}",
            config.database.max_connections
        );
        println!("Security auth_key: {:?}", config.security.auth_key);
        println!(
            "API key expiry days: {}",
            config.security.api_key_expiry_days
        );
        println!("===================================");

        assert_eq!(config.server.port, 3001);
        assert_eq!(config.server.log_level, "debug");
        assert_eq!(config.security.api_key_expiry_days, 30);
    }
}
