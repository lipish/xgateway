use super::types::ProxyState;

pub async fn handle_list_models(
    axum::extract::State(state): axum::extract::State<ProxyState>,
) -> impl axum::response::IntoResponse {
    let providers = state.db_pool.list_providers().await.unwrap_or_default();
    let models: Vec<serde_json::Value> = providers
        .iter()
        .filter(|p| p.enabled)
        .map(|p| {
            let config: serde_json::Value = serde_json::from_str(&p.config).unwrap_or_default();
            let model = config
                .get("model")
                .and_then(|v| v.as_str())
                .unwrap_or("unknown");
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
pub async fn handle_get_model(
    axum::extract::Path(model_id): axum::extract::Path<String>,
) -> impl axum::response::IntoResponse {
    axum::Json(serde_json::json!({
        "id": model_id,
        "object": "model",
        "owned_by": "llm-link"
    }))
}