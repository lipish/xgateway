mod tuner;
mod apps;
mod settings;
mod service;
mod engine;
mod cli;
mod provider;
mod db;
mod admin;
mod pool;
mod adapter;
mod endpoints;
mod router;
mod xtrace;
mod config;

use clap::Parser;
use anyhow::Result;
use tracing::{info, error, warn};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use cli::{Args, list_applications, show_application_info};
use engine::instance::init_instance_id;
use db::try_database;
use pool::PoolManager;
use router::build_multi_mode_app;
use crate::xtrace::XTraceClient;
use crate::config::{ConfigManager, ConfigLoader};
use std::sync::Arc;

#[tokio::main]
async fn main() -> Result<()> {
    let args = Args::parse();

    initialize_logging(&args);
    init_instance_id();

    if args.list_apps {
        list_applications();
        return Ok(());
    }

    if let Some(app_name) = &args.app_info {
        show_application_info(app_name);
        return Ok(());
    }

    run_multi_mode(args).await
}

fn start_xtrace() {
    let database_url = match std::env::var("XTRACE_DATABASE_URL")
        .or_else(|_| std::env::var("DATABASE_URL"))
    {
        Ok(url) => url,
        Err(_) => {
            warn!("DATABASE_URL not set, skipping xtrace startup");
            return;
        }
    };

    let api_bearer_token = std::env::var("XTRACE_API_BEARER_TOKEN")
        .or_else(|_| std::env::var("API_BEARER_TOKEN"))
        .unwrap_or_else(|_| "xtrace-token".to_string());

    let bind_addr = std::env::var("XTRACE_BIND_ADDR")
        .unwrap_or_else(|_| "127.0.0.1:8742".to_string());

    let config = ::xtrace::ServerConfig {
        database_url,
        api_bearer_token: api_bearer_token.clone(),
        bind_addr: bind_addr.clone(),
        default_project_id: std::env::var("XTRACE_DEFAULT_PROJECT_ID")
            .unwrap_or_else(|_| "default".to_string()),
        langfuse_public_key: std::env::var("XTRACE_PUBLIC_KEY")
            .ok()
            .or_else(|| std::env::var("LANGFUSE_PUBLIC_KEY").ok()),
        langfuse_secret_key: std::env::var("XTRACE_SECRET_KEY")
            .ok()
            .or_else(|| std::env::var("LANGFUSE_SECRET_KEY").ok()),
        rate_limit_qps: std::env::var("RATE_LIMIT_QPS")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(20),
        rate_limit_burst: std::env::var("RATE_LIMIT_BURST")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(40),
    };

    info!("Starting xtrace service in-process on {}", bind_addr);

    tokio::spawn(async move {
        if let Err(e) = ::xtrace::run_server(config).await {
            error!("xtrace service failed: {}", e);
        }
    });

    std::env::set_var("XTRACE_ENABLED", "true");
    std::env::set_var("XTRACE_BASE_URL", format!("http://{}", bind_addr));
    std::env::set_var("XTRACE_API_BEARER_TOKEN", &api_bearer_token);
    info!("xtrace service spawned successfully");
}

async fn run_multi_mode(args: Args) -> Result<()> {
    info!("Multi-provider mode: Using database and web interface");

    start_xtrace();

    let config_manager = ConfigManager::load().await?;
    let mut config = config_manager.get();
    ConfigLoader::merge_cli_args(&mut config, &args);
    info!("Configuration loaded successfully");

    let db_pool = match try_database().await {
        Ok(pool) => {
            info!("Database initialized successfully");
            pool
        }
        Err(e) => {
            error!("Database initialization failed: {}", e);
            error!("Please ensure DATABASE_URL is set to a postgres/postgresql URL and the server is reachable");
            std::process::exit(1);
        }
    };

    let pool_manager = Arc::new(PoolManager::new(db_pool.clone()));
    if let Err(e) = pool_manager.init().await {
        warn!("Failed to initialize pool manager: {}", e);
    }

    let _health_check_handle = Arc::clone(&pool_manager).start_health_check();
    info!("Background health check started");

    let settings = if let Some(app_name) = &args.app {
        if let Some(app) = crate::apps::SupportedApp::from_str(app_name) {
            crate::apps::AppConfigGenerator::generate_config(&app, args.llm_api_key.as_deref())
        } else {
            crate::settings::Settings::default()
        }
    } else if let Some(protocols) = &args.protocols {
        let proto_list: Vec<String> = protocols.split(',').map(|s| s.to_string()).collect();
        crate::apps::AppConfigGenerator::generate_protocol_config(&proto_list, args.llm_api_key.as_deref())
    } else {
        crate::settings::Settings::default()
    };

    let llm_service = Arc::new(tokio::sync::RwLock::new(crate::service::Service::new(&settings.llm_backend)?));
    let old_config = Arc::new(tokio::sync::RwLock::new(settings));
    let xtrace = XTraceClient::from_env();
    
    let app = build_multi_mode_app(
        db_pool.clone(), 
        Arc::clone(&pool_manager),
        llm_service,
        old_config,
        xtrace,
    );

    let port = config.server.port;
    let bind_addr = format!("{}:{}", config.server.host, port);

    info!("XGateway unified service starting on http://{}", bind_addr);
    info!("LLM API Proxy: http://{}/v1/chat/completions", bind_addr);
    info!("Admin API: http://{}/api/*", bind_addr);
    info!("Health check: http://{}/health", bind_addr);

    let listener = tokio::net::TcpListener::bind(&bind_addr).await?;
    info!("XGateway is ready to accept connections!");

    axum::serve(listener, app).await?;

    pool_manager.shutdown().await;

    Ok(())
}

fn initialize_logging(args: &Args) {
    let log_level = args.log_level.clone()
        .or_else(|| std::env::var("XGATEWAY_LOG_LEVEL").ok())
        .unwrap_or_else(|| "info".to_string());

    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new(log_level)),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();
}
