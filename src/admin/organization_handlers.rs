use axum::Json;
use serde::Deserialize;

use super::ApiResponse;
use crate::admin::auth_middleware::AdminUserContext;
use crate::db::DatabasePool;

pub async fn list_organizations_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
    axum::extract::Extension(ctx): axum::extract::Extension<AdminUserContext>,
) -> Json<ApiResponse<Vec<crate::db::Organization>>> {
    match db_pool.list_organizations().await {
        Ok(orgs) => {
            let filtered = if ctx.is_admin {
                orgs
            } else {
                orgs.into_iter().filter(|o| o.id == ctx.org_id).collect()
            };

            Json(ApiResponse {
                success: true,
                data: Some(filtered),
                message: "Organizations retrieved".to_string(),
            })
        }
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            message: format!("Failed to list organizations: {}", e),
        }),
    }
}

#[derive(Debug, Deserialize)]
pub struct CreateOrganizationRequest {
    pub name: String,
}

pub async fn create_organization_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
    axum::extract::Extension(ctx): axum::extract::Extension<AdminUserContext>,
    Json(req): Json<CreateOrganizationRequest>,
) -> Json<ApiResponse<crate::db::Organization>> {
    if !ctx.is_admin {
        return Json(ApiResponse {
            success: false,
            data: None,
            message: "Admin privileges required".to_string(),
        });
    }

    if req.name.trim().is_empty() {
        return Json(ApiResponse {
            success: false,
            data: None,
            message: "name is required".to_string(),
        });
    }

    match db_pool
        .create_organization(req.name.trim(), Some(ctx.user.id))
        .await
    {
        Ok(id) => match db_pool.list_organizations().await {
            Ok(orgs) => {
                let org = orgs.into_iter().find(|o| o.id == id);
                match org {
                    Some(o) => Json(ApiResponse {
                        success: true,
                        data: Some(o),
                        message: "Organization created".to_string(),
                    }),
                    None => Json(ApiResponse {
                        success: false,
                        data: None,
                        message: "Organization created but cannot be retrieved".to_string(),
                    }),
                }
            }
            Err(e) => Json(ApiResponse {
                success: false,
                data: None,
                message: format!("Organization created but failed to retrieve: {}", e),
            }),
        },
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            message: format!("Failed to create organization: {}", e),
        }),
    }
}

#[derive(Debug, Deserialize)]
pub struct UpdateOrganizationRequest {
    pub name: String,
}

pub async fn update_organization_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
    axum::extract::Extension(ctx): axum::extract::Extension<AdminUserContext>,
    axum::extract::Path(id): axum::extract::Path<i64>,
    Json(req): Json<UpdateOrganizationRequest>,
) -> Json<ApiResponse<crate::db::Organization>> {
    if !ctx.is_admin {
        return Json(ApiResponse {
            success: false,
            data: None,
            message: "Admin privileges required".to_string(),
        });
    }

    if req.name.trim().is_empty() {
        return Json(ApiResponse {
            success: false,
            data: None,
            message: "name is required".to_string(),
        });
    }

    match db_pool.update_organization(id, req.name.trim()).await {
        Ok(true) => match db_pool.list_organizations().await {
            Ok(orgs) => {
                let org = orgs.into_iter().find(|o| o.id == id);
                match org {
                    Some(o) => Json(ApiResponse {
                        success: true,
                        data: Some(o),
                        message: "Organization updated".to_string(),
                    }),
                    None => Json(ApiResponse {
                        success: false,
                        data: None,
                        message: "Organization updated but cannot be retrieved".to_string(),
                    }),
                }
            }
            Err(e) => Json(ApiResponse {
                success: false,
                data: None,
                message: format!("Organization updated but failed to retrieve: {}", e),
            }),
        },
        Ok(false) => Json(ApiResponse {
            success: false,
            data: None,
            message: "Organization not found".to_string(),
        }),
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            message: format!("Failed to update organization: {}", e),
        }),
    }
}

pub async fn delete_organization_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
    axum::extract::Extension(ctx): axum::extract::Extension<AdminUserContext>,
    axum::extract::Path(id): axum::extract::Path<i64>,
) -> Json<ApiResponse<()>> {
    if !ctx.is_admin {
        return Json(ApiResponse {
            success: false,
            data: None,
            message: "Admin privileges required".to_string(),
        });
    }

    match db_pool.delete_organization(id).await {
        Ok(true) => Json(ApiResponse {
            success: true,
            data: Some(()),
            message: "Organization deleted".to_string(),
        }),
        Ok(false) => Json(ApiResponse {
            success: false,
            data: None,
            message: "Organization not found".to_string(),
        }),
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            message: format!("Failed to delete organization: {}", e),
        }),
    }
}
