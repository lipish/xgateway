use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::Json;
use serde::Deserialize;

use super::ApiResponse;
use crate::admin::auth_middleware::AdminUserContext;
use crate::db::DatabasePool;

pub async fn list_org_users_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
    axum::extract::Path(org_id): axum::extract::Path<i64>,
    axum::extract::Extension(ctx): axum::extract::Extension<AdminUserContext>,
) -> axum::response::Response {
    if !ctx.is_admin {
        match db_pool.get_organization_owner_id(org_id).await {
            Ok(Some(owner_id)) if owner_id == ctx.user.id => {}
            Ok(Some(_)) | Ok(None) | Err(_) => {
                return (
                    StatusCode::FORBIDDEN,
                    Json(ApiResponse::<()> {
                        success: false,
                        data: None,
                        message: "forbidden".to_string(),
                    }),
                )
                    .into_response();
            }
        }
    }

    if !ctx.is_admin && ctx.org_id != org_id {
        return (
            StatusCode::FORBIDDEN,
            Json(ApiResponse::<()> {
                success: false,
                data: None,
                message: "forbidden".to_string(),
            }),
        )
            .into_response();
    }

    match db_pool.list_users_by_org_id(org_id).await {
        Ok(users) => Json(ApiResponse {
            success: true,
            data: Some(users),
            message: "Organization users retrieved".to_string(),
        })
        .into_response(),
        Err(e) => Json(ApiResponse::<()> {
            success: false,
            data: None,
            message: format!("Failed to list organization users: {}", e),
        })
        .into_response(),
    }
}

#[derive(Debug, Deserialize)]
pub struct AddOrgUserRequest {
    pub user_id: i64,
    pub role: Option<String>,
}

pub async fn add_org_user_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
    axum::extract::Path(org_id): axum::extract::Path<i64>,
    axum::extract::Extension(ctx): axum::extract::Extension<AdminUserContext>,
    Json(req): Json<AddOrgUserRequest>,
) -> axum::response::Response {
    if !ctx.is_admin {
        match db_pool.get_organization_owner_id(org_id).await {
            Ok(Some(owner_id)) if owner_id == ctx.user.id => {}
            Ok(Some(_)) | Ok(None) | Err(_) => {
                return (
                    StatusCode::FORBIDDEN,
                    Json(ApiResponse::<()> {
                        success: false,
                        data: None,
                        message: "forbidden".to_string(),
                    }),
                )
                    .into_response();
            }
        }
    }

    if !ctx.is_admin && ctx.org_id != org_id {
        return (
            StatusCode::FORBIDDEN,
            Json(ApiResponse::<()> {
                success: false,
                data: None,
                message: "forbidden".to_string(),
            }),
        )
            .into_response();
    }

    if !ctx.is_admin && ctx.org_role.as_deref() != Some("admin") {
        return (
            StatusCode::FORBIDDEN,
            Json(ApiResponse::<()> {
                success: false,
                data: None,
                message: "org_admin_required".to_string(),
            }),
        )
            .into_response();
    }

    match db_pool
        .add_user_to_org(org_id, req.user_id, req.role.as_deref())
        .await
    {
        Ok(_) => Json(ApiResponse {
            success: true,
            data: Some(()),
            message: "Organization user added".to_string(),
        })
        .into_response(),
        Err(e) => Json(ApiResponse::<()> {
            success: false,
            data: None,
            message: format!("Failed to add user to organization: {}", e),
        })
        .into_response(),
    }
}

pub async fn remove_org_user_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
    axum::extract::Path((org_id, user_id)): axum::extract::Path<(i64, i64)>,
    axum::extract::Extension(ctx): axum::extract::Extension<AdminUserContext>,
) -> axum::response::Response {
    if !ctx.is_admin {
        match db_pool.get_organization_owner_id(org_id).await {
            Ok(Some(owner_id)) if owner_id == ctx.user.id => {}
            Ok(Some(_)) | Ok(None) | Err(_) => {
                return (
                    StatusCode::FORBIDDEN,
                    Json(ApiResponse::<()> {
                        success: false,
                        data: None,
                        message: "forbidden".to_string(),
                    }),
                )
                    .into_response();
            }
        }
    }

    if !ctx.is_admin && ctx.org_id != org_id {
        return (
            StatusCode::FORBIDDEN,
            Json(ApiResponse::<()> {
                success: false,
                data: None,
                message: "forbidden".to_string(),
            }),
        )
            .into_response();
    }

    if !ctx.is_admin && ctx.org_role.as_deref() != Some("admin") {
        return (
            StatusCode::FORBIDDEN,
            Json(ApiResponse::<()> {
                success: false,
                data: None,
                message: "org_admin_required".to_string(),
            }),
        )
            .into_response();
    }

    if org_id == 1 && user_id == ctx.user.id {
        return (
            StatusCode::BAD_REQUEST,
            Json(ApiResponse::<()> {
                success: false,
                data: None,
                message: "cannot_remove_self_from_default_org".to_string(),
            }),
        )
            .into_response();
    }

    match db_pool.remove_user_from_org(org_id, user_id).await {
        Ok(true) => Json(ApiResponse {
            success: true,
            data: Some(()),
            message: "Organization user removed".to_string(),
        })
        .into_response(),
        Ok(false) => Json(ApiResponse::<()> {
            success: false,
            data: None,
            message: "Organization user not found".to_string(),
        })
        .into_response(),
        Err(e) => Json(ApiResponse::<()> {
            success: false,
            data: None,
            message: format!("Failed to remove user from organization: {}", e),
        })
        .into_response(),
    }
}
