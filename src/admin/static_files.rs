use axum::{
    body::Body,
    extract::Request,
    http::{header, StatusCode},
    response::{IntoResponse, Response},
};
use std::path::Path;

/// Handle static files embedded in the binary
pub async fn static_file_handler(request: Request) -> impl IntoResponse {
    let path = request.uri().path();
    let path = path.trim_start_matches('/').trim_start_matches("static/");
    
    // Security check - prevent directory traversal
    if path.contains("..") || path.contains('\\') {
        return (StatusCode::FORBIDDEN, "Access denied").into_response();
    }
    
    // Map file extensions to MIME types
    let mime_type = match Path::new(path).extension().and_then(|ext| ext.to_str()) {
        Some("html") => "text/html",
        Some("css") => "text/css",
        Some("js") => "application/javascript",
        Some("png") => "image/png",
        Some("jpg") | Some("jpeg") => "image/jpeg",
        Some("svg") => "image/svg+xml",
        Some("ico") => "image/x-icon",
        _ => "application/octet-stream",
    };
    
    // Try to serve embedded file
    match get_embedded_file(path) {
        Some(content) => Response::builder()
            .status(StatusCode::OK)
            .header(header::CONTENT_TYPE, mime_type)
            .body(Body::from(content))
            .unwrap(),
        None => {
            // Return 404 for missing files
            Response::builder()
                .status(StatusCode::NOT_FOUND)
                .body(Body::from("File not found"))
                .unwrap()
        }
    }
}

/// Get embedded static file content
fn get_embedded_file(path: &str) -> Option<String> {
    match path {
        "setup.html" => Some(include_str!("../static/setup.html").to_string()),
        "admin.html" => Some(include_str!("../static/admin.html").to_string()),
        "style.css" => Some(include_str!("../static/style.css").to_string()),
        "app.js" => Some(include_str!("../static/app.js").to_string()),
        _ => None,
    }
}

/// Simple admin dashboard HTML (placeholder)
pub fn admin_dashboard_html() -> String {
    r#"
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>XGateway 管理界面</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        .header { background: #667eea; color: white; padding: 1rem 2rem; }
        .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
        .card { background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); padding: 1.5rem; margin-bottom: 1rem; }
        .btn { background: #667eea; color: white; padding: 0.5rem 1rem; border: none; border-radius: 4px; cursor: pointer; }
        .btn:hover { background: #5a6fd8; }
        .provider-list { margin-top: 1rem; }
        .provider-item { border: 1px solid #e1e5e9; border-radius: 4px; padding: 1rem; margin-bottom: 0.5rem; }
        .provider-item h3 { color: #333; margin-bottom: 0.5rem; }
        .provider-item p { color: #666; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="header">
        <h1> XGateway 管理界面</h1>
        <p>多 Provider AI 网关管理</p>
    </div>
    
    <div class="container">
        <div class="card">
            <h2>📊 概览</h2>
            <p>已配置的 Provider 数量：<span id="provider-count">加载中...</span></p>
            <button class="btn" onclick="loadProviders()">刷新</button>
        </div>
        
        <div class="card">
            <h2> Provider 管理</h2>
            <button class="btn" onclick="addProvider()">添加 Provider</button>
            <div id="provider-list" class="provider-list">
                <p>加载中...</p>
            </div>
        </div>
        
        <div class="card">
            <h2>📈 监控</h2>
            <p>API 端点：<code>http://localhost:8080</code></p>
            <p>管理端点：<code>http://localhost:8081</code></p>
        </div>
    </div>

    <script>
        async function loadProviders() {
            try {
                const response = await fetch('/api/instances');
                const result = await response.json();
                
                const listDiv = document.getElementById('provider-list');
                const countSpan = document.getElementById('provider-count');
                
                if (result.success && result.data) {
                    countSpan.textContent = result.data.length;
                    
                    if (result.data.length === 0) {
                        listDiv.innerHTML = '<p>暂无配置的 Provider</p>';
                    } else {
                        listDiv.innerHTML = result.data.map(provider => `
                            <div class="provider-item">
                                <h3>${provider.name} (${provider.provider_type})</h3>
                                <p>状态：${provider.enabled ? '启用' : '禁用'} | 优先级：${provider.priority}</p>
                                <p>创建时间：${new Date(provider.created_at).toLocaleString()}</p>
                            </div>
                        `).join('');
                    }
                } else {
                    listDiv.innerHTML = '<p>加载失败</p>';
                    countSpan.textContent = '0';
                }
            } catch (error) {
                console.error('Failed to load providers:', error);
                document.getElementById('provider-list').innerHTML = '<p>加载失败</p>';
                document.getElementById('provider-count').textContent = '0';
            }
        }
        
        function addProvider() {
            alert('添加 Provider 功能开发中...');
        }
        
        // Load providers on page load
        document.addEventListener('DOMContentLoaded', loadProviders);
    </script>
</body>
</html>
    "#.to_string()
}

/// Basic CSS for admin interface
pub fn admin_css() -> String {
    r#"
/* Basic admin styles */
body { 
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #f5f5f5;
    margin: 0;
    padding: 0;
}
.container { 
    max-width: 1200px; 
    margin: 0 auto; 
    padding: 20px; 
}
.card { 
    background: white; 
    border-radius: 8px; 
    box-shadow: 0 2px 4px rgba(0,0,0,0.1); 
    padding: 20px; 
    margin-bottom: 20px; 
}
.btn { 
    background: #667eea; 
    color: white; 
    padding: 10px 20px; 
    border: none; 
    border-radius: 4px; 
    cursor: pointer; 
    text-decoration: none;
    display: inline-block;
}
.btn:hover { 
    background: #5a6fd8; 
}
    "#.to_string()
}

/// Basic JavaScript for admin interface
pub fn admin_js() -> String {
    r#"
// Basic admin JavaScript
console.log('XGateway Admin Interface loaded');

// Helper function for API calls
async function apiCall(url, options = {}) {
    try {
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        return await response.json();
    } catch (error) {
        console.error('API call failed:', error);
        throw error;
    }
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'error' ? '#dc3545' : '#28a745'};
        color: white;
        border-radius: 4px;
        z-index: 1000;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}
    "#.to_string()
}
