
#[cfg(test)]
mod tests {
    use xgateway::config::loader::ConfigLoader;
    use xgateway::config::models::Config;
    use std::env;

    #[test]
    fn test_env_var_expansion() {
        env::set_var("TEST_ENV_VAR", "hello_from_env");
        env::set_var("DATABASE_URL_TEST", "postgresql://envuser:envpass@envhost:5432/envdb");
        
        let test_yaml = r#"
version: "1.0"
server:
  host: "127.0.0.1"
  port: 3000
database:
  url: "${DATABASE_URL_TEST}"
security:
  auth_key: "${TEST_ENV_VAR}"
  api_key_expiry_days: 90
"#;
        
        let rt = tokio::runtime::Runtime::new().unwrap();
        let config = rt.block_on(async {
            ConfigLoader::load_from_yaml_str(test_yaml).await.unwrap()
        });
        
        println!("=== Environment variable expansion test ===");
        println!("Database URL: {}", config.database.url);
        println!("Auth key: {:?}", config.security.auth_key);
        println!("API key expiry days: {}", config.security.api_key_expiry_days);
        println!("===========================================");
        
        assert_eq!(config.database.url, "postgresql://envuser:envpass@envhost:5432/envdb");
        assert_eq!(config.security.auth_key, Some("hello_from_env".to_string()));
        assert_eq!(config.security.api_key_expiry_days, 90);
    }
}
