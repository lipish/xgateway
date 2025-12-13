// Core modules (always present)
mod adapters;
mod apps;
mod settings;
mod service;
mod normalizer;
mod api;
mod models;
mod cli;
mod provider;

// New modules for multi-mode support
mod db;
mod mode;
mod admin;
mod pool;

use anyhow::Result;
use axum::{
    routing::{get, post},
    Router,
    extract::Request,
    response::Response,
};
use clap::Parser;
use settings::Settings;
use api::{AppState, health_check, info};
use api::config::{get_current_config, update_config_for_restart, validate_key, validate_key_for_update, update_key, switch_provider, get_pid, shutdown, get_health, init_instance_id};
use tower::ServiceBuilder;
use tower_http::{
    cors::{Any, CorsLayer},
    trace::TraceLayer,
    classify::ServerErrorsFailureClass,
};
use tracing::{info, error, warn, Span};
use std::time::Duration;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use cli::{Args, ConfigLoader, list_applications, show_application_info};

// Import new modules
use mode::RunMode;
use db::{DatabasePool, initialize_provider_types};
use admin::create_admin_app;

#[tokio::main]
async fn main() -> Result<()> {
    let args = Args::parse();

    // Initialize logging
    initialize_logging(&args);
    
    // Initialize instance ID for tracking restarts
    init_instance_id();

    // Handle special CLI modes first
    if args.list_apps {
        list_applications();
        return Ok(());
    }

    if let Some(app_name) = &args.app_info {
        show_application_info(app_name);
        return Ok(());
    }

    // Get run mode (default to multi for better UX)
    let run_mode = args.mode.unwrap_or_default();
    
    info!("🚀 Starting LLM Link in {} mode", run_mode);
    
    // Route to appropriate mode handler
    match run_mode {
        RunMode::Single => run_single_mode(args).await,
        RunMode::Multi => run_multi_mode(args).await,
    }
}

/// Run in single provider mode (traditional)
async fn run_single_mode(args: Args) -> Result<()> {
    info!("📋 Single provider mode: Using YAML configuration");
    
    // Load configuration (required for single mode)
    let (config, config_source) = ConfigLoader::load_config(&args)?;
    let config = ConfigLoader::apply_cli_overrides(config, &args);

    // Log configuration
    log_configuration(&config, &config_source);

    // Initialize LLM service
    let llm_service = initialize_llm_service(&config)?;
    let app_state = AppState::new(llm_service, config.clone());

    // Build and start server
    let app = build_single_mode_app(app_state, &config);
    start_server(app, &config).await?;

    Ok(())
}

/// Run in multi provider mode (new zero-config experience)
async fn run_multi_mode(args: Args) -> Result<()> {
    info!("🌐 Multi provider mode: Using database and web interface");

    // First test with in-memory database to isolate SQLite library issues
    match test_in_memory_database().await {
        Ok(_) => info!("✅ In-memory database test passed - SQLite library works"),
        Err(e) => {
            error!("❌ In-memory database test failed: {}", e);
            error!("This indicates a SQLite library installation issue");
            std::process::exit(1);
        }
    }

    // Try file-based database first, fallback to in-memory if it fails
    let db_pool = match try_file_database().await {
        Ok(pool) => {
            info!("✅ File-based database initialized successfully");
            pool
        }
        Err(e) => {
            warn!("⚠️ File-based database failed: {}", e);
            info!("🔄 Falling back to in-memory database for Phase 1");

            match DatabasePool::new_memory().await {
                Ok(pool) => {
                    info!("✅ In-memory database initialized successfully");
                    pool
                }
                Err(e) => {
                    error!("❌ In-memory database also failed: {}", e);
                    std::process::exit(1);
                }
            }
        }
    };

    // Initialize provider types from models.yaml
    if let Err(e) = initialize_provider_types(&db_pool).await {
        warn!("⚠️ Failed to initialize provider types: {}", e);
    }

    // Build unified application with both Admin API and LLM Proxy
    let app = build_multi_mode_app(db_pool.clone());

    // Use port 3000 as the unified service port
    let port = args.port.unwrap_or(3000);
    let bind_addr = format!("0.0.0.0:{}", port);

    info!("🚀 LLM Link unified service starting on http://localhost:{}", port);
    info!("📡 LLM API Proxy: http://localhost:{}/v1/chat/completions", port);
    info!("🔧 Admin API: http://localhost:{}/api/*", port);
    info!("🏥 Health check: http://localhost:{}/health", port);

    // Start unified server
    let listener = tokio::net::TcpListener::bind(&bind_addr).await?;
    info!("🎉 LLM Link is ready to accept connections!");

    axum::serve(listener, app).await?;

    Ok(())
}

/// Build multi-mode application with Admin API and LLM Proxy routes
fn build_multi_mode_app(db_pool: DatabasePool) -> Router {
    use tower_http::cors::{Any, CorsLayer};

    // Admin API routes (/api/*)
    let admin_routes = create_admin_app(db_pool.clone());

    // LLM Proxy routes (/v1/*)
    let llm_proxy_routes = build_llm_proxy_routes(db_pool.clone());

    // Basic routes
    let basic_routes = Router::new()
        .route("/", get(|| async {
            axum::Json(serde_json::json!({
                "service": "LLM Link",
                "version": env!("CARGO_PKG_VERSION"),
                "mode": "multi-provider",
                "endpoints": {
                    "llm_api": "/v1/*",
                    "admin_api": "/api/*",
                    "health": "/health"
                }
            }))
        }))
        .route("/health", get(|| async {
            axum::Json(serde_json::json!({
                "status": "healthy",
                "timestamp": chrono::Utc::now().to_rfc3339()
            }))
        }));

    // Merge all routes
    let app = basic_routes
        .merge(admin_routes)
        .merge(llm_proxy_routes)
        .layer(
            CorsLayer::new()
                .allow_origin(Any)
                .allow_methods(Any)
                .allow_headers(Any)
        );

    app
}

/// Build LLM proxy routes for multi-provider mode
fn build_llm_proxy_routes(db_pool: DatabasePool) -> Router {
    use axum::{extract::State, Json, http::StatusCode};
    use serde_json::json;

    Router::new()
        // OpenAI compatible endpoints
        .route("/v1/chat/completions", post(handle_chat_completions))
        .route("/v1/models", get(handle_list_models))
        .route("/v1/models/:model", get(handle_get_model))
        .with_state(db_pool)
}

/// Handle chat completions request - routes to appropriate provider
async fn handle_chat_completions(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
    axum::Json(request): axum::Json<serde_json::Value>,
) -> axum::response::Response {
    use axum::http::StatusCode;
    use axum::response::IntoResponse;

    // Check if streaming is requested
    let is_stream = request.get("stream").and_then(|v| v.as_bool()).unwrap_or(false);

    // Check if a specific provider_id is requested
    let requested_provider_id = request.get("provider_id").and_then(|v| v.as_i64());

    // Get providers from database
    let providers = match db_pool.list_providers().await {
        Ok(p) => p,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                axum::Json(serde_json::json!({
                    "error": {
                        "message": format!("Failed to get providers: {}", e),
                        "type": "server_error"
                    }
                }))
            ).into_response();
        }
    };

    // Find the provider to use
    let provider = if let Some(provider_id) = requested_provider_id {
        // Use specific provider by ID
        match providers.iter().find(|p| p.id == provider_id) {
            Some(p) => p.clone(),
            None => {
                return (
                    StatusCode::NOT_FOUND,
                    axum::Json(serde_json::json!({
                        "error": {
                            "message": format!("Provider with id {} not found", provider_id),
                            "type": "provider_not_found"
                        }
                    }))
                ).into_response();
            }
        }
    } else {
        // Use first enabled provider (default behavior)
        let enabled_providers: Vec<_> = providers.into_iter().filter(|p| p.enabled).collect();
        if enabled_providers.is_empty() {
            return (
                StatusCode::SERVICE_UNAVAILABLE,
                axum::Json(serde_json::json!({
                    "error": {
                        "message": "No providers available. Please configure providers in the admin interface.",
                        "type": "no_providers"
                    }
                }))
            ).into_response();
        }
        enabled_providers[0].clone()
    };

    // Parse provider config and forward request
    let config: serde_json::Value = serde_json::from_str(&provider.config).unwrap_or_default();
    let api_key = config.get("api_key").and_then(|v| v.as_str()).unwrap_or("");
    let base_url = config.get("base_url").and_then(|v| v.as_str()).unwrap_or("");
    let model = config.get("model").and_then(|v| v.as_str()).unwrap_or("");

    // Build the actual request to provider
    let client = reqwest::Client::new();
    let url = format!("{}/chat/completions", base_url.trim_end_matches('/'));

    // Merge model into request if not specified, and remove provider_id from request body
    let mut req_body = request.clone();
    if let Some(obj) = req_body.as_object_mut() {
        obj.remove("provider_id"); // Remove custom field before forwarding
    }
    if req_body.get("model").is_none() || req_body.get("model").unwrap().as_str() == Some("") {
        req_body["model"] = serde_json::json!(model);
    }

    match client
        .post(&url)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&req_body)
        .send()
        .await
    {
        Ok(response) => {
            let status = StatusCode::from_u16(response.status().as_u16()).unwrap_or(StatusCode::OK);

            if is_stream {
                // For streaming, forward the response body directly
                let stream = response.bytes_stream();
                let body = axum::body::Body::from_stream(stream);

                axum::response::Response::builder()
                    .status(status)
                    .header("Content-Type", "text/event-stream")
                    .header("Cache-Control", "no-cache")
                    .header("Connection", "keep-alive")
                    .body(body)
                    .unwrap_or_else(|_| StatusCode::INTERNAL_SERVER_ERROR.into_response())
            } else {
                // For non-streaming, parse JSON response
                match response.json::<serde_json::Value>().await {
                    Ok(body) => (status, axum::Json(body)).into_response(),
                    Err(e) => (
                        StatusCode::BAD_GATEWAY,
                        axum::Json(serde_json::json!({
                            "error": {
                                "message": format!("Failed to parse provider response: {}", e),
                                "type": "proxy_error"
                            }
                        }))
                    ).into_response()
                }
            }
        }
        Err(e) => (
            StatusCode::BAD_GATEWAY,
            axum::Json(serde_json::json!({
                "error": {
                    "message": format!("Failed to reach provider: {}", e),
                    "type": "proxy_error",
                    "provider": provider.name
                }
            }))
        ).into_response()
    }
}

/// Handle list models request
async fn handle_list_models(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
) -> impl axum::response::IntoResponse {
    let providers = db_pool.list_providers().await.unwrap_or_default();
    let models: Vec<serde_json::Value> = providers
        .iter()
        .filter(|p| p.enabled)
        .map(|p| {
            let config: serde_json::Value = serde_json::from_str(&p.config).unwrap_or_default();
            let model = config.get("model").and_then(|v| v.as_str()).unwrap_or("unknown");
            serde_json::json!({
                "id": model,
                "object": "model",
                "owned_by": p.provider_type,
                "provider": p.name
            })
        })
        .collect();

    axum::Json(serde_json::json!({
        "object": "list",
        "data": models
    }))
}

/// Handle get model request
async fn handle_get_model(
    axum::extract::Path(model_id): axum::extract::Path<String>,
) -> impl axum::response::IntoResponse {
    axum::Json(serde_json::json!({
        "id": model_id,
        "object": "model",
        "owned_by": "llm-link"
    }))
}

/// Try to initialize file-based database
async fn try_file_database() -> Result<DatabasePool> {
    info!("Attempting file-based database initialization...");
    
    // Use absolute path for database to avoid path resolution issues
    let db_path = std::env::current_dir()
        .map_err(|e| anyhow::anyhow!("Failed to get current directory: {}", e))?
        .join("data")
        .join("llm_link.db");
    
    info!("Database path: {:?}", db_path);
    
    // Test with /tmp location to rule out project directory permissions
    let tmp_path = std::path::Path::new("/tmp").join("llm_link_test.db");
    info!("Testing with temp path: {:?}", tmp_path);
    
    match test_sqlite_connection(&tmp_path).await {
        Ok(_) => info!("✅ Temp directory SQLite test passed"),
        Err(e) => {
            warn!("⚠️ Temp directory SQLite test failed: {}", e);
            return Err(anyhow::anyhow!("File-based SQLite not working: {}", e));
        }
    }
    
    // Now try the actual data directory
    let data_dir = db_path.parent().unwrap();
    
    // Create directory and verify it exists
    std::fs::create_dir_all(data_dir)
        .map_err(|e| anyhow::anyhow!("Failed to create data directory: {}", e))?;
    
    // Verify directory was created and is writable
    match std::fs::metadata(data_dir) {
        Ok(metadata) => {
            info!("✅ Data directory exists, is_dir: {}, readonly: {}", 
                  metadata.is_dir(), metadata.permissions().readonly());
        }
        Err(e) => {
            warn!("⚠️ Cannot access data directory: {}", e);
            return Err(anyhow::anyhow!("Directory access failed: {}", e));
        }
    }
    
    // Test file creation in the directory
    let test_file = data_dir.join(".test_write");
    match std::fs::write(&test_file, "test") {
        Ok(_) => {
            info!("✅ Data directory is writable");
            let _ = std::fs::remove_file(&test_file);
        }
        Err(e) => {
            warn!("⚠️ Data directory is not writable: {}", e);
            return Err(anyhow::anyhow!("Directory not writable: {}", e));
        }
    }
    
    // Initialize database
    DatabasePool::new(&db_path).await
}

/// Test in-memory database to verify SQLite library works
async fn test_in_memory_database() -> Result<()> {
    info!("Testing in-memory SQLite database...");
    
    let pool = sqlx::SqlitePool::connect(":memory:").await?;
    
    // Run a simple query
    let result: i64 = sqlx::query_scalar("SELECT 1")
        .fetch_one(&pool)
        .await?;
    
    if result == 1 {
        info!("✅ In-memory database test successful");
        pool.close().await;
        Ok(())
    } else {
        anyhow::bail!("Unexpected query result: {}", result);
    }
}

/// Test basic SQLite connectivity
async fn test_sqlite_connection(db_path: &std::path::Path) -> Result<()> {
    info!("Testing SQLite connectivity...");

    // Create a simple test connection with create mode
    let test_conn_str = format!("sqlite://{}?mode=rwc", db_path.display());
    let pool = sqlx::SqlitePool::connect(&test_conn_str).await?;
    
    // Run a simple query
    let result: i64 = sqlx::query_scalar("SELECT 1")
        .fetch_one(&pool)
        .await?;
    
    if result == 1 {
        info!("✅ Basic SQLite query successful");
        pool.close().await;
        Ok(())
    } else {
        anyhow::bail!("Unexpected query result: {}", result);
    }
}

/// Initialize logging system
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

/// Log configuration information
fn log_configuration(config: &Settings, config_source: &str) {
    info!("🚀 Starting LLM Link proxy service");
    info!("🌐 Server will bind to {}:{}", config.server.host, config.server.port);
    info!("📋 Configuration loaded from: {}", config_source);

    // Log enabled APIs
    if let Some(ollama_config) = &config.apis.ollama {
        if ollama_config.enabled {
            info!("🦙 Ollama API enabled on path: {}", ollama_config.path);
            if ollama_config.api_key.is_some() {
                info!("🔐 Ollama API key authentication: ENABLED");
            } else {
                info!("🔓 Ollama API key authentication: DISABLED");
            }
        }
    }
}

/// Initialize LLM service
fn initialize_llm_service(config: &Settings) -> Result<service::Service> {
    info!("🔧 Initializing LLM service...");
    let llm_service = service::Service::new(&config.llm_backend)?;
    info!("✅ LLM service initialized successfully");
    Ok(llm_service)
}

/// Build single mode application and add middleware
fn build_single_mode_app(app_state: AppState, config: &Settings) -> Router {
    info!("🏗️ Building single-mode application routes...");

    build_single_mode_routes(app_state, config)
        .layer(
            TraceLayer::new_for_http()
                .make_span_with(|request: &Request<_>| {
                    info!("🌐 ======================================");
                    info!("🌐 Incoming request: {} {}", request.method(), request.uri());
                    info!("📋 Full URI: {}", request.uri());
                    info!("📋 Headers: {:?}", request.headers());
                    info!("📋 User-Agent: {:?}", request.headers().get("user-agent"));
                    info!("📋 Host: {:?}", request.headers().get("host"));
                    info!("📋 Accept: {:?}", request.headers().get("accept"));
                    info!("📋 Content-Type: {:?}", request.headers().get("content-type"));
                    info!("📋 Content-Length: {:?}", request.headers().get("content-length"));
                    info!("======================================");
                    tracing::info_span!(
                        "http_request",
                        method = %request.method(),
                        uri = %request.uri(),
                        version = ?request.version(),
                    )
                })
                .on_request(|_request: &Request<_>, _span: &Span| {
                    info!("🚀 Processing request...");
                })
                .on_response(|response: &Response<_>, latency: Duration, _span: &Span| {
                    info!("✅ Response: {} (took {:?})", response.status(), latency);
                })
                .on_failure(|error: ServerErrorsFailureClass, latency: Duration, _span: &Span| {
                    error!("❌ Request failed: {:?} (took {:?})", error, latency);
                })
        )
}

/// Start server
async fn start_server(app: Router, config: &Settings) -> Result<()> {
    let bind_addr = format!("{}:{}", config.server.host, config.server.port);
    info!("🔌 Binding to address: {}", bind_addr);
    let listener = tokio::net::TcpListener::bind(&bind_addr).await?;

    info!("🎉 LLM Link proxy is listening on {}", bind_addr);
    info!("📡 Ready to accept connections!");
    info!("👀 Monitoring for incoming requests...");

    axum::serve(listener, app).await?;
    Ok(())
}

fn build_single_mode_routes(state: AppState, config: &Settings) -> Router {
    // Create basic routes (no state required)
    let basic_routes = Router::new()
        .route("/", get(|| {
            info!("🏠 Root endpoint accessed");
            async { "LLM Link is running in single mode" }
        }))
        .route("/health", get(|| {
            info!("🏥 Health check endpoint accessed");
            async { health_check().await }
        }))
        .route("/debug", get(|| {
            info!("🐛 Debug endpoint accessed");
            async { api::debug_test().await }
        }));

    // Create routes that require state
    let stateful_routes = Router::new()
        .route("/api/health", get(get_health))
        .route("/api/info", get(info))
        .route("/api/config/current", get(get_current_config))
        .route("/api/config/update", post(update_config_for_restart))
        .route("/api/config/validate", post(validate_key))
        .route("/api/config/validate-key", post(validate_key_for_update))
        .route("/api/config/update-key", post(update_key))
        .route("/api/config/switch-provider", post(switch_provider))
        .route("/api/config/pid", get(get_pid))
        .route("/api/config/shutdown", post(shutdown))
        .with_state(state.clone());

    // Merge routes
    let mut app = basic_routes.merge(stateful_routes);

    // Add Ollama API endpoints
    if let Some(ollama_config) = &config.apis.ollama {
        if ollama_config.enabled {
            info!("Enabling Ollama API on path: {}", ollama_config.path);
            let ollama_routes = api::ollama::build_ollama_routes(state.clone(), ollama_config);
            app = app.merge(ollama_routes);
        }
    }

    // Add OpenAI-compatible API endpoints
    if let Some(openai_config) = &config.apis.openai {
        if openai_config.enabled {
            info!("Enabling OpenAI API on path: {}", openai_config.path);
            let openai_routes = Router::new()
                .route(&format!("{}/chat/completions", openai_config.path), post(api::openai::chat))
                .route(&format!("{}/models", openai_config.path), get(api::openai::models))
                .route(&format!("{}/models/:model", openai_config.path), get(api::openai::models))
                .with_state(state.clone());
            app = app.merge(openai_routes);
        }
    }

    // Add Anthropic API endpoints
    if let Some(anthropic_config) = &config.apis.anthropic {
        if anthropic_config.enabled {
            info!("🔮 Enabling Anthropic API on path: {}", anthropic_config.path);
            let anthropic_routes = Router::new()
                .route(&format!("{}/v1/messages", anthropic_config.path), post(api::anthropic::messages))
                .route(&format!("{}/v1/messages/count_tokens", anthropic_config.path), post(api::anthropic::count_tokens))
                .route(&format!("{}/v1/models", anthropic_config.path), get(api::anthropic::models))
                .with_state(state.clone());
            app = app.merge(anthropic_routes);
        }
    }

    // Add catch-all route for debugging
    app = app.fallback(|request: axum::extract::Request| async move {
        error!("🚫 ======================================");
        error!("🚫 UNMATCHED ROUTE ACCESSED!");
        error!("🚫 Method: {}", request.method());
        error!("🚫 URI: {}", request.uri());
        error!("🚫 Full URI: {}", request.uri());
        error!("🚫 Headers: {:?}", request.headers());
        error!("🚫 User-Agent: {:?}", request.headers().get("user-agent"));
        error!("🚫 Host: {:?}", request.headers().get("host"));
        error!("🚫 Accept: {:?}", request.headers().get("accept"));
        error!("🚫 Content-Type: {:?}", request.headers().get("content-type"));
        error!("🚫 Content-Length: {:?}", request.headers().get("content-length"));
        error!("🚫 ======================================");
        axum::http::StatusCode::NOT_FOUND
    });

    // Apply middleware at the end
    app.layer(
        ServiceBuilder::new()
            .layer(TraceLayer::new_for_http())
            .layer(CorsLayer::new().allow_origin(Any).allow_methods(Any).allow_headers(Any)),
    )
}
