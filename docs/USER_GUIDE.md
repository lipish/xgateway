# 用户指南

本文档面向使用者与交付人员，覆盖：快速上手、调用方式、模型与服务的概念、鉴权与权限、常见客户端（Zed）接入。

## 1. 快速上手（最小闭环）

### 1.1 前置条件

需要一个可用的 PostgreSQL，并设置 `DATABASE_URL`。

### 1.2 启动服务

在项目根目录启动：

```bash
export DATABASE_URL="postgres://..."
export PORT=3000
cargo run --release
```

启动后常用入口：

- 数据面（OpenAI 兼容）：`http://localhost:3000/v1/chat/completions`
- 管理面（Admin API）：`http://localhost:3000/api/*`
- 健康检查：`http://localhost:3000/health`

### 1.3 通过管理后台完成“可调用”配置

第一次使用建议按顺序完成：

- 在管理后台创建/导入 Provider（上游模型服务实例）
- 创建 Service（对外服务，`service_id`）并绑定多个 Provider
- 创建 API Key 并授权可访问的 Service

## 2. 调用方式（OpenAI 兼容）

### 2.1 核心约束：请求必须提供 `service_id`

当前实现要求请求体中显式携带 `service_id`，用于稳定路由与治理。

### 2.2 curl 示例

```bash
curl -sS http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_API_KEY>" \
  -d '{
    "service_id": "demo-service",
    "model": "gpt-4o-mini",
    "messages": [
      {"role": "user", "content": "你好"}
    ]
  }'
```

流式（SSE）：

```bash
curl -N http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_API_KEY>" \
  -d '{
    "service_id": "demo-service",
    "model": "gpt-4o-mini",
    "stream": true,
    "messages": [
      {"role": "user", "content": "给我一个简短总结"}
    ]
  }'
```

## 3. 概念说明（面向使用与交付）

- Service：对外稳定调用目标（`service_id`），可绑定多个 Provider，并配置调度策略、兜底链路与服务级限流。
- Provider：实际被调用的上游模型服务实例（含 base_url、api_key、model/endpoint、优先级、价格、配额等）。
- API Key：调用方凭证，用于鉴权与授权（能否访问某些 service）。

## 4. 支持的 Provider（概览）

项目支持多种上游类型（以实际实现与管理后台为准），常见包括：OpenAI、Anthropic、Ollama、智谱、阿里云、火山引擎、腾讯、Moonshot、MiniMax、Longcat、DeepSeek 等。

建议把“真实可用的 provider/model 列表”视为运行时数据：由管理后台配置并以 `/v1/models` 输出为准。

## 5. 配置与环境变量（当前实现口径）

本项目的运行时配置主要来自：

- 环境变量：例如 `DATABASE_URL`、`PORT`、`XGATEWAY_LOG_LEVEL`
- 管理后台（数据库持久化）：Provider、Service、API Key、授权关系、服务限流与调度策略

不建议以“本地 YAML 配置文件”作为权威配置入口；如果你需要交付脚本化初始化，请使用迁移 SQL 或管理 API 做配置写入。

## 6. 权限与访问控制（简述）

系统同时包含：

- 管理面权限：用于控制谁可以登录管理后台、管理哪些资源（用户/角色/权限）。
- 数据面访问控制：通过 API Key + Service 授权控制调用方可访问哪些 `service_id`。

如果你在多租户场景下使用，建议把授权关系维护在 Service 维度（key -> service），并通过 Service 的限流参数实现租户隔离。

## 7. Zed IDE 接入（Ollama 协议）

Zed 可通过 Ollama 协议接入（用于开发体验）。基本思路是：

- 启动 xgateway 并启用 Ollama 兼容端点
- 在 Zed 设置中配置 `api_url` 指向 xgateway 的 Ollama endpoint

具体以你的部署端口为准，常见示例：

```json
{
  "language_models": {
    "ollama": {
      "api_url": "http://localhost:11434"
    }
  }
}
```

如果你仅使用 OpenAI 兼容 `/v1` 入口（service_id 模式），则 Zed 集成不在必需路径内。
