use axum::extract::State;
use axum::http::{header, StatusCode};
use axum::middleware::Next;
use axum::response::{IntoResponse, Response};

use crate::admin::AdminState;
use crate::db::{DatabasePool, User};

#[derive(Clone, Debug)]
pub struct AdminUserContext {
    pub user: User,
    pub org_id: i64,
    pub org_role: Option<String>,
    pub is_admin: bool,
}

pub async fn admin_auth_middleware(
    State(state): State<AdminState>,
    mut req: axum::http::Request<axum::body::Body>,
    next: Next,
) -> Response {
    let path = req.uri().path();
    if path.starts_with("/api/auth/") {
        return next.run(req).await;
    }

    let token = req
        .headers()
        .get(header::AUTHORIZATION)
        .and_then(|h| h.to_str().ok())
        .and_then(|s| s.strip_prefix("Bearer "));

    let token = match token {
        Some(t) if !t.trim().is_empty() => t,
        _ => {
            return (
                StatusCode::UNAUTHORIZED,
                axum::Json(serde_json::json!({
                    "error": {
                        "message": "Missing or invalid Authorization header",
                        "type": "unauthorized"
                    }
                })),
            )
                .into_response();
        }
    };

    let db_pool: DatabasePool = state.db_pool.clone();

    let user = match db_pool.get_user_by_token(token).await {
        Ok(Some(u)) => u,
        Ok(None) => {
            return (
                StatusCode::UNAUTHORIZED,
                axum::Json(serde_json::json!({
                    "error": {
                        "message": "Invalid token",
                        "type": "unauthorized"
                    }
                })),
            )
                .into_response();
        }
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                axum::Json(serde_json::json!({
                    "error": {
                        "message": format!("Failed to verify token: {}", e),
                        "type": "server_error"
                    }
                })),
            )
                .into_response();
        }
    };

    let is_admin = user.role_id.as_deref() == Some("admin");

    let org_id = match db_pool.get_primary_org_id_for_user(user.id).await {
        Ok(Some(id)) => id,
        Ok(None) => 1,
        Err(_) => 1,
    };

    let org_role = if is_admin {
        None
    } else {
        db_pool.get_org_user_role(org_id, user.id).await.ok().flatten()
    };

    if !is_admin {
        if org_role.is_none() {
            return (
                StatusCode::FORBIDDEN,
                axum::Json(serde_json::json!({
                    "error": {
                        "message": "User is not a member of any organization",
                        "type": "forbidden"
                    }
                })),
            )
                .into_response();
        }
    }

    req.extensions_mut().insert(AdminUserContext {
        user,
        org_id,
        org_role,
        is_admin,
    });

    next.run(req).await
}
