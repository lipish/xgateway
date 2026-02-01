use axum::Json;
use serde::Deserialize;
use crate::db::{DatabasePool, RequestLog};
use crate::admin::auth_middleware::AdminUserContext;
use crate::db::operations::request_logs::{HourlyRequestCount, ProviderLatency, TodayStats, PerformanceStats, TopModelUsage, TokenUsageByOrg, TokenUsageByApiKey, TokenUsageByUser};
use super::ApiResponse;

#[derive(Debug, Deserialize)]
pub struct ListLogsQuery {
    #[serde(default = "default_logs_limit")]
    pub limit: i64,
    #[serde(default)]
    pub offset: i64,
    pub status: Option<String>,
    pub request_type: Option<String>,
    #[serde(default)]
    pub exclude_health_checks: bool,
}

#[derive(Debug, Deserialize)]
pub struct TokensQuery {
    #[serde(default = "default_tokens_hours")]
    pub hours: i64,
    #[serde(default = "default_tokens_top")]
    pub top: i64,
}

fn default_logs_limit() -> i64 { 100 }

fn default_top_models_limit() -> i64 { 10 }

fn default_top_models_hours() -> i64 { 24 }

fn default_tokens_hours() -> i64 { 24 }

fn default_tokens_top() -> i64 { 20 }

#[derive(Debug, Deserialize)]
pub struct TopModelsQuery {
    #[serde(default = "default_top_models_limit")]
    pub limit: i64,
    #[serde(default = "default_top_models_hours")]
    pub hours: i64,
}

/// Get logs API
pub async fn get_logs_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
    axum::extract::Query(query): axum::extract::Query<ListLogsQuery>,
) -> Json<ApiResponse<Vec<RequestLog>>> {
    match db_pool
        .list_request_logs(
            query.limit,
            query.offset,
            query.status.as_deref(),
            query.request_type.as_deref(),
            query.exclude_health_checks,
        )
        .await
    {
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

/// Get hourly request counts API
pub async fn get_hourly_requests_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
) -> Json<ApiResponse<Vec<HourlyRequestCount>>> {
    match db_pool.get_hourly_request_counts().await {
        Ok(counts) => Json(ApiResponse {
            success: true,
            data: Some(counts),
            message: "Hourly request counts retrieved".to_string(),
        }),
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            message: format!("Failed to retrieve hourly request counts: {}", e),
        }),
    }
}

/// Get provider latencies API
pub async fn get_provider_latencies_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
) -> Json<ApiResponse<Vec<ProviderLatency>>> {
    match db_pool.get_provider_latencies().await {
        Ok(latencies) => Json(ApiResponse {
            success: true,
            data: Some(latencies),
            message: "Provider latencies retrieved".to_string(),
        }),
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            message: format!("Failed to retrieve provider latencies: {}", e),
        }),
    }
}

/// Get today's stats API
pub async fn get_today_stats_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
) -> Json<ApiResponse<TodayStats>> {
    match db_pool.get_today_stats().await {
        Ok(stats) => Json(ApiResponse {
            success: true,
            data: Some(stats),
            message: "Today's stats retrieved".to_string(),
        }),
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            message: format!("Failed to retrieve today's stats: {}", e),
        }),
    }
}

/// Get performance stats API
pub async fn get_performance_stats_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
) -> Json<ApiResponse<PerformanceStats>> {
    match db_pool.get_performance_stats().await {
        Ok(stats) => Json(ApiResponse {
            success: true,
            data: Some(stats),
            message: "Performance stats retrieved".to_string(),
        }),
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            message: format!("Failed to retrieve performance stats: {}", e),
        }),
    }
}

pub async fn get_top_models_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
    axum::extract::Query(query): axum::extract::Query<TopModelsQuery>,
) -> Json<ApiResponse<Vec<TopModelUsage>>> {
    match db_pool.get_top_models(query.limit, query.hours).await {
        Ok(models) => Json(ApiResponse {
            success: true,
            data: Some(models),
            message: "Top models retrieved".to_string(),
        }),
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            message: format!("Failed to retrieve top models: {}", e),
        }),
    }
}

pub async fn get_token_usage_by_org_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
    axum::extract::Query(query): axum::extract::Query<TokensQuery>,
    axum::extract::Extension(ctx): axum::extract::Extension<AdminUserContext>,
) -> Json<ApiResponse<Vec<TokenUsageByOrg>>> {
    let org_filter = if ctx.is_admin { None } else { Some(ctx.org_id) };
    match db_pool
        .get_token_usage_by_org(query.hours, query.top, org_filter)
        .await
    {
        Ok(rows) => Json(ApiResponse {
            success: true,
            data: Some(rows),
            message: "Token usage by org retrieved".to_string(),
        }),
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            message: format!("Failed to retrieve token usage by org: {}", e),
        }),
    }
}

pub async fn get_token_usage_by_api_key_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
    axum::extract::Query(query): axum::extract::Query<TokensQuery>,
    axum::extract::Extension(ctx): axum::extract::Extension<AdminUserContext>,
) -> Json<ApiResponse<Vec<TokenUsageByApiKey>>> {
    let org_filter = if ctx.is_admin { None } else { Some(ctx.org_id) };
    match db_pool
        .get_token_usage_by_api_key(query.hours, query.top, org_filter)
        .await
    {
        Ok(rows) => Json(ApiResponse {
            success: true,
            data: Some(rows),
            message: "Token usage by API key retrieved".to_string(),
        }),
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            message: format!("Failed to retrieve token usage by API key: {}", e),
        }),
    }
}

pub async fn get_token_usage_by_user_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
    axum::extract::Query(query): axum::extract::Query<TokensQuery>,
    axum::extract::Extension(ctx): axum::extract::Extension<AdminUserContext>,
) -> Json<ApiResponse<Vec<TokenUsageByUser>>> {
    let org_filter = if ctx.is_admin { None } else { Some(ctx.org_id) };
    match db_pool
        .get_token_usage_by_user(query.hours, query.top, org_filter)
        .await
    {
        Ok(rows) => Json(ApiResponse {
            success: true,
            data: Some(rows),
            message: "Token usage by user retrieved".to_string(),
        }),
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            message: format!("Failed to retrieve token usage by user: {}", e),
        }),
    }
}
