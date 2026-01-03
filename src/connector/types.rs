pub enum RequestResult {
    Success(axum::response::Response),
    Failure { error: String, latency_ms: i64 },
}
