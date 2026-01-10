use sqlx::Row;
use anyhow::Result;
use serde::{Deserialize, Serialize};
use crate::db::{DatabasePool, RequestLog, NewRequestLog};

#[derive(Debug, Serialize, Deserialize)]
pub struct HourlyRequestCount {
    pub hour: String,
    pub requests: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProviderLatency {
    pub provider_name: String,
    pub avg_latency_ms: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TodayStats {
    pub total_requests: i64,
    pub avg_latency_ms: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PerformanceStats {
    pub success_rate: f64,
    pub requests_today: i64,
    pub tokens_used: i64,
    pub failed_requests: i64,
    pub avg_response_time: f64,
    pub qps: f64,
}

impl DatabasePool {
    // Request Log operations
    
    pub async fn create_request_log(&self, log: NewRequestLog) -> Result<RequestLog> {
        match self {
            Self::Postgres(pool) => {
                let row = sqlx::query(
                    r#"
                    INSERT INTO request_logs (provider_id, provider_name, model, status, latency_ms, tokens_used, error_message, request_type, request_content, response_content)
                       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                       RETURNING id::BIGINT as id, provider_id::BIGINT as provider_id, provider_name, model, status,
                                 latency_ms::BIGINT as latency_ms, tokens_used::BIGINT as tokens_used,
                                 error_message, request_type, request_content, response_content, created_at"#
                )
                .bind(log.provider_id).bind(&log.provider_name).bind(&log.model).bind(&log.status)
                .bind(log.latency_ms).bind(log.tokens_used).bind(&log.error_message).bind(&log.request_type)
                .bind(&log.request_content).bind(&log.response_content)
                .fetch_one(pool).await?;
                Ok(RequestLog {
                    id: row.get("id"),
                    provider_id: row.get("provider_id"),
                    provider_name: row.get("provider_name"),
                    model: row.get("model"),
                    status: row.get("status"),
                    latency_ms: row.get("latency_ms"),
                    tokens_used: row.get("tokens_used"),
                    error_message: row.get("error_message"),
                    request_type: row.get("request_type"),
                    request_content: row.get("request_content"),
                    response_content: row.get("response_content"),
                    created_at: row.get("created_at"),
                })
            }
        }
    }

    pub async fn list_request_logs(&self, limit: i64, offset: i64, status_filter: Option<&str>) -> Result<Vec<RequestLog>> {
        match self {
            Self::Postgres(pool) => {
                if let Some(status) = status_filter {
                    Ok(sqlx::query_as::<_, RequestLog>(
                        r#"SELECT id::BIGINT as id, provider_id::BIGINT as provider_id, provider_name, model, status,
                           latency_ms::BIGINT as latency_ms, tokens_used::BIGINT as tokens_used,
                           error_message, request_type, request_content, response_content, created_at
                           FROM request_logs WHERE status = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"#
                    ).bind(status).bind(limit).bind(offset).fetch_all(pool).await?)
                } else {
                    Ok(sqlx::query_as::<_, RequestLog>(
                        r#"SELECT id::BIGINT as id, provider_id::BIGINT as provider_id, provider_name, model, status,
                           latency_ms::BIGINT as latency_ms, tokens_used::BIGINT as tokens_used,
                           error_message, request_type, request_content, response_content, created_at
                           FROM request_logs ORDER BY created_at DESC LIMIT $1 OFFSET $2"#
                    ).bind(limit).bind(offset).fetch_all(pool).await?)
                }
            }
        }
    }

    #[allow(dead_code)]
    pub async fn get_request_log(&self, id: i64) -> Result<Option<RequestLog>> {
        match self {
            Self::Postgres(pool) => {
                Ok(sqlx::query_as::<_, RequestLog>(
                    r#"SELECT id::BIGINT as id, provider_id::BIGINT as provider_id, provider_name, model, status,
                       latency_ms::BIGINT as latency_ms, tokens_used::BIGINT as tokens_used,
                       error_message, request_type, request_content, response_content, created_at
                       FROM request_logs WHERE id = $1"#
                ).bind(id).fetch_optional(pool).await?)
            }
        }
    }

    /// Get hourly request counts for the last 24 hours
    pub async fn get_hourly_request_counts(&self) -> Result<Vec<HourlyRequestCount>> {
        match self {
            Self::Postgres(pool) => {
                let rows = sqlx::query(
                    r#"
                    SELECT 
                        TO_CHAR(created_at, 'HH24:00') as hour,
                        COUNT(*) as requests
                    FROM request_logs 
                    WHERE created_at >= NOW() - INTERVAL '24 hours'
                    GROUP BY TO_CHAR(created_at, 'HH24:00')
                    ORDER BY hour
                    "#
                ).fetch_all(pool).await?;

                let mut counts = Vec::new();
                for row in rows {
                    counts.push(HourlyRequestCount {
                        hour: row.get("hour"),
                        requests: row.get("requests"),
                    });
                }
                Ok(counts)
            }
        }
    }

    /// Get average latency by provider
    /// Note: This only shows providers with successful requests in the last 24 hours
    /// Providers without requests won't appear in the latency distribution
    pub async fn get_provider_latencies(&self) -> Result<Vec<ProviderLatency>> {
        match self {
            Self::Postgres(pool) => {
                let rows = sqlx::query(
                    r#"
                    SELECT 
                        provider_name,
                        AVG(latency_ms) as avg_latency_ms
                    FROM request_logs 
                    WHERE status = 'success' AND created_at >= NOW() - INTERVAL '24 hours'
                    GROUP BY provider_name
                    ORDER BY avg_latency_ms DESC
                    LIMIT 10
                    "#
                ).fetch_all(pool).await?;

                let mut latencies = Vec::new();
                for row in rows {
                    latencies.push(ProviderLatency {
                        provider_name: row.get("provider_name"),
                        avg_latency_ms: row.get("avg_latency_ms"),
                    });
                }
                Ok(latencies)
            }
        }
    }

    /// Get today's total requests and average latency (last 24 hours)
    pub async fn get_today_stats(&self) -> Result<TodayStats> {
        match self {
            Self::Postgres(pool) => {
                let row = sqlx::query(
                    r#"
                    SELECT 
                        COUNT(*) as total_requests,
                        AVG(CASE WHEN status = 'success' THEN latency_ms END) as avg_latency_ms
                    FROM request_logs 
                    WHERE created_at >= NOW() - INTERVAL '24 hours'
                    "#
                ).fetch_one(pool).await?;

                Ok(TodayStats {
                    total_requests: row.get("total_requests"),
                    avg_latency_ms: row.get::<Option<f64>, _>("avg_latency_ms").unwrap_or(0.0),
                })
            }
        }
    }

    /// Get performance stats for the last 24 hours
    pub async fn get_performance_stats(&self) -> Result<PerformanceStats> {
        match self {
            Self::Postgres(pool) => {
                let row = sqlx::query(
                    r#"
                    SELECT 
                        COUNT(*) as total_requests,
                        COALESCE(SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END), 0)::BIGINT as successful_requests,
                        COALESCE(SUM(CASE WHEN status != 'success' THEN 1 ELSE 0 END), 0)::BIGINT as failed_requests,
                        COALESCE(SUM(CASE WHEN status = 'success' THEN tokens_used ELSE 0 END), 0)::BIGINT as tokens_used,
                        COALESCE(AVG(CASE WHEN status = 'success' THEN latency_ms ELSE NULL END), 0)::DOUBLE PRECISION as avg_response_time,
                        CASE 
                            WHEN COUNT(*) > 0 THEN ((SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END))::DOUBLE PRECISION * 100.0 / (COUNT(*))::DOUBLE PRECISION)
                            ELSE 0.0::DOUBLE PRECISION
                        END as success_rate,
                        CASE 
                            WHEN COUNT(*) > 0 AND EXTRACT(EPOCH FROM (NOW() - MIN(created_at))) > 0 
                            THEN (COUNT(*))::DOUBLE PRECISION / EXTRACT(EPOCH FROM (NOW() - MIN(created_at)))
                            ELSE 0.0::DOUBLE PRECISION
                        END as qps
                    FROM request_logs 
                    WHERE created_at >= NOW() - INTERVAL '24 hours'
                    "#
                ).fetch_one(pool).await?;

                Ok(PerformanceStats {
                    success_rate: row.get("success_rate"),
                    requests_today: row.get("total_requests"),
                    tokens_used: row.get::<i64, _>("tokens_used"),
                    failed_requests: row.get::<i64, _>("failed_requests"),
                    avg_response_time: row.get::<f64, _>("avg_response_time"),
                    qps: row.get::<f64, _>("qps"),
                })
            }
        }
    }
}