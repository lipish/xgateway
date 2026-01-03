use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DriverType {
    OpenAI,
    OpenAICompatible,
    Anthropic,
    Aliyun,
    Volcengine,
    Tencent,
    Ollama,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AuthStrategy {
    None,
    ApiKey { api_key: String },
    AkSk { secret_id: String, secret_key: String },
}

pub enum RequestResult {
    Success(axum::response::Response),
    Failure { error: String, latency_ms: i64 },
}
