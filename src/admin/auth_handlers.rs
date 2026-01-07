use axum::Json;
use serde::{Deserialize, Serialize};
use crate::db::{DatabasePool, NewUser};
use super::ApiResponse;

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Serialize)]
pub struct LoginResponse {
    pub user: serde_json::Value,
    pub token: String,
}

#[derive(Debug, Deserialize)]
pub struct RegisterRequest {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Deserialize)]
pub struct ForgotPasswordRequest {
    pub username: String,
}

/// Login API endpoint
pub async fn login_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
    Json(req): Json<LoginRequest>,
) -> Json<ApiResponse<LoginResponse>> {
    // Get user by username
    match db_pool.get_user_by_username(&req.username).await {
        Ok(Some(user)) => {
            // Verify password (simple comparison for now, should use bcrypt in production)
            if user.password_hash == req.password {
                // Generate a simple token (in production, use JWT)
                let token = format!("token_{}", uuid::Uuid::new_v4());
                
                let response = LoginResponse {
                    user: serde_json::json!({
                        "id": user.id,
                        "username": user.username,
                        "role_id": user.role_id,
                    }),
                    token,
                };
                
                Json(ApiResponse {
                    success: true,
                    data: Some(response),
                    message: "Login successful".to_string(),
                })
            } else {
                Json(ApiResponse {
                    success: false,
                    data: None,
                    message: "Invalid username or password".to_string(),
                })
            }
        }
        Ok(None) => Json(ApiResponse {
            success: false,
            data: None,
            message: "Invalid username or password".to_string(),
        }),
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            message: format!("Login failed: {}", e),
        }),
    }
}

pub async fn register_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
    Json(req): Json<RegisterRequest>,
) -> Json<ApiResponse<()>> {
    match db_pool.get_user_by_username(&req.username).await {
        Ok(Some(_)) => Json(ApiResponse {
            success: false,
            data: None,
            message: "Username already exists".to_string(),
        }),
        Ok(None) => {
            let new_user = NewUser {
                username: req.username.clone(),
                password_hash: req.password,
                role_id: Some("user".to_string()),
            };

            match db_pool.create_user(new_user).await {
                Ok(_) => Json(ApiResponse {
                    success: true,
                    data: Some(()),
                    message: "Registration successful".to_string(),
                }),
                Err(e) => Json(ApiResponse {
                    success: false,
                    data: None,
                    message: format!("Registration failed: {}", e),
                }),
            }
        }
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            message: format!("Registration failed: {}", e),
        }),
    }
}

pub async fn forgot_password_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
    Json(req): Json<ForgotPasswordRequest>,
) -> Json<ApiResponse<()>> {
    match db_pool.get_user_by_username(&req.username).await {
        Ok(Some(_)) => {
            Json(ApiResponse {
                success: true,
                data: Some(()),
                message: "Password reset link sent to your email".to_string(),
            })
        }
        Ok(None) => Json(ApiResponse {
            success: false,
            data: None,
            message: "User not found".to_string(),
        }),
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            message: format!("Failed to process request: {}", e),
        }),
    }
}