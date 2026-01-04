# 用户权限系统

LLM Link 提供了完整的企业级用户权限管理系统（RBAC - Role-Based Access Control），用于管理管理后台的访问权限和用户对提供商实例的访问控制。

## 🎯 系统概述

用户权限系统由三个核心组件构成：

```
User (用户) ←→ Role (角色) ←→ Permissions (权限)
    ↓
User-Instance Grant (实例授权) ←→ Provider Instance (提供商实例)
    ↓
ApiKey (API密钥) - 用于数据平面访问
```

### 核心概念

- **用户 (User)**: 管理后台的登录账号，用于访问 Admin 界面
- **角色 (Role)**: 定义权限集合，决定用户可以执行的操作
- **实例授权 (User-Instance Grant)**: 将用户关联到特定的提供商实例
- **API密钥 (API Key)**: 用于数据平面访问的认证凭证，支持速率限制

## 📊 数据模型

### 1. 角色 (Roles)

系统提供两种角色：

| 角色 ID | 角色名称 | 权限范围 | 说明 |
|---------|----------|----------|------|
| `admin` | Administrator | `["provider:*", "user:*", "api_key:*", "instance:grant"]` | 管理员，可管理提供商、用户、API密钥和实例授权 |
| `user` | User | `["instance:view_granted", "api_key:view_granted"]` | 普通用户，只能查看被授权的实例和API密钥 |

**数据库结构**：
```sql
CREATE TABLE roles (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    permissions TEXT NOT NULL,  -- JSON数组
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2. 用户 (Users)

用户表存储管理后台的登录账号信息：

```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role_id VARCHAR(50) REFERENCES roles(id),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**字段说明**：
- `username`: 登录用户名，全局唯一
- `password_hash`: 密码的哈希值（不存储明文密码）
- `role_id`: 关联的角色ID（`admin` 或 `user`）
- `status`: 账号状态（`active` 或 `inactive`）

### 3. 用户-实例授权 (User-Instance Grants)

用于控制普通用户可以访问哪些提供商实例：

```sql
CREATE TABLE user_instances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider_id INTEGER NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    granted_by INTEGER REFERENCES users(id),
    UNIQUE(user_id, provider_id)
);
```

**字段说明**：
- `user_id`: 被授权的用户ID
- `provider_id`: 授权访问的提供商实例ID
- `granted_at`: 授权时间
- `granted_by`: 执行授权操作的管理员ID

### 4. API密钥 (API Keys)

API密钥用于数据平面（LLM API调用）的访问控制：

```sql
CREATE TABLE api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id INTEGER REFERENCES users(id),
    key_hash VARCHAR(128) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    scope VARCHAR(20) DEFAULT 'global',
    provider_id INTEGER REFERENCES providers(id),
    qps_limit REAL DEFAULT 10.0,
    concurrency_limit INTEGER DEFAULT 5,
    status VARCHAR(20) DEFAULT 'active',
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🔐 权限模型

### 角色权限详解

**Administrator (admin)**
```json
["provider:*", "user:*", "api_key:*", "instance:grant"]
```
- ✅ 创建、修改、删除提供商实例
- ✅ 创建、管理用户账号
- ✅ 为用户授权访问特定实例
- ✅ 管理所有API密钥
- ✅ 查看所有系统资源

**User (user)**
```json
["instance:view_granted", "api_key:view_granted"]
```
- ✅ 查看被授权的提供商实例
- ✅ 查看自己的API密钥
- ❌ 不能创建或修改提供商实例
- ❌ 不能管理其他用户
- ❌ 只能看到管理员授权给自己的资源

### 访问控制流程

1. **管理员创建用户**
   ```
   Admin → 创建 User (role='user')
   ```

2. **管理员授权实例访问**
   ```
   Admin → 授权 Instance #1 给 User A
   Admin → 授权 Instance #2 给 User A
   ```

3. **用户只能看到被授权的实例**
   ```
   User A 登录 → 只能看到 Instance #1 和 #2
   User B 登录 → 只能看到被授权给他的实例
   ```

## 🚀 使用指南

### 1. 用户管理（管理员）

#### 创建用户

1. 访问管理后台的 **Users** 页面
2. 点击 **+ Create User** 按钮
3. 填写用户信息：
   - **Username**: 用户名
   - **Password**: 密码
   - **Role**: 选择 `Admin` 或 `User`
4. 点击 **Confirm** 创建用户

**API方式**：
```bash
curl -X POST http://localhost:8088/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_dev",
    "password_hash": "hashed_password",
    "role_id": "user"
  }'
```

#### 授权实例访问（仅限普通用户）

1. 在用户列表中，找到目标用户
2. 点击用户行中的 **Server** 图标按钮
3. 在弹出的对话框中：
   - 从下拉列表选择要授权的实例
   - 点击 **Grant** 授权
4. 查看已授权的实例列表
5. 可以点击 **Trash** 图标撤销授权

**API方式**：
```bash
# 授权实例访问
curl -X POST http://localhost:8088/api/users/5/instances \
  -H "Content-Type: application/json" \
  -d '{
    "provider_id": 10
  }'

# 撤销实例访问
curl -X DELETE http://localhost:8088/api/users/5/instances/10

# 查看用户的所有授权
curl http://localhost:8088/api/users/5/instances
```

### 2. 用户视图（普通用户）

普通用户登录后：

**可以访问**：
- ✅ Dashboard（仅显示被授权的实例统计）
- ✅ Instances（仅显示被授权的实例列表）
- ✅ API Keys（仅显示自己创建的密钥）

**无法访问**：
- ❌ Users 管理页面
- ❌ 未被授权的实例
- ❌ 其他用户的资源

### 3. API密钥管理

#### 创建API密钥

访问管理后台的 **API Keys** 页面：

1. 点击 **+ Create Key** 按钮
2. 填写密钥信息：
   - **Name**: 密钥名称（如 "Production Key"）
   - **Scope**: 选择 `global` 或 `instance`
   - **QPS Limit**: 每秒请求数限制（默认10）
   - **Concurrency Limit**: 并发请求数限制（默认5）
3. 创建成功后，系统显示完整的API密钥（格式：`llmlink_xxxxxxxxxxxx`）
4. **重要**: 密钥只显示一次，请立即保存

#### API方式创建

```bash
curl -X POST http://localhost:8088/api/api-keys \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer admin-token" \
  -d '{
    "name": "My Production Key",
    "scope": "global",
    "qps_limit": 50.0,
    "concurrency_limit": 10
  }'
```

响应示例：
```json
{
  "success": true,
  "data": {
    "id": 1,
    "full_key": "llmlink_abc123def456...",
    "name": "My Production Key",
    "scope": "global",
    "qps_limit": 50.0,
    "concurrency_limit": 10
  },
  "message": "API key created successfully"
}
```

#### 使用API密钥

将API密钥添加到请求头中：

```bash
# OpenAI兼容接口
curl http://localhost:8088/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer llmlink_abc123def456..." \
  -d '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Hello"}]
  }'

# Ollama接口
curl http://localhost:11434/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer llmlink_abc123def456..." \
  -d '{
    "model": "llama2",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

#### API密钥作用域

**Global Scope (全局作用域)**
```json
{
  "scope": "global",
  "provider_id": null
}
```
- 可以访问所有启用的提供商
- 适合开发环境或内部使用
- 提供最大的灵活性

**Instance Scope (实例作用域)**
```json
{
  "scope": "instance",
  "provider_id": 5
}
```
- 只能访问指定的提供商实例
- 适合多租户场景
- 提供更精细的权限控制

### 3. 速率限制

API密钥支持两种速率限制：

#### QPS限制（每秒请求数）

```json
{
  "qps_limit": 10.0
}
```
- 限制每秒最大请求数
- 超过限制返回 `429 Too Many Requests`
- 使用令牌桶算法实现

#### 并发限制

```json
{
  "concurrency_limit": 5
}
```
- 限制同时进行的请求数
- 超过限制返回 `429 Too Many Requests`
- 流式请求占用并发槽位直到完成

#### 速率限制响应

当超过速率限制时：
```json
{
  "error": {
    "message": "Rate limit exceeded",
    "type": "rate_limit_error",
    "code": "rate_limit_exceeded"
  }
}
```

## 🔧 高级配置

### 1. 自定义角色

创建自定义角色（需要超级管理员权限）：

```sql
INSERT INTO roles (id, name, permissions) VALUES 
('data_analyst', 'Data Analyst', '["audit:view", "provider:view"]');
```

### 2. 密钥过期策略

创建有过期时间的API密钥：

```bash
curl -X POST http://localhost:8088/api/api-keys \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Temporary Key",
    "scope": "global",
    "qps_limit": 10.0,
    "concurrency_limit": 5,
    "expires_at": "2025-12-31T23:59:59Z"
  }'
```

系统会自动拒绝过期的密钥：
- 检查 `expires_at` 字段
- 过期后返回 `401 Unauthorized`

### 3. 密钥轮换

最佳实践：定期轮换API密钥

1. 创建新的API密钥
2. 更新应用程序配置
3. 验证新密钥工作正常
4. 删除旧密钥

```bash
# 创建新密钥
NEW_KEY=$(curl -X POST http://localhost:8088/api/api-keys ...)

# 测试新密钥
curl -H "Authorization: Bearer $NEW_KEY" ...

# 删除旧密钥
curl -X DELETE http://localhost:8088/api/api-keys/:old_id
```

## 🛡️ 安全最佳实践

### 1. 密码管理

- ✅ 使用强密码（至少12位，包含大小写、数字、特殊字符）
- ✅ 密码使用安全哈希算法存储（bcrypt/argon2）
- ✅ 定期更换管理员密码
- ❌ 不要在代码或配置文件中硬编码密码

### 2. API密钥管理

- ✅ 使用环境变量存储API密钥
- ✅ 为不同环境使用不同的密钥（开发/测试/生产）
- ✅ 设置合理的QPS和并发限制
- ✅ 定期审计密钥使用情况
- ✅ 及时删除不再使用的密钥
- ❌ 不要在客户端代码中暴露API密钥
- ❌ 不要提交密钥到版本控制系统

### 3. 权限控制

- ✅ 遵循最小权限原则
- ✅ 使用 `instance` scope 限制密钥访问范围
- ✅ 为临时访问设置过期时间
- ✅ 定期审查用户权限
- ❌ 不要给所有用户超级管理员权限

### 4. 审计和监控

- ✅ 记录所有管理操作
- ✅ 监控API密钥使用情况
- ✅ 设置异常访问告警
- ✅ 定期检查日志

## 📝 API参考

### 用户管理API

```bash
# 列出所有用户
GET /api/users

# 创建用户
POST /api/users
{
  "username": "string",
  "password_hash": "string",
  "role_id": "string"
}

# 切换用户状态
POST /api/users/:id/toggle

# 删除用户
DELETE /api/users/:id
```

### API密钥管理API

```bash
# 列出所有API密钥
GET /api/api-keys

# 创建API密钥
POST /api/api-keys
{
  "name": "string",
  "scope": "global|instance",
  "provider_id": number|null,
  "qps_limit": number,
  "concurrency_limit": number,
  "expires_at": "ISO8601|null"
}

# 切换密钥状态
POST /api/api-keys/:id/toggle

# 删除密钥
DELETE /api/api-keys/:id
```

## 🔍 故障排查

### 问题：API密钥认证失败

**现象**：
```json
{
  "error": {
    "message": "Invalid API key",
    "type": "invalid_request_error"
  }
}
```

**解决方案**：
1. 检查密钥格式是否正确（应以 `llmlink_` 开头）
2. 验证密钥状态是否为 `active`
3. 检查密钥是否已过期
4. 确认 `Authorization` 头格式：`Bearer llmlink_xxx`

### 问题：超过速率限制

**现象**：
```json
{
  "error": {
    "message": "Rate limit exceeded",
    "type": "rate_limit_error"
  }
}
```

**解决方案**：
1. 检查当前QPS限制设置
2. 实现客户端请求队列和重试逻辑
3. 联系管理员提高QPS限制
4. 考虑使用多个API密钥分散负载

### 问题：无法访问特定提供商

**现象**：
```json
{
  "error": {
    "message": "Access denied to provider",
    "type": "permission_error"
  }
}
```

**解决方案**：
1. 检查API密钥的 `scope` 设置
2. 如果是 `instance` scope，验证 `provider_id` 是否正确
3. 确认目标提供商实例是否启用
4. 联系管理员调整密钥权限

## 📚 相关文档

- [配置指南](CONFIGURATION.md) - 系统配置选项
- [快速开始](QUICK_START.md) - 快速上手指南
- [架构文档](../development/ARCHITECTURE.md) - 系统架构设计
- [主 README](../../README.md) - 项目概览

---

**通过完善的权限管理，保障您的 LLM 服务安全可靠！** 🔐