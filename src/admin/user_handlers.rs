use axum::Json;
use serde::Deserialize;
use crate::db::{DatabasePool, NewUser, User, NewUserInstance, UserInstance};
use super::ApiResponse;

/// List users
pub async fn list_users_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
) -> Json<ApiResponse<Vec<User>>> {
    match db_pool.list_users().await {
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
}

/// Create a new user
pub async fn create_user_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
    Json(req): Json<CreateUserRequest>,
) -> Json<ApiResponse<i32>> {
    let new_user = NewUser {
        username: req.username,
        password_hash: req.password_hash,
        role_id: req.role_id,
    };

    match db_pool.create_user(new_user).await {
        Ok(id) => Json(ApiResponse {
            success: true,
            data: Some(id),
            message: "User created successfully".to_string(),
        }),
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
    axum::extract::Path(id): axum::extract::Path<i32>,
) -> Json<ApiResponse<()>> {
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

/// Toggle user status
pub async fn toggle_user_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
    axum::extract::Path(id): axum::extract::Path<i32>,
) -> Json<ApiResponse<()>> {
    // We need a way to get user by id to toggle
    // For now, let's just list and find (inefficient but works for small user lists)
    match db_pool.list_users().await {
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
    pub granted_by: Option<i32>,
}

/// List all instances granted to a user
pub async fn list_user_instances_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
    axum::extract::Path(user_id): axum::extract::Path<i32>,
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
    axum::extract::Path(user_id): axum::extract::Path<i32>,
    Json(req): Json<GrantInstanceRequest>,
) -> Json<ApiResponse<i32>> {
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
    axum::extract::Path((user_id, provider_id)): axum::extract::Path<(i32, i64)>,
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
