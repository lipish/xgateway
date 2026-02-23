use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;

pub fn status_from_anyhow(err: &anyhow::Error) -> StatusCode {
    err.downcast_ref::<llm_connector::LlmConnectorError>()
        .and_then(|e| StatusCode::from_u16(e.status_code()).ok())
        .unwrap_or(StatusCode::BAD_GATEWAY)
}

pub fn error_type_from_status(status: StatusCode) -> &'static str {
    match status {
        StatusCode::BAD_REQUEST => "invalid_request",
        StatusCode::UNAUTHORIZED => "auth_error",
        StatusCode::FORBIDDEN => "permission_denied",
        StatusCode::NOT_FOUND => "not_found",
        StatusCode::REQUEST_TIMEOUT => "timeout",
        StatusCode::TOO_MANY_REQUESTS => "rate_limit_exceeded",
        StatusCode::NOT_IMPLEMENTED => "not_supported",
        StatusCode::SERVICE_UNAVAILABLE => "service_unavailable",
        StatusCode::BAD_GATEWAY => "upstream_error",
        _ => "internal_error",
    }
}

pub fn json_error_response(
    status: StatusCode,
    message: impl Into<String>,
    error_type: Option<&str>,
) -> Response {
    let error_code = error_type.unwrap_or_else(|| error_type_from_status(status));
    let payload = json!({
        "error": {
            "message": message.into(),
            "type": error_code,
            "code": error_code
        }
    });
    (status, Json(payload)).into_response()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_type_from_status_mapping() {
        assert_eq!(error_type_from_status(StatusCode::UNAUTHORIZED), "auth_error");
        assert_eq!(error_type_from_status(StatusCode::TOO_MANY_REQUESTS), "rate_limit_exceeded");
        assert_eq!(error_type_from_status(StatusCode::BAD_GATEWAY), "upstream_error");
    }

    #[test]
    fn test_status_from_anyhow_llm_connector_error() {
        let err = anyhow::Error::new(llm_connector::LlmConnectorError::RateLimitError(
            "too many requests".to_string(),
        ));
        assert_eq!(status_from_anyhow(&err), StatusCode::TOO_MANY_REQUESTS);
    }

    #[tokio::test]
    async fn test_json_error_response_sets_type_and_code() {
        let response = json_error_response(StatusCode::BAD_GATEWAY, "upstream failed", None);
        let status = response.status();
        let body = axum::body::to_bytes(response.into_body(), usize::MAX)
            .await
            .expect("read response body");
        let payload: serde_json::Value = serde_json::from_slice(&body).expect("parse json");

        assert_eq!(status, StatusCode::BAD_GATEWAY);
        assert_eq!(payload["error"]["type"], "upstream_error");
        assert_eq!(payload["error"]["code"], "upstream_error");
        assert_eq!(payload["error"]["message"], "upstream failed");
    }
}
