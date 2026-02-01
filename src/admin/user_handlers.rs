use axum::Json;
use serde::Deserialize;
use crate::db::{DatabasePool, NewUser, User, NewUserInstance, UserInstance};
use super::ApiResponse;
use crate::admin::auth_middleware::AdminUserContext;

/// List users
pub async fn list_users_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
    axum::extract::Extension(ctx): axum::extract::Extension<AdminUserContext>,
) -> Json<ApiResponse<Vec<User>>> {
    if !ctx.is_admin && ctx.org_role.as_deref() != Some("admin") {
        return Json(ApiResponse {
            success: false,
            data: None,
            message: "org_admin_required".to_string(),
        });
    }
    let result = if ctx.is_admin {
        db_pool.list_users().await
    } else {
        db_pool.list_users_by_org_id(ctx.org_id).await
    };

    match result {
        Ok(users) => Json(ApiResponse {
            success: true,
            data: Some(users),
            message: "Users retrieved".to_string(),
        }),
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            message: format!("Failed to list users: {}", e),
        }),
    }
}

#[derive(Debug, Deserialize)]
pub struct CreateUserRequest {
    pub username: String,
    pub password_hash: String, // In a real system, we'd hash this on the server
    #[serde(default)]
    pub role_id: Option<String>,
    #[serde(default)]
    pub org_id: Option<i64>,
}

/// Create a new user
pub async fn create_user_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
    axum::extract::Extension(ctx): axum::extract::Extension<AdminUserContext>,
    Json(req): Json<CreateUserRequest>,
) -> Json<ApiResponse<i64>> {
    if !ctx.is_admin && ctx.org_role.as_deref() != Some("admin") {
        return Json(ApiResponse { success: false, data: None, message: "org_admin_required".to_string() });
    }
    if !ctx.is_admin && req.role_id.as_deref() == Some("admin") {
        return Json(ApiResponse { success: false, data: None, message: "admin_required".to_string() });
    }

    let new_user = NewUser {
        username: req.username,
        password_hash: req.password_hash,
        role_id: req.role_id,
    };

    match db_pool.create_user(new_user).await {
        Ok(id) => {
            let target_org_id = if ctx.is_admin {
                req.org_id.unwrap_or(1)
            } else {
                ctx.org_id
            };
            let _ = db_pool.add_user_to_org(target_org_id, id, Some("member")).await;
            Json(ApiResponse {
                success: true,
                data: Some(id),
                message: "User created successfully".to_string(),
            })
        }
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            message: format!("Failed to create user: {}", e),
        }),
    }
}

/// Delete user
pub async fn delete_user_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
    axum::extract::Path(id): axum::extract::Path<i64>,
    axum::extract::Extension(ctx): axum::extract::Extension<AdminUserContext>,
) -> Json<ApiResponse<()>> {
    if !ctx.is_admin {
        if ctx.org_role.as_deref() != Some("admin") {
            return Json(ApiResponse { success: false, data: None, message: "org_admin_required".to_string() });
        }
        match db_pool.is_user_in_org(ctx.org_id, id).await {
            Ok(true) => {}
            Ok(false) => {
                return Json(ApiResponse { success: false, data: None, message: "forbidden".to_string() });
            }
            Err(e) => {
                return Json(ApiResponse { success: false, data: None, message: format!("Failed to check org membership: {}", e) });
            }
        }
    }

    match db_pool.delete_user(id).await {
        Ok(true) => Json(ApiResponse {
            success: true,
            data: Some(()),
            message: "User deleted".to_string(),
        }),
        Ok(false) => Json(ApiResponse {
            success: false,
            data: None,
            message: "User not found".to_string(),
        }),
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            message: format!("Failed to delete user: {}", e),
        }),
    }
}

#[derive(Debug, Deserialize)]
pub struct UpdateUserRequest {
    #[serde(default)]
    pub role_id: Option<String>,
    #[serde(default)]
    pub password_hash: Option<String>,
    #[serde(default)]
    pub org_id: Option<i64>,
}

/// Update user role/password/org
pub async fn update_user_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
    axum::extract::Path(id): axum::extract::Path<i64>,
    axum::extract::Extension(ctx): axum::extract::Extension<AdminUserContext>,
    Json(req): Json<UpdateUserRequest>,
) -> Json<ApiResponse<()>> {
    if !ctx.is_admin {
        if ctx.org_role.as_deref() != Some("admin") {
            return Json(ApiResponse { success: false, data: None, message: "org_admin_required".to_string() });
        }
        if req.role_id.as_deref() == Some("admin") {
            return Json(ApiResponse { success: false, data: None, message: "admin_required".to_string() });
        }
        match db_pool.is_user_in_org(ctx.org_id, id).await {
            Ok(true) => {}
            Ok(false) => {
                return Json(ApiResponse { success: false, data: None, message: "forbidden".to_string() });
            }
            Err(e) => {
                return Json(ApiResponse { success: false, data: None, message: format!("Failed to check org membership: {}", e) });
            }
        }
    }

    match db_pool.update_user_profile(id, req.role_id.as_deref(), req.password_hash.as_deref()).await {
        Ok(true) => {
            let target_org_id = if ctx.is_admin {
                req.org_id.unwrap_or(1)
            } else {
                ctx.org_id
            };
            let _ = db_pool.add_user_to_org(target_org_id, id, Some("member")).await;
            Json(ApiResponse {
                success: true,
                data: Some(()),
                message: "User updated".to_string(),
            })
        }
        Ok(false) => Json(ApiResponse {
            success: false,
            data: None,
            message: "User not found".to_string(),
        }),
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            message: format!("Failed to update user: {}", e),
        }),
    }
}

/// Toggle user status
pub async fn toggle_user_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
    axum::extract::Path(id): axum::extract::Path<i64>,
    axum::extract::Extension(ctx): axum::extract::Extension<AdminUserContext>,
) -> Json<ApiResponse<()>> {
    if !ctx.is_admin {
        if ctx.org_role.as_deref() != Some("admin") {
            return Json(ApiResponse { success: false, data: None, message: "org_admin_required".to_string() });
        }
        match db_pool.is_user_in_org(ctx.org_id, id).await {
            Ok(true) => {}
            Ok(false) => {
                return Json(ApiResponse { success: false, data: None, message: "forbidden".to_string() });
            }
            Err(e) => {
                return Json(ApiResponse { success: false, data: None, message: format!("Failed to check org membership: {}", e) });
            }
        }
    }

    // We need a way to get user by id to toggle
    // For now, let's just list and find (inefficient but works for small user lists)
    let result = if ctx.is_admin {
        db_pool.list_users().await
    } else {
        db_pool.list_users_by_org_id(ctx.org_id).await
    };

    match result {
        Ok(users) => {
            if let Some(user) = users.into_iter().find(|u| u.id == id) {
                let new_status = if user.status == "active" { "disabled" } else { "active" };
                match db_pool.update_user_status(id, new_status).await {
                    Ok(_) => Json(ApiResponse {
                        success: true,
                        data: Some(()),
                        message: format!("User status updated to {}", new_status),
                    }),
                    Err(e) => Json(ApiResponse {
                        success: false,
                        data: None,
                        message: format!("Failed to toggle user status: {}", e),
                    }),
                }
            } else {
                Json(ApiResponse {
                    success: false,
                    data: None,
                    message: "User not found".to_string(),
                })
            }
        }
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            message: format!("Failed to list users: {}", e),
        }),
    }
}

#[derive(Debug, Deserialize)]
pub struct GrantInstanceRequest {
    pub provider_id: i64,
    pub granted_by: Option<i64>,
}

/// List all instances granted to a user
pub async fn list_user_instances_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
    axum::extract::Path(user_id): axum::extract::Path<i64>,
) -> Json<ApiResponse<Vec<UserInstance>>> {
    match db_pool.get_user_granted_instances(user_id).await {
        Ok(instances) => Json(ApiResponse {
            success: true,
            data: Some(instances),
            message: "User instances retrieved".to_string(),
        }),
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            message: format!("Failed to list user instances: {}", e),
        }),
    }
}

/// Grant user access to a provider instance
pub async fn grant_user_instance_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
    axum::extract::Path(user_id): axum::extract::Path<i64>,
    Json(req): Json<GrantInstanceRequest>,
) -> Json<ApiResponse<i64>> {
    let grant = NewUserInstance {
        user_id,
        provider_id: req.provider_id,
        granted_by: req.granted_by,
    };

    match db_pool.grant_user_instance(grant).await {
        Ok(id) => Json(ApiResponse {
            success: true,
            data: Some(id),
            message: "Instance access granted".to_string(),
        }),
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            message: format!("Failed to grant instance access: {}", e),
        }),
    }
}

/// Revoke user access to a provider instance
pub async fn revoke_user_instance_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
    axum::extract::Path((user_id, provider_id)): axum::extract::Path<(i64, i64)>,
) -> Json<ApiResponse<()>> {
    match db_pool.revoke_user_instance(user_id, provider_id).await {
        Ok(true) => Json(ApiResponse {
            success: true,
            data: Some(()),
            message: "Instance access revoked".to_string(),
        }),
        Ok(false) => Json(ApiResponse {
            success: false,
            data: None,
            message: "Grant not found".to_string(),
        }),
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            message: format!("Failed to revoke instance access: {}", e),
        }),
    }
}
