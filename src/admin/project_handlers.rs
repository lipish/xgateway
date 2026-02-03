use axum::Json;
use serde::Deserialize;

use crate::admin::auth_middleware::AdminUserContext;
use crate::db::DatabasePool;
use super::ApiResponse;

#[derive(Debug, Deserialize)]
pub struct ListProjectsQuery {
    pub org_id: Option<i64>,
}

pub async fn list_projects_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
    axum::extract::Query(q): axum::extract::Query<ListProjectsQuery>,
    axum::extract::Extension(ctx): axum::extract::Extension<AdminUserContext>,
) -> Json<ApiResponse<Vec<crate::db::Project>>> {
    let effective_org_id = if ctx.is_admin { q.org_id } else { Some(ctx.org_id) };
    match db_pool.list_projects(effective_org_id).await {
        Ok(projects) => Json(ApiResponse {
            success: true,
            data: Some(projects),
            message: "Projects retrieved".to_string(),
        }),
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            message: format!("Failed to list projects: {}", e),
        }),
    }
}

#[derive(Debug, Deserialize)]
pub struct CreateProjectRequest {
    pub org_id: i64,
    pub name: String,
}

pub async fn create_project_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
    axum::extract::Extension(ctx): axum::extract::Extension<AdminUserContext>,
    Json(req): Json<CreateProjectRequest>,
) -> Json<ApiResponse<crate::db::Project>> {
    if !ctx.is_admin && ctx.org_id != req.org_id {
        return Json(ApiResponse {
            success: false,
            data: None,
            message: "forbidden".to_string(),
        });
    }

    if req.name.trim().is_empty() {
        return Json(ApiResponse {
            success: false,
            data: None,
            message: "name is required".to_string(),
        });
    }

    match db_pool.create_project(req.org_id, req.name.trim()).await {
        Ok(id) => match db_pool.list_projects(Some(req.org_id)).await {
            Ok(projects) => {
                let project = projects.into_iter().find(|p| p.id == id);
                match project {
                    Some(p) => Json(ApiResponse {
                        success: true,
                        data: Some(p),
                        message: "Project created".to_string(),
                    }),
                    None => Json(ApiResponse {
                        success: false,
                        data: None,
                        message: "Project created but cannot be retrieved".to_string(),
                    }),
                }
            }
            Err(e) => Json(ApiResponse {
                success: false,
                data: None,
                message: format!("Project created but failed to retrieve: {}", e),
            }),
        },
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            message: format!("Failed to create project: {}", e),
        }),
    }
}

pub async fn delete_project_api(
    axum::extract::State(db_pool): axum::extract::State<DatabasePool>,
    axum::extract::Path(id): axum::extract::Path<i64>,
    axum::extract::Extension(ctx): axum::extract::Extension<AdminUserContext>,
) -> Json<ApiResponse<()>> {
    if !ctx.is_admin {
        if ctx.org_role.as_deref() != Some("admin") {
            return Json(ApiResponse {
                success: false,
                data: None,
                message: "org_admin_required".to_string(),
            });
        }
        match db_pool.get_project_by_id(id).await {
            Ok(Some(p)) => {
                if p.org_id != ctx.org_id {
                    return Json(ApiResponse {
                        success: false,
                        data: None,
                        message: "forbidden".to_string(),
                    });
                }
            }
            Ok(None) => {}
            Err(e) => {
                return Json(ApiResponse {
                    success: false,
                    data: None,
                    message: format!("Failed to check project: {}", e),
                });
            }
        }
    }

    match db_pool.delete_project(id).await {
        Ok(true) => Json(ApiResponse {
            success: true,
            data: Some(()),
            message: "Project deleted".to_string(),
        }),
        Ok(false) => Json(ApiResponse {
            success: false,
            data: None,
            message: "Project not found".to_string(),
        }),
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            message: format!("Failed to delete project: {}", e),
        }),
    }
}
