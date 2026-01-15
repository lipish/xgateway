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

#[derive(Debug, Serialize, Deserialize)]
pub struct TopModelUsage {
    pub model: String,
    pub requests: i64,
    pub tokens: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TokenUsageByOrg {
    pub org_id: i64,
    pub requests: i64,
    pub tokens: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TokenUsageByService {
    pub service_id: String,
    pub requests: i64,
    pub tokens: i64,
}

impl DatabasePool {
    // Request Log operations
    
    pub async fn create_request_log(&self, log: NewRequestLog) -> Result<RequestLog> {
        match self {
            Self::Postgres(pool) => {
                let row = sqlx::query(
                    r#"
                    INSERT INTO request_logs (service_id, api_key_id, project_id, org_id, provider_id, provider_name, model, status, latency_ms, tokens_used, error_message, request_type, request_content, response_content)
                       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                       RETURNING id::BIGINT as id, service_id,
                                 api_key_id::BIGINT as api_key_id, project_id::BIGINT as project_id, org_id::BIGINT as org_id,
                                 provider_id::BIGINT as provider_id, provider_name, model, status,
                                 latency_ms::BIGINT as latency_ms, tokens_used::BIGINT as tokens_used,
                                 error_message, request_type, request_content, response_content, created_at"#
                )
                .bind(&log.service_id)
                .bind(log.api_key_id)
                .bind(log.project_id)
                .bind(log.org_id)
                .bind(log.provider_id)
                .bind(&log.provider_name)
                .bind(&log.model)
                .bind(&log.status)
                .bind(log.latency_ms)
                .bind(log.tokens_used)
                .bind(&log.error_message)
                .bind(&log.request_type)
                .bind(&log.request_content)
                .bind(&log.response_content)
                .fetch_one(pool).await?;
                Ok(RequestLog {
                    id: row.try_get("id")?,
                    service_id: row.try_get("service_id")?,
                    api_key_id: row.try_get("api_key_id")?,
                    project_id: row.try_get("project_id")?,
                    org_id: row.try_get("org_id")?,
                    provider_id: row.try_get("provider_id")?,
                    provider_name: row.try_get("provider_name")?,
                    model: row.try_get("model")?,
                    status: row.try_get("status")?,
                    latency_ms: row.try_get("latency_ms")?,
                    tokens_used: row.try_get("tokens_used")?,
                    error_message: row.try_get("error_message")?,
                    request_type: row.try_get("request_type")?,
                    request_content: row.try_get("request_content")?,
                    response_content: row.try_get("response_content")?,
                    created_at: row.try_get("created_at")?,
                })
            }
        }
    }

    pub async fn list_request_logs(
        &self,
        limit: i64,
        offset: i64,
        status_filter: Option<&str>,
        request_type_filter: Option<&str>,
        exclude_health_checks: bool,
    ) -> Result<Vec<RequestLog>> {
        match self {
            Self::Postgres(pool) => {
                let mut qb = sqlx::QueryBuilder::new(
                    r#"SELECT id::BIGINT as id, service_id,
                       api_key_id::BIGINT as api_key_id, project_id::BIGINT as project_id, org_id::BIGINT as org_id,
                       provider_id::BIGINT as provider_id, provider_name, model, status,
                       latency_ms::BIGINT as latency_ms, tokens_used::BIGINT as tokens_used,
                       error_message, request_type, request_content, response_content, created_at
                       FROM request_logs"#,
                );

                let mut has_where = false;
                if let Some(status) = status_filter {
                    qb.push(" WHERE status = ").push_bind(status);
                    has_where = true;
                }
                if let Some(request_type) = request_type_filter {
                    if has_where {
                        qb.push(" AND ");
                    } else {
                        qb.push(" WHERE ");
                        has_where = true;
                    }
                    qb.push(" request_type = ").push_bind(request_type);
                }
                if exclude_health_checks {
                    if has_where {
                        qb.push(" AND ");
                    } else {
                        qb.push(" WHERE ");
                    }
                    qb.push(" request_type <> 'health_check'");
                }

                qb.push(" ORDER BY created_at DESC ");
                qb.push(" LIMIT ").push_bind(limit);
                qb.push(" OFFSET ").push_bind(offset);

                Ok(qb.build_query_as::<RequestLog>().fetch_all(pool).await?)
            }
        }
    }

    #[allow(dead_code)]
    pub async fn get_request_log(&self, id: i64) -> Result<Option<RequestLog>> {
        match self {
            Self::Postgres(pool) => {
                Ok(sqlx::query_as::<_, RequestLog>(
                    r#"SELECT id::BIGINT as id, service_id,
                       api_key_id::BIGINT as api_key_id, project_id::BIGINT as project_id, org_id::BIGINT as org_id,
                       provider_id::BIGINT as provider_id, provider_name, model, status,
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
                        hour: row.try_get("hour")?,
                        requests: row.try_get("requests")?,
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
                        AVG(latency_ms)::DOUBLE PRECISION as avg_latency_ms
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
                        provider_name: row.try_get("provider_name")?,
                        avg_latency_ms: row.try_get("avg_latency_ms")?,
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
                        AVG(CASE WHEN status = 'success' THEN latency_ms END)::DOUBLE PRECISION as avg_latency_ms
                    FROM request_logs 
                    WHERE created_at >= NOW() - INTERVAL '24 hours'
                    "#
                ).fetch_one(pool).await?;

                Ok(TodayStats {
                    total_requests: row.try_get("total_requests")?,
                    avg_latency_ms: row.try_get::<Option<f64>, _>("avg_latency_ms")?.unwrap_or(0.0),
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
                    success_rate: row.try_get("success_rate")?,
                    requests_today: row.try_get("total_requests")?,
                    tokens_used: row.try_get("tokens_used")?,
                    failed_requests: row.try_get("failed_requests")?,
                    avg_response_time: row.try_get("avg_response_time")?,
                    qps: row.try_get("qps")?,
                })
            }
        }
    }

    pub async fn get_top_models(&self, limit: i64, last_hours: i64) -> Result<Vec<TopModelUsage>> {
        match self {
            Self::Postgres(pool) => {
                let rows = sqlx::query(
                    r#"
                    SELECT
                        model,
                        COUNT(*)::BIGINT as requests,
                        COALESCE(SUM(CASE WHEN status = 'success' THEN tokens_used ELSE 0 END), 0)::BIGINT as tokens
                    FROM request_logs
                    WHERE created_at >= NOW() - ($1::INT * INTERVAL '1 hour')
                      AND request_type != 'health_check'
                      AND model != 'health_check'
                    GROUP BY model
                    ORDER BY requests DESC, tokens DESC, model ASC
                    LIMIT $2
                    "#
                )
                .bind(last_hours)
                .bind(limit)
                .fetch_all(pool)
                .await?;

                let mut models = Vec::new();
                for row in rows {
                    models.push(TopModelUsage {
                        model: row.try_get("model")?,
                        requests: row.try_get("requests")?,
                        tokens: row.try_get("tokens")?,
                    });
                }

                Ok(models)
            }
        }
    }

    pub async fn get_token_usage_by_org(
        &self,
        last_hours: i64,
        top: i64,
        org_id_filter: Option<i64>,
    ) -> Result<Vec<TokenUsageByOrg>> {
        match self {
            Self::Postgres(pool) => {
                let mut qb = sqlx::QueryBuilder::new(
                    r#"
                    SELECT
                        org_id::BIGINT as org_id,
                        COUNT(*)::BIGINT as requests,
                        COALESCE(SUM(tokens_used), 0)::BIGINT as tokens
                    FROM request_logs
                    WHERE created_at >= NOW() - ("#,
                );
                qb.push_bind(last_hours);
                qb.push("::INT * INTERVAL '1 hour')");
                qb.push(" AND status = 'success'");
                qb.push(" AND request_type <> 'health_check'");
                qb.push(" AND org_id IS NOT NULL");

                if let Some(org_id) = org_id_filter {
                    qb.push(" AND org_id = ").push_bind(org_id);
                }

                qb.push(" GROUP BY org_id");
                qb.push(" ORDER BY tokens DESC, requests DESC, org_id ASC");
                qb.push(" LIMIT ").push_bind(top);

                let rows = qb.build().fetch_all(pool).await?;

                let mut result = Vec::new();
                for row in rows {
                    result.push(TokenUsageByOrg {
                        org_id: row.try_get("org_id")?,
                        requests: row.try_get("requests")?,
                        tokens: row.try_get("tokens")?,
                    });
                }

                Ok(result)
            }
        }
    }

    pub async fn get_token_usage_by_service(
        &self,
        last_hours: i64,
        top: i64,
        org_id_filter: Option<i64>,
    ) -> Result<Vec<TokenUsageByService>> {
        match self {
            Self::Postgres(pool) => {
                let mut qb = sqlx::QueryBuilder::new(
                    r#"
                    SELECT
                        service_id,
                        COUNT(*)::BIGINT as requests,
                        COALESCE(SUM(tokens_used), 0)::BIGINT as tokens
                    FROM request_logs
                    WHERE created_at >= NOW() - ("#,
                );
                qb.push_bind(last_hours);
                qb.push("::INT * INTERVAL '1 hour')");
                qb.push(" AND status = 'success'");
                qb.push(" AND request_type <> 'health_check'");
                qb.push(" AND service_id IS NOT NULL");

                if let Some(org_id) = org_id_filter {
                    qb.push(" AND org_id = ").push_bind(org_id);
                }

                qb.push(" GROUP BY service_id");
                qb.push(" ORDER BY tokens DESC, requests DESC, service_id ASC");
                qb.push(" LIMIT ").push_bind(top);

                let rows = qb.build().fetch_all(pool).await?;

                let mut result = Vec::new();
                for row in rows {
                    result.push(TokenUsageByService {
                        service_id: row.try_get::<Option<String>, _>("service_id")?.unwrap_or_default(),
                        requests: row.try_get("requests")?,
                        tokens: row.try_get("tokens")?,
                    });
                }

                Ok(result)
            }
        }
    }
}

 