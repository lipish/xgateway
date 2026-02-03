use super::types::ProxyState;
use axum::http::StatusCode;
use chrono::Utc;
use serde::Deserialize;
use std::time::Instant;

#[derive(Debug, Deserialize)]
pub struct ModelsQuery {
    pub provider_id: Option<i64>,
}

fn parse_provider_ids(value: &Option<String>) -> Vec<i64> {
    value
        .as_ref()
        .and_then(|raw| serde_json::from_str::<Vec<i64>>(raw).ok())
        .unwrap_or_default()
}

pub async fn handle_list_models(
    axum::extract::State(state): axum::extract::State<ProxyState>,
    axum::extract::Query(query): axum::extract::Query<ModelsQuery>,
    headers: axum::http::HeaderMap,
) -> (StatusCode, axum::Json<serde_json::Value>) {
    let start_time = Instant::now();
    let start_timestamp = Utc::now();
    let request_payload = serde_json::json!({ "provider_id": query.provider_id });
    let db_pool = &state.db_pool;
    let report = |status: StatusCode,
                  response_payload: Option<serde_json::Value>,
                  error: Option<String>| {
        if let Some(xtrace) = state.xtrace.as_ref() {
            xtrace.report_request(
                "GET",
                "/v1/models",
                status.as_u16(),
                Some(request_payload.clone()),
                response_payload,
                error,
                false,
                start_time,
                start_timestamp,
            );
        }
    };

    let api_key = headers
        .get(axum::http::header::AUTHORIZATION)
        .and_then(|h| h.to_str().ok())
        .and_then(|s| s.strip_prefix("Bearer "));

    let api_key_info = if let Some(key) = api_key {
        match db_pool.get_api_key_by_hash(key).await {
            Ok(Some(info)) => {
                if info.protocol != "openai" {
                    let status = StatusCode::FORBIDDEN;
                    let body = serde_json::json!({
                        "error": {
                            "message": "API key protocol does not allow this endpoint",
                            "type": "invalid_protocol"
                        }
                    });
                    report(status, Some(body.clone()), Some("invalid_protocol".to_string()));
                    return (status, axum::Json(body));
                }
                Some(info)
            },
            _ => {
                let status = StatusCode::UNAUTHORIZED;
                let body = serde_json::json!({
                    "error": {
                        "message": "Invalid API Key",
                        "type": "invalid_api_key"
                    }
                });
                report(status, Some(body.clone()), Some("invalid_api_key".to_string()));
                return (status, axum::Json(body));
            }
        }
    } else {
        None
    };

    let mut providers = db_pool.list_providers().await.unwrap_or_default();

    let mut candidate_provider_ids = if let Some(key_info) = &api_key_info {
        if key_info.scope == "instance" {
            let ids = parse_provider_ids(&key_info.provider_ids);
            if ids.is_empty() {
                let status = StatusCode::BAD_REQUEST;
                let body = serde_json::json!({
                    "error": {
                        "message": "Instance-scoped API key requires provider_ids",
                        "type": "missing_provider_ids"
                    }
                });
                report(status, Some(body.clone()), Some("missing_provider_ids".to_string()));
                return (status, axum::Json(body));
            }
            ids
        } else {
            providers.iter().map(|p| p.id).collect::<Vec<_>>()
        }
    } else {
        providers.iter().map(|p| p.id).collect::<Vec<_>>()
    };

    if let Some(provider_id) = query.provider_id {
        if let Some(key_info) = &api_key_info {
            if key_info.scope == "instance" && !candidate_provider_ids.contains(&provider_id) {
                let status = StatusCode::FORBIDDEN;
                let body = serde_json::json!({
                    "error": {
                        "message": "API key does not have access to this provider",
                        "type": "provider_access_denied"
                    }
                });
                report(status, Some(body.clone()), Some("provider_access_denied".to_string()));
                return (status, axum::Json(body));
            }
        }
        candidate_provider_ids = vec![provider_id];
    }

    let candidate_set: std::collections::HashSet<i64> = candidate_provider_ids.iter().copied().collect();
    providers.retain(|p| candidate_set.contains(&p.id) && p.enabled);

    let models: Vec<serde_json::Value> = providers
        .iter()
        .map(|p| {
            let config: serde_json::Value = serde_json::from_str(&p.config).unwrap_or_default();
            let model = p
                .endpoint
                .as_deref()
                .or_else(|| config.get("model").and_then(|v| v.as_str()))
                .unwrap_or("unknown");
            serde_json::json!({
                "id": model,
                "object": "model",
                "owned_by": p.provider_type,
                "provider": p.name
            })
        })
        .collect();

    let status = StatusCode::OK;
    let body = serde_json::json!({
        "object": "list",
        "data": models
    });
    report(status, Some(body.clone()), None);
    (status, axum::Json(body))
}

pub async fn handle_get_model(
    axum::extract::Path(model_id): axum::extract::Path<String>,
    axum::extract::Query(query): axum::extract::Query<ModelsQuery>,
    axum::extract::State(state): axum::extract::State<ProxyState>,
    headers: axum::http::HeaderMap,
) -> (StatusCode, axum::Json<serde_json::Value>) {
    let start_time = Instant::now();
    let start_timestamp = Utc::now();
    let request_payload = serde_json::json!({
        "provider_id": query.provider_id,
        "model_id": model_id
    });
    let db_pool = &state.db_pool;
    let report = |status: StatusCode,
                  response_payload: Option<serde_json::Value>,
                  error: Option<String>| {
        if let Some(xtrace) = state.xtrace.as_ref() {
            xtrace.report_request(
                "GET",
                "/v1/models/:model",
                status.as_u16(),
                Some(request_payload.clone()),
                response_payload,
                error,
                false,
                start_time,
                start_timestamp,
            );
        }
    };

    let api_key = headers
        .get(axum::http::header::AUTHORIZATION)
        .and_then(|h| h.to_str().ok())
        .and_then(|s| s.strip_prefix("Bearer "));

    let api_key_info = if let Some(key) = api_key {
        match db_pool.get_api_key_by_hash(key).await {
            Ok(Some(info)) => {
                if info.protocol != "openai" {
                    let status = StatusCode::FORBIDDEN;
                    let body = serde_json::json!({
                        "error": {
                            "message": "API key protocol does not allow this endpoint",
                            "type": "invalid_protocol"
                        }
                    });
                    report(status, Some(body.clone()), Some("invalid_protocol".to_string()));
                    return (status, axum::Json(body));
                }
                Some(info)
            },
            _ => {
                let status = StatusCode::UNAUTHORIZED;
                let body = serde_json::json!({
                    "error": {
                        "message": "Invalid API Key",
                        "type": "invalid_api_key"
                    }
                });
                report(status, Some(body.clone()), Some("invalid_api_key".to_string()));
                return (status, axum::Json(body));
            }
        }
    } else {
        None
    };

    let mut providers = db_pool.list_providers().await.unwrap_or_default();

    let mut candidate_provider_ids = if let Some(key_info) = &api_key_info {
        if key_info.scope == "instance" {
            let ids = parse_provider_ids(&key_info.provider_ids);
            if ids.is_empty() {
                let status = StatusCode::BAD_REQUEST;
                let body = serde_json::json!({
                    "error": {
                        "message": "Instance-scoped API key requires provider_ids",
                        "type": "missing_provider_ids"
                    }
                });
                report(status, Some(body.clone()), Some("missing_provider_ids".to_string()));
                return (status, axum::Json(body));
            }
            ids
        } else {
            providers.iter().map(|p| p.id).collect::<Vec<_>>()
        }
    } else {
        providers.iter().map(|p| p.id).collect::<Vec<_>>()
    };

    if let Some(provider_id) = query.provider_id {
        if let Some(key_info) = &api_key_info {
            if key_info.scope == "instance" && !candidate_provider_ids.contains(&provider_id) {
                let status = StatusCode::FORBIDDEN;
                let body = serde_json::json!({
                    "error": {
                        "message": "API key does not have access to this provider",
                        "type": "provider_access_denied"
                    }
                });
                report(status, Some(body.clone()), Some("provider_access_denied".to_string()));
                return (status, axum::Json(body));
            }
        }
        candidate_provider_ids = vec![provider_id];
    }

    let candidate_set: std::collections::HashSet<i64> = candidate_provider_ids.iter().copied().collect();
    providers.retain(|p| candidate_set.contains(&p.id) && p.enabled);

    let selected = providers.iter().find_map(|p| {
        let config: serde_json::Value = serde_json::from_str(&p.config).unwrap_or_default();
        let model_owned = p
            .endpoint
            .clone()
            .or_else(|| config.get("model").and_then(|v| v.as_str()).map(|s| s.to_string()))
            .unwrap_or_else(|| "unknown".to_string());
        if model_owned == model_id {
            Some((p, model_owned))
        } else {
            None
        }
    });

    let Some((provider, model)) = selected else {
        let status = StatusCode::NOT_FOUND;
        let body = serde_json::json!({
            "error": {
                "message": format!("Model {} not found", model_id),
                "type": "model_not_found"
            }
        });
        report(status, Some(body.clone()), Some("model_not_found".to_string()));
        return (status, axum::Json(body));
    };

    let status = StatusCode::OK;
    let body = serde_json::json!({
        "id": model,
        "object": "model",
        "owned_by": provider.provider_type,
        "provider": provider.name
    });
    report(status, Some(body.clone()), None);
    (status, axum::Json(body))
}
