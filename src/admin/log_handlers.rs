use axum::Json;
use serde::Deserialize;
use crate::db::{DatabasePool, RequestLog};
use super::ApiResponse;

#[derive(Debug, Deserialize)]
pub struct ListLogsQuery {
    #[serde(default = "default_logs_limit")]
    pub limit: i64,
    #[serde(default)]
    pub offset: i64,
    pub status: Option<String>,
}

fn default_logs_limit() -> i64 { 100 }

/// Get logs API
pub async fn get_logs_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
    axum::extract::Query(query): axum::extract::Query<ListLogsQuery>,
) -> Json<ApiResponse<Vec<RequestLog>>> {
    match db_pool.list_request_logs(query.limit, query.offset, query.status.as_deref()).await {
        Ok(logs) => Json(ApiResponse {
            success: true,
            data: Some(logs),
            message: "Logs retrieved".to_string(),
        }),
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            message: format!("Failed to retrieve logs: {}", e),
        }),
    }
}
