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
use pool::PoolManager;
use std::sync::Arc;

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

    // Initialize pool manager for load balancing and health checks
    let pool_manager = Arc::new(PoolManager::new(db_pool.clone()));
    if let Err(e) = pool_manager.init().await {
        warn!("⚠️ Failed to initialize pool manager: {}", e);
    }

    // Start background health check task
    let _health_check_handle = Arc::clone(&pool_manager).start_health_check();
    info!("🏥 Background health check started");

    // Build unified application with both Admin API and LLM Proxy
    let app = build_multi_mode_app(db_pool.clone(), Arc::clone(&pool_manager));

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

    // Shutdown pool manager on exit
    pool_manager.shutdown().await;

    Ok(())
}

/// Shared state for LLM proxy routes
#[derive(Clone)]
struct ProxyState {
    db_pool: DatabasePool,
    pool_manager: Arc<PoolManager>,
}

/// Build multi-mode application with Admin API and LLM Proxy routes
fn build_multi_mode_app(db_pool: DatabasePool, pool_manager: Arc<PoolManager>) -> Router {
    use tower_http::cors::{Any, CorsLayer};
    use tower_http::services::{ServeDir, ServeFile};

    // Admin API routes (/api/*)
    let admin_routes = create_admin_app(db_pool.clone());

    // LLM Proxy routes (/v1/*)
    let llm_proxy_routes = build_llm_proxy_routes(db_pool.clone(), pool_manager.clone());

    // Pool status route
    let pool_manager_for_status = pool_manager.clone();
    let pool_manager_for_metrics = pool_manager.clone();
    let db_pool_for_metrics = db_pool.clone();
    let pool_status_route = Router::new()
        .route("/api/pool/status", get(move || {
            let pm = pool_manager_for_status.clone();
            async move {
                let summary = pm.get_status_summary().await;
                axum::Json(summary)
            }
        }))
        .route("/api/pool/metrics", get(move || {
            let pm = pool_manager_for_metrics.clone();
            let db = db_pool_for_metrics.clone();
            async move {
                let metrics = pm.get_all_metrics().await;
                let providers = db.list_providers().await.unwrap_or_default();
                let health_statuses = pm.get_health_status().await;

                // Build detailed metrics with provider info
                let detailed: Vec<serde_json::Value> = providers.iter().map(|p| {
                    let m = metrics.get(&p.id).cloned().unwrap_or_default();
                    let health = health_statuses.get(&p.id).map(|s| format!("{:?}", s)).unwrap_or("Unknown".to_string());
                    let success_rate = if m.total_requests > 0 {
                        (m.successful_requests as f64 / m.total_requests as f64) * 100.0
                    } else {
                        100.0
                    };
                    serde_json::json!({
                        "provider_id": p.id,
                        "provider_name": p.name,
                        "enabled": p.enabled,
                        "health_status": health,
                        "total_requests": m.total_requests,
                        "successful_requests": m.successful_requests,
                        "failed_requests": m.failed_requests,
                        "success_rate": format!("{:.2}%", success_rate),
                        "avg_latency_ms": m.avg_latency_ms,
                        "p50_latency_ms": m.p50_latency_ms,
                        "p95_latency_ms": m.p95_latency_ms,
                        "p99_latency_ms": m.p99_latency_ms,
                        "active_connections": m.active_connections,
                        "tokens_used": m.tokens_used,
                        "requests_per_second": m.requests_per_second
                    })
                }).collect();

                axum::Json(serde_json::json!({
                    "providers": detailed,
                    "timestamp": chrono::Utc::now().to_rfc3339()
                }))
            }
        }))
        .route("/api/pool/metrics/:provider_id", get({
            let pm = pool_manager.clone();
            move |axum::extract::Path(provider_id): axum::extract::Path<i64>| {
                let pm = pm.clone();
                async move {
                    match pm.get_metrics(provider_id).await {
                        Some(m) => axum::Json(serde_json::json!({
                            "success": true,
                            "data": m
                        })),
                        None => axum::Json(serde_json::json!({
                            "success": false,
                            "error": "Provider not found"
                        }))
                    }
                }
            }
        }));

    // Basic routes (health check and API info)
    // Note: Root path "/" is handled by static file service for frontend
    let basic_routes = Router::new()
        .route("/health", get(|| async {
            axum::Json(serde_json::json!({
                "status": "healthy",
                "timestamp": chrono::Utc::now().to_rfc3339()
            }))
        }))
        .route("/api/info", get(|| async {
            axum::Json(serde_json::json!({
                "service": "LLM Link",
                "version": env!("CARGO_PKG_VERSION"),
                "mode": "multi-provider",
                "endpoints": {
                    "llm_api": "/v1/*",
                    "admin_api": "/api/*",
                    "pool_status": "/api/pool/status",
                    "pool_metrics": "/api/pool/metrics",
                    "health": "/health"
                }
            }))
        }));

    // Static file service for admin frontend
    // Serve files from admin/dist directory, fallback to index.html for SPA routing
    let static_dir = std::env::current_dir()
        .unwrap_or_default()
        .join("admin/dist");

    let serve_dir = ServeDir::new(&static_dir)
        .not_found_service(ServeFile::new(static_dir.join("index.html")));

    // Merge all routes
    // API routes take precedence, static files are fallback
    let app = basic_routes
        .merge(admin_routes)
        .merge(llm_proxy_routes)
        .merge(pool_status_route)
        .fallback_service(serve_dir)
        .layer(
            CorsLayer::new()
                .allow_origin(Any)
                .allow_methods(Any)
                .allow_headers(Any)
        );

    app
}

/// Build LLM proxy routes for multi-provider mode
fn build_llm_proxy_routes(db_pool: DatabasePool, pool_manager: Arc<PoolManager>) -> Router {
    let state = ProxyState { db_pool, pool_manager };

    Router::new()
        // OpenAI compatible endpoints
        .route("/v1/chat/completions", post(handle_chat_completions))
        .route("/v1/models", get(handle_list_models))
        .route("/v1/models/:model", get(handle_get_model))
        .with_state(state)
}

/// Result of a provider request attempt
enum RequestResult {
    Success(axum::response::Response),
    Failure { error: String, latency_ms: i64 },
}

/// Send request to a specific provider
async fn send_to_provider(
    provider: &db::Provider,
    req_body: &serde_json::Value,
    is_stream: bool,
    request_content: Option<String>,
    db_pool: &db::DatabasePool,
    pool_manager: &Arc<PoolManager>,
) -> RequestResult {
    use axum::http::StatusCode;
    use axum::response::IntoResponse;
    use crate::db::NewRequestLog;

    let start_time = std::time::Instant::now();
    let config: serde_json::Value = serde_json::from_str(&provider.config).unwrap_or_default();
    let api_key = config.get("api_key").and_then(|v| v.as_str()).unwrap_or("");
    let base_url = config.get("base_url").and_then(|v| v.as_str()).unwrap_or("");
    let model = config.get("model").and_then(|v| v.as_str()).unwrap_or("");

    // Record request start for metrics
    pool_manager.record_request_start(provider.id).await;

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(120))
        .build()
        .unwrap_or_else(|_| reqwest::Client::new());
    let url = format!("{}/chat/completions", base_url.trim_end_matches('/'));

    // Merge model into request
    let mut body = req_body.clone();
    if body.get("model").is_none() || body.get("model").unwrap().as_str() == Some("") {
        body["model"] = serde_json::json!(model);
    }

    match client
        .post(&url)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
    {
        Ok(response) => {
            let status = StatusCode::from_u16(response.status().as_u16()).unwrap_or(StatusCode::OK);
            let latency = start_time.elapsed();
            let latency_ms = latency.as_millis() as i64;
            let is_success = status.is_success();

            // Record metrics
            if is_success {
                pool_manager.record_success(provider.id, latency).await;
            } else {
                pool_manager.record_failure(provider.id, Some(&format!("HTTP {}", status.as_u16()))).await;
                return RequestResult::Failure {
                    error: format!("HTTP {}", status.as_u16()),
                    latency_ms,
                };
            }

            if is_stream {
                // Streaming response handling
                use futures::StreamExt;
                use std::pin::Pin;
                use std::task::{Context, Poll};
                use futures::Stream;

                let stream = response.bytes_stream();
                let collected_content = std::sync::Arc::new(std::sync::Mutex::new(String::new()));
                let content_clone = collected_content.clone();

                let collecting_stream = stream.map(move |chunk_result| {
                    if let Ok(ref chunk) = chunk_result {
                        if let Ok(text) = std::str::from_utf8(chunk) {
                            for line in text.lines() {
                                if line.starts_with("data: ") {
                                    let data = &line[6..];
                                    if data != "[DONE]" {
                                        if let Ok(json) = serde_json::from_str::<serde_json::Value>(data) {
                                            if let Some(content) = json.get("choices")
                                                .and_then(|c| c.as_array())
                                                .and_then(|arr| arr.first())
                                                .and_then(|c| c.get("delta"))
                                                .and_then(|d| d.get("content"))
                                                .and_then(|c| c.as_str())
                                            {
                                                if let Ok(mut collected) = content_clone.lock() {
                                                    collected.push_str(content);
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    chunk_result
                });

                struct LoggingStream<S> {
                    inner: S,
                    collected_content: std::sync::Arc<std::sync::Mutex<String>>,
                    db_pool: std::sync::Arc<db::DatabasePool>,
                    provider_id: i64,
                    provider_name: String,
                    model: String,
                    request_content: Option<String>,
                    latency_ms: i64,
                    logged: bool,
                }

                impl<S: Stream + Unpin> Stream for LoggingStream<S> {
                    type Item = S::Item;

                    fn poll_next(mut self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Option<Self::Item>> {
                        let result = Pin::new(&mut self.inner).poll_next(cx);
                        if let Poll::Ready(None) = &result {
                            if !self.logged {
                                self.logged = true;
                                let response_content = self.collected_content.lock()
                                    .map(|c| if c.is_empty() { None } else { Some(c.clone()) })
                                    .unwrap_or(None);

                                let log = NewRequestLog {
                                    provider_id: Some(self.provider_id),
                                    provider_name: self.provider_name.clone(),
                                    model: self.model.clone(),
                                    status: "success".to_string(),
                                    latency_ms: self.latency_ms,
                                    tokens_used: 0,
                                    error_message: None,
                                    request_type: "chat".to_string(),
                                    request_content: self.request_content.clone(),
                                    response_content,
                                };

                                let db_pool = self.db_pool.clone();
                                tokio::spawn(async move {
                                    let _ = db_pool.create_request_log(log).await;
                                });
                            }
                        }
                        result
                    }
                }

                let logging_stream = LoggingStream {
                    inner: Box::pin(collecting_stream),
                    collected_content,
                    db_pool: std::sync::Arc::new(db_pool.clone()),
                    provider_id: provider.id,
                    provider_name: provider.name.clone(),
                    model: model.to_string(),
                    request_content,
                    latency_ms,
                    logged: false,
                };

                let body = axum::body::Body::from_stream(logging_stream);

                RequestResult::Success(
                    axum::response::Response::builder()
                        .status(status)
                        .header("Content-Type", "text/event-stream")
                        .header("Cache-Control", "no-cache")
                        .header("Connection", "keep-alive")
                        .body(body)
                        .unwrap_or_else(|_| StatusCode::INTERNAL_SERVER_ERROR.into_response())
                )
            } else {
                // Non-streaming response
                match response.json::<serde_json::Value>().await {
                    Ok(resp_body) => {
                        let response_content = resp_body.get("choices")
                            .and_then(|c| c.as_array())
                            .and_then(|arr| arr.first())
                            .and_then(|c| c.get("message"))
                            .and_then(|m| m.get("content"))
                            .and_then(|c| c.as_str())
                            .map(|s| s.to_string());

                        let tokens_used = resp_body.get("usage")
                            .and_then(|u| u.get("total_tokens"))
                            .and_then(|t| t.as_i64())
                            .unwrap_or(0);

                        let log = NewRequestLog {
                            provider_id: Some(provider.id),
                            provider_name: provider.name.clone(),
                            model: model.to_string(),
                            status: "success".to_string(),
                            latency_ms,
                            tokens_used,
                            error_message: None,
                            request_type: "chat".to_string(),
                            request_content,
                            response_content,
                        };
                        let _ = db_pool.create_request_log(log).await;

                        RequestResult::Success((status, axum::Json(resp_body)).into_response())
                    }
                    Err(e) => RequestResult::Failure {
                        error: format!("Failed to parse response: {}", e),
                        latency_ms,
                    }
                }
            }
        }
        Err(e) => {
            let latency = start_time.elapsed();
            let latency_ms = latency.as_millis() as i64;
            pool_manager.record_failure(provider.id, Some(&e.to_string())).await;

            RequestResult::Failure {
                error: e.to_string(),
                latency_ms,
            }
        }
    }
}

/// Handle chat completions request - routes to appropriate provider with load balancing and failover
async fn handle_chat_completions(
    axum::extract::State(state): axum::extract::State<ProxyState>,
    axum::Json(request): axum::Json<serde_json::Value>,
) -> axum::response::Response {
    use axum::http::StatusCode;
    use axum::response::IntoResponse;
    use crate::db::NewRequestLog;
    use crate::pool::RateLimitResult;

    let db_pool = &state.db_pool;
    let pool_manager = &state.pool_manager;

    // Check global rate limit
    if let RateLimitResult::Denied { retry_after } = pool_manager.check_rate_limit(None).await {
        return (
            StatusCode::TOO_MANY_REQUESTS,
            [("Retry-After", retry_after.as_secs().to_string())],
            axum::Json(serde_json::json!({
                "error": {
                    "message": format!("Rate limit exceeded. Retry after {} seconds.", retry_after.as_secs()),
                    "type": "rate_limit_exceeded",
                    "retry_after_seconds": retry_after.as_secs()
                }
            }))
        ).into_response();
    }

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

    // Prepare request body (remove provider_id field)
    let mut req_body = request.clone();
    if let Some(obj) = req_body.as_object_mut() {
        obj.remove("provider_id");
    }

    // Extract request content for logging
    let request_content = req_body.get("messages")
        .and_then(|m| m.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|m| {
                    let role = m.get("role").and_then(|r| r.as_str()).unwrap_or("unknown");
                    let content = m.get("content").and_then(|c| c.as_str()).unwrap_or("");
                    if content.is_empty() {
                        None
                    } else {
                        Some(format!("[{}]: {}", role, content))
                    }
                })
                .collect::<Vec<_>>()
                .join("\n\n")
        })
        .filter(|s| !s.is_empty());

    // If specific provider requested, use only that one (no failover)
    if let Some(provider_id) = requested_provider_id {
        match providers.iter().find(|p| p.id == provider_id) {
            Some(provider) => {
                match send_to_provider(provider, &req_body, is_stream, request_content.clone(), db_pool, pool_manager).await {
                    RequestResult::Success(response) => return response,
                    RequestResult::Failure { error, latency_ms } => {
                        let log = NewRequestLog {
                            provider_id: Some(provider.id),
                            provider_name: provider.name.clone(),
                            model: "".to_string(),
                            status: "error".to_string(),
                            latency_ms,
                            tokens_used: 0,
                            error_message: Some(error.clone()),
                            request_type: "chat".to_string(),
                            request_content,
                            response_content: None,
                        };
                        let _ = db_pool.create_request_log(log).await;

                        return (
                            StatusCode::BAD_GATEWAY,
                            axum::Json(serde_json::json!({
                                "error": {
                                    "message": format!("Provider request failed: {}", error),
                                    "type": "proxy_error",
                                    "provider": provider.name
                                }
                            }))
                        ).into_response();
                    }
                }
            }
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
    }

    // Load balancing with failover
    let max_attempts = 3;
    let mut attempted_providers: Vec<i64> = Vec::new();
    let mut last_error = String::new();

    for attempt in 0..max_attempts {
        // Select provider (excluding already attempted ones)
        let provider_id = if attempt == 0 {
            pool_manager.select_provider().await
        } else {
            // For failover, select from remaining providers
            let available: Vec<i64> = providers.iter()
                .filter(|p| p.enabled && !attempted_providers.contains(&p.id))
                .map(|p| p.id)
                .collect();
            if available.is_empty() {
                break;
            }
            pool_manager.select_fallback(*attempted_providers.last().unwrap_or(&0)).await
                .or_else(|| available.first().copied())
        };

        let provider = match provider_id {
            Some(id) => {
                match providers.iter().find(|p| p.id == id && !attempted_providers.contains(&p.id)) {
                    Some(p) => p.clone(),
                    None => {
                        // Try to find any enabled provider not yet attempted
                        match providers.iter().find(|p| p.enabled && !attempted_providers.contains(&p.id)) {
                            Some(p) => p.clone(),
                            None => break,
                        }
                    }
                }
            }
            None => {
                // No provider from pool, try first enabled not attempted
                match providers.iter().find(|p| p.enabled && !attempted_providers.contains(&p.id)) {
                    Some(p) => p.clone(),
                    None => break,
                }
            }
        };

        attempted_providers.push(provider.id);
        tracing::info!("Attempt {} with provider {} (id={})", attempt + 1, provider.name, provider.id);

        match send_to_provider(&provider, &req_body, is_stream, request_content.clone(), db_pool, pool_manager).await {
            RequestResult::Success(response) => {
                if attempt > 0 {
                    tracing::info!("Failover successful on attempt {} with provider {}", attempt + 1, provider.name);
                }
                return response;
            }
            RequestResult::Failure { error, latency_ms: _ } => {
                last_error = error;
                tracing::warn!("Provider {} failed: {}, attempting failover...", provider.name, last_error);
            }
        }
    }

    // All attempts failed
    let log = NewRequestLog {
        provider_id: None,
        provider_name: "all_providers".to_string(),
        model: "".to_string(),
        status: "error".to_string(),
        latency_ms: 0,
        tokens_used: 0,
        error_message: Some(format!("All {} providers failed. Last error: {}", attempted_providers.len(), last_error)),
        request_type: "chat".to_string(),
        request_content,
        response_content: None,
    };
    let _ = db_pool.create_request_log(log).await;

    (
        StatusCode::BAD_GATEWAY,
        axum::Json(serde_json::json!({
            "error": {
                "message": format!("All providers failed after {} attempts. Last error: {}", attempted_providers.len(), last_error),
                "type": "all_providers_failed",
                "attempted_count": attempted_providers.len()
            }
        }))
    ).into_response()
}

/// Handle list models request
async fn handle_list_models(
    axum::extract::State(state): axum::extract::State<ProxyState>,
) -> impl axum::response::IntoResponse {
    let providers = state.db_pool.list_providers().await.unwrap_or_default();
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
