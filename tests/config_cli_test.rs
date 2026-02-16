
#[cfg(test)]
mod tests {
    use xgateway::config::{ConfigManager, ConfigLoader};
    use xgateway::cli::Args;
    use std::env;
    use clap::Parser;

    #[tokio::test]
    async fn test_cli_args_override_config() {
        env::set_var("DATABASE_URL", "postgresql://xinference@localhost:5432/xgateway");
        
        let config_manager = ConfigManager::load().await.unwrap();
        let mut config = config_manager.get();
        
        println!("=== Original config ===");
        println!("Port: {}", config.server.port);
        println!("Host: {}", config.server.host);
        
        let cli_args = Args::parse_from(vec![
            "xgateway",
            "--port", "8080",
            "--host", "0.0.0.0",
            "--log-level", "trace",
            "--auth-key", "cli-override-key-456"
        ]);
        
        ConfigLoader::merge_cli_args(&mut config, &cli_args);
        
        println!("\n=== After CLI args merge ===");
        println!("Port: {}", config.server.port);
        println!("Host: {}", config.server.host);
        println!("Log level: {}", config.server.log_level);
        println!("Auth key: {:?}", config.security.auth_key);
        println!("===================================");
        
        assert_eq!(config.server.port, 8080);
        assert_eq!(config.server.host, "0.0.0.0");
        assert_eq!(config.server.log_level, "trace");
        assert_eq!(config.security.auth_key, Some("cli-override-key-456".to_string()));
    }
}
