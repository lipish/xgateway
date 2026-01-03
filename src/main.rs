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

use clap::Parser;
use anyhow::Result;
use tracing::{info, error, warn};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use cli::{Args, list_applications, show_application_info};
use engine::instance::init_instance_id;
use db::{try_database, test_in_memory_database};
use pool::PoolManager;
use router::build_multi_mode_app;
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

async fn run_multi_mode(args: Args) -> Result<()> {
    info!("Multi-provider mode: Using database and web interface");

    match test_in_memory_database().await {
        Ok(_) => info!("In-memory database test passed - SQLite library works"),
        Err(e) => {
            error!("In-memory database test failed: {}", e);
            error!("This indicates a SQLite library installation issue");
            std::process::exit(1);
        }
    }

    let db_pool = match try_database().await {
        Ok(pool) => {
            info!("Database initialized successfully");
            pool
        }
        Err(e) => {
            error!("Database initialization failed: {}", e);
            error!("Please ensure:");
            error!(" 1. Database file permissions are correct");
            error!(" 2. Database directory exists and is writable");
            error!(" 3. No migration file conflicts");
            error!(" 4. Or delete data/llm_link.db to start fresh");
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
    let config = Arc::new(tokio::sync::RwLock::new(settings));
    
    let app = build_multi_mode_app(
        db_pool.clone(), 
        Arc::clone(&pool_manager),
        llm_service,
        config,
    );

    let port = args.port.unwrap_or(3000);
    let bind_addr = format!("0.0.0.0:{}", port);

    info!("LLM Link unified service starting on http://localhost:{}", port);
    info!("LLM API Proxy: http://localhost:{}/v1/chat/completions", port);
    info!("Admin API: http://localhost:{}/api/*", port);
    info!("Health check: http://localhost:{}/health", port);

    let listener = tokio::net::TcpListener::bind(&bind_addr).await?;
    info!("LLM Link is ready to accept connections!");

    axum::serve(listener, app).await?;

    pool_manager.shutdown().await;

    Ok(())
}

fn initialize_logging(args: &Args) {
    let log_level = args.log_level.clone()
        .or_else(|| std::env::var("LLM_LINK_LOG_LEVEL").ok())
        .unwrap_or_else(|| "info".to_string());

    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new(log_level)),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();
}