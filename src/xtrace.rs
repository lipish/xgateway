use std::sync::Arc;
use std::time::{Duration, Instant};

use chrono::{DateTime, Utc};
use reqwest::header::HeaderValue;
use base64::Engine;
use serde_json::Value as JsonValue;
use tokio::sync::mpsc;
use uuid::Uuid;
use xtrace_client::{BatchIngestRequest, Client as XTraceSdkClient, ObservationIngest, TraceIngest};

const DEFAULT_TRACE_NAME: &str = "xgateway.chat";
const DEFAULT_QUEUE_SIZE: usize = 10_000;
const DEFAULT_REQUEST_TIMEOUT_MS: u64 = 2_000;
const DEFAULT_MAX_RETRIES: usize = 3;

#[derive(Clone)]
pub struct XTraceClient {
    config: Arc<XTraceConfig>,
    sender: mpsc::Sender<BatchIngestRequest>,
}

#[derive(Clone)]
struct XTraceConfig {
    project_id: Option<String>,
    environment: Option<String>,
    trace_name: String,
    backend: XTraceBackend,
}

#[derive(Clone)]
enum XTraceBackend {
    Sdk(Arc<XTraceSdkClient>),
    Http {
        client: reqwest::Client,
        base_url: String,
        auth_header: HeaderValue,
    },
}

#[derive(Clone)]
pub struct XTraceRequestContext {
    pub client: Arc<XTraceClient>,
    pub trace_id: Uuid,
    pub start_time: Instant,
    pub start_timestamp: DateTime<Utc>,
    pub request_payload: JsonValue,
    pub messages: Option<JsonValue>,
    pub requested_model: Option<String>,
    pub api_key_id: Option<i64>,
    pub project_id: Option<i64>,
    pub org_id: Option<i64>,
    pub is_stream: bool,
    pub trace_name: String,
}

#[derive(Debug, Clone)]
pub struct UsageTokens {
    pub input: Option<i64>,
    pub output: Option<i64>,
    pub total: Option<i64>,
}

impl XTraceRequestContext {
    pub fn new(
        client: Arc<XTraceClient>,
        request_payload: JsonValue,
        requested_model: Option<String>,
        api_key_id: Option<i64>,
        project_id: Option<i64>,
        org_id: Option<i64>,
        is_stream: bool,
        start_time: Instant,
        start_timestamp: DateTime<Utc>,
    ) -> Self {
        let messages = request_payload.get("messages").cloned();
        let trace_name = client.config.trace_name.clone();
        Self {
            client,
            trace_id: Uuid::new_v4(),
            start_time,
            start_timestamp,
            request_payload,
            messages,
            requested_model,
            api_key_id,
            project_id,
            org_id,
            is_stream,
            trace_name,
        }
    }
}

impl XTraceClient {
    pub fn from_env() -> Option<Arc<Self>> {
        let enabled = env_bool("XTRACE_ENABLED");
        if !enabled {
            return None;
        }

        let base_url = env_var("XTRACE_BASE_URL")
            .or_else(|| env_var("XTRACE_HOST"));
        let Some(base_url) = base_url else {
            tracing::warn!("XTrace enabled but XTRACE_BASE_URL is missing");
            return None;
        };

        let auth_mode = env_var("XTRACE_AUTH_MODE").unwrap_or_else(|| "bearer".to_string());
        let backend = match auth_mode.to_lowercase().as_str() {
            "bearer" => build_sdk_backend(&base_url),
            "basic" => build_basic_backend(&base_url),
            other => {
                tracing::warn!("Unsupported XTRACE_AUTH_MODE '{}'", other);
                None
            }
        };
        let Some(backend) = backend else {
            tracing::warn!("XTrace enabled but auth credentials are missing");
            return None;
        };

        let trace_name = env_var("XTRACE_TRACE_NAME").unwrap_or_else(|| DEFAULT_TRACE_NAME.to_string());
        let project_id = env_var("XTRACE_PROJECT_ID");
        let environment = env_var("XTRACE_ENVIRONMENT");

        let (sender, receiver) = mpsc::channel(DEFAULT_QUEUE_SIZE);
        let config = Arc::new(XTraceConfig {
            project_id,
            environment,
            trace_name,
            backend,
        });

        let worker_config = config.clone();
        tokio::spawn(async move {
            ingest_worker(worker_config, receiver).await;
        });

        Some(Arc::new(Self { config, sender }))
    }

    pub fn enqueue(&self, payload: BatchIngestRequest) {
        if let Err(err) = self.sender.try_send(payload) {
            match err {
                mpsc::error::TrySendError::Full(_) => {
                    tracing::warn!("XTrace queue full, dropping payload");
                }
                mpsc::error::TrySendError::Closed(_) => {
                    tracing::warn!("XTrace queue closed, dropping payload");
                }
            }
        }
    }

    pub fn report_generation(
        &self,
        ctx: &XTraceRequestContext,
        provider_id: i64,
        provider_name: &str,
        model: &str,
        output: Option<JsonValue>,
        usage: Option<UsageTokens>,
        error: Option<String>,
        completion_start: Option<Instant>,
        end_time: Instant,
    ) {
        let elapsed = end_time.duration_since(ctx.start_time);
        let latency = elapsed.as_secs_f64();
        let end_timestamp = ctx.start_timestamp
            + chrono::Duration::milliseconds(elapsed.as_millis() as i64);

        let (completion_start_time, time_to_first_token) = completion_start
            .map(|instant| {
                let ttft = instant.duration_since(ctx.start_time).as_secs_f64();
                let timestamp = ctx.start_timestamp
                    + chrono::Duration::milliseconds((ttft * 1000.0) as i64);
                (timestamp, ttft)
            })
            .unzip();

        let usage_json = usage.as_ref().map(build_usage_json);
        let input_json = ctx.messages.clone().or_else(|| Some(ctx.request_payload.clone()));

    let metadata = build_metadata(ctx, provider_id, provider_name, model, error.as_deref());

        let trace_output = output.clone().or_else(|| {
            error.as_ref().map(|msg| serde_json::json!({ "error": msg }))
        });

        let trace = TraceIngest {
            id: ctx.trace_id,
            timestamp: Some(ctx.start_timestamp),
            name: Some(ctx.trace_name.clone()),
            input: Some(ctx.request_payload.clone()),
            output: trace_output,
            session_id: None,
            release: None,
            version: None,
            user_id: None,
            metadata: Some(metadata.clone()),
            tags: vec!["xgateway".to_string(), provider_name.to_string()],
            public: None,
            environment: self.config.environment.clone(),
            external_id: None,
            bookmarked: None,
            latency: Some(latency),
            total_cost: None,
            project_id: self.config.project_id.clone(),
        };

        let observation = ObservationIngest {
            id: Uuid::new_v4(),
            trace_id: ctx.trace_id,
            r#type: Some("GENERATION".to_string()),
            name: Some("chat".to_string()),
            start_time: Some(ctx.start_timestamp),
            end_time: Some(end_timestamp),
            completion_start_time,
            model: Some(model.to_string()),
            model_parameters: None,
            input: input_json,
            output,
            usage: usage_json.clone(),
            level: error.as_ref().map(|_| "ERROR".to_string()),
            status_message: error.clone(),
            parent_observation_id: None,
            prompt_id: None,
            prompt_name: None,
            prompt_version: None,
            model_id: None,
            input_price: None,
            output_price: None,
            total_price: None,
            calculated_input_cost: None,
            calculated_output_cost: None,
            calculated_total_cost: None,
            latency: Some(latency),
            time_to_first_token,
            completion_tokens: usage.as_ref().and_then(|u| u.output),
            prompt_tokens: usage.as_ref().and_then(|u| u.input),
            total_tokens: usage.as_ref().and_then(|u| u.total),
            unit: usage.as_ref().map(|_| "TOKENS".to_string()),
            metadata: Some(metadata),
            environment: self.config.environment.clone(),
            project_id: self.config.project_id.clone(),
        };

        self.enqueue(BatchIngestRequest {
            trace: Some(trace),
            observations: vec![observation],
        });
    }
}

fn env_var(key: &str) -> Option<String> {
    std::env::var(key)
        .ok()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
}

fn env_bool(key: &str) -> bool {
    env_var(key)
        .map(|v| matches!(v.to_lowercase().as_str(), "1" | "true" | "yes" | "on"))
        .unwrap_or(false)
}

fn normalize_base_url(mut value: String) -> String {
    while value.ends_with('/') {
        value.pop();
    }
    value
}

fn build_sdk_backend(base_url: &str) -> Option<XTraceBackend> {
    let token = env_var("XTRACE_API_BEARER_TOKEN")
        .or_else(|| env_var("XTRACE_API_KEY"))?;
    match XTraceSdkClient::new(base_url, &token) {
        Ok(client) => Some(XTraceBackend::Sdk(Arc::new(client))),
        Err(err) => {
            tracing::warn!("Failed to initialize xtrace-client: {}", err);
            None
        }
    }
}

fn build_basic_backend(base_url: &str) -> Option<XTraceBackend> {
    let auth_header = build_basic_auth_header()?;
    let client = match reqwest::Client::builder()
        .timeout(Duration::from_millis(DEFAULT_REQUEST_TIMEOUT_MS))
        .build()
    {
        Ok(client) => client,
        Err(err) => {
            tracing::warn!("Failed to initialize XTrace HTTP client: {}", err);
            return None;
        }
    };
    Some(XTraceBackend::Http {
        client,
        base_url: normalize_base_url(base_url.to_string()),
        auth_header,
    })
}

fn build_basic_auth_header() -> Option<HeaderValue> {
    let public_key = env_var("LANGFUSE_PUBLIC_KEY")?;
    let secret_key = env_var("LANGFUSE_SECRET_KEY")?;
    let credential = format!("{}:{}", public_key, secret_key);
    let encoded = base64::engine::general_purpose::STANDARD.encode(credential.as_bytes());
    HeaderValue::from_str(&format!("Basic {}", encoded)).ok()
}

fn build_metadata(
    ctx: &XTraceRequestContext,
    provider_id: i64,
    provider_name: &str,
    model: &str,
    error: Option<&str>,
) -> JsonValue {
    let mut map = serde_json::Map::new();
    map.insert("stream".to_string(), JsonValue::Bool(ctx.is_stream));
    map.insert("provider_id".to_string(), JsonValue::Number(provider_id.into()));
    map.insert("provider_name".to_string(), JsonValue::String(provider_name.to_string()));
    map.insert("provider_model".to_string(), JsonValue::String(model.to_string()));

    if let Some(requested_model) = &ctx.requested_model {
        map.insert("requested_model".to_string(), JsonValue::String(requested_model.clone()));
    }
    if let Some(api_key_id) = ctx.api_key_id {
        map.insert("api_key_id".to_string(), JsonValue::Number(api_key_id.into()));
    }
    if let Some(project_id) = ctx.project_id {
        map.insert("project_id".to_string(), JsonValue::Number(project_id.into()));
    }
    if let Some(org_id) = ctx.org_id {
        map.insert("org_id".to_string(), JsonValue::Number(org_id.into()));
    }
    if let Some(error) = error {
        map.insert("error".to_string(), JsonValue::String(error.to_string()));
    }

    JsonValue::Object(map)
}

pub fn usage_from_response(response: &JsonValue) -> Option<UsageTokens> {
    let usage = response.get("usage")?;
    usage_from_value(usage)
}

pub fn usage_from_value(usage: &JsonValue) -> Option<UsageTokens> {
    let usage_obj = usage.as_object()?;
    let input = usage_obj
        .get("prompt_tokens")
        .or_else(|| usage_obj.get("input"))
        .or_else(|| usage_obj.get("input_tokens"))
        .and_then(|v| v.as_i64());
    let output = usage_obj
        .get("completion_tokens")
        .or_else(|| usage_obj.get("output"))
        .or_else(|| usage_obj.get("output_tokens"))
        .and_then(|v| v.as_i64());
    let total = usage_obj
        .get("total_tokens")
        .or_else(|| usage_obj.get("total"))
        .and_then(|v| v.as_i64());

    if input.is_none() && output.is_none() && total.is_none() {
        None
    } else {
        Some(UsageTokens { input, output, total })
    }
}

fn build_usage_json(usage: &UsageTokens) -> JsonValue {
    serde_json::json!({
        "input": usage.input,
        "output": usage.output,
        "total": usage.total,
        "unit": "TOKENS"
    })
}

async fn ingest_worker(config: Arc<XTraceConfig>, mut receiver: mpsc::Receiver<BatchIngestRequest>) {
    while let Some(payload) = receiver.recv().await {
        if let Err(err) = send_with_retry(&config, payload).await {
            tracing::warn!("Failed to send XTrace payload: {}", err);
        }
    }
}

async fn send_with_retry(config: &XTraceConfig, payload: BatchIngestRequest) -> Result<(), String> {
    let mut attempt = 0;

    loop {
        let result = match &config.backend {
            XTraceBackend::Sdk(client) => {
                client.ingest_batch(&payload).await.map(|_| ()).map_err(|err| {
                    let status = match &err {
                        xtrace_client::Error::Http(http_err) => http_err.status(),
                        _ => None,
                    };
                    let status = status.and_then(|s| reqwest::StatusCode::from_u16(s.as_u16()).ok());
                    (format!("{}", err), status)
                })
            }
            XTraceBackend::Http { client, base_url, auth_header } => {
                let url = format!("{}/v1/l/batch", base_url);
                match client
                    .post(&url)
                    .header(reqwest::header::AUTHORIZATION, auth_header.clone())
                    .json(&payload)
                    .send()
                    .await
                {
                    Ok(resp) => {
                        let status = resp.status();
                        if status.is_success() {
                            Ok(())
                        } else {
                            Err((format!("status {}", status), Some(status)))
                        }
                    }
                    Err(err) => Err((format!("{}", err), err.status())),
                }
            }
        };

        match result {
            Ok(()) => return Ok(()),
            Err((message, status)) => {
                attempt += 1;
                if attempt > DEFAULT_MAX_RETRIES || !should_retry(status) {
                    return Err(message);
                }
            }
        }

        let backoff_ms = 100u64.saturating_mul(2u64.saturating_pow((attempt - 1) as u32));
        tokio::time::sleep(Duration::from_millis(backoff_ms)).await;
    }
}

fn should_retry(status: Option<reqwest::StatusCode>) -> bool {
    matches!(status, Some(code) if code == reqwest::StatusCode::TOO_MANY_REQUESTS || code.is_server_error())
}
