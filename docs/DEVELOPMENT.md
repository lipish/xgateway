# 开发与运维说明

本文档面向开发与运维，覆盖：系统架构、核心链路、调度与限流、目录结构（口径）、发布与交付注意事项。

## 1. 架构概览

LLM Link / XGateway 提供统一协议入口（OpenAI 兼容为主），内部基于 `service_id` 将请求路由到多个 Provider（上游实例），并在入口处完成鉴权、授权、服务级流控、调度、故障切换与观测。

关键入口：

- 数据面：`POST /v1/chat/completions`
- 管理面：`/api/*`

## 2. 核心数据模型（概念口径）

- Service：对外稳定调用目标，包含策略、fallback chain、服务级限流/排队配置。
- Provider：上游模型服务实例。
- API Key：数据面鉴权与授权的载体。

关键关系（数据库层面）：

- Service -> Provider：一对多（service 绑定多个 provider 作为候选池）
- API Key -> Service：多对多（key 被授权后才能访问某些 service）

## 3. 核心请求链路（`/v1/chat/completions`）

实现权威入口：`src/endpoints/chat.rs::handle_chat_completions`。

主要步骤：

1) API Key 校验与授权（能否访问 service）

2) Service 读取与服务级限流/排队/并发控制（系统保护，典型返回 503）

3) 查询 service 绑定的 provider 候选集合

4) 按 service 策略在候选集合内选路（负载均衡）

5) 转发到上游 provider，并记录日志/指标；失败时在候选池内或按 fallback chain 尝试兜底

## 4. 调度策略（实现口径）

支持的策略枚举在 `src/pool/load_balancer.rs`，并由 service 的 `strategy` 字段驱动。

当前主链路映射的策略包括：

- RoundRobin
- LeastConnections
- Random
- Priority
- LatencyBased
- LowestPrice
- QuotaAware

## 5. 限流与有界排队（实现口径）

运行时流控由 `PoolManager` 驱动并在 `RateLimiter` 内落地，核心是：

- Service 维度：QPS + 并发上限 + 有界队列（最大排队数、最大等待时间）
- API Key 维度：QPS + 并发上限（多租户公平性）

## 6. 健康检查与故障处理（实现口径）

- 健康检查：后台周期性探测 provider，可用性与延迟影响调度候选集合。
- 故障处理：请求失败后可在同一 service 的其它 provider 中重试/切换；必要时按 service 的 fallback chain 进入备用 service。

## 7. 代码导航（现状口径）

建议按职责理解代码：

- 路由组装：`src/router/*`
- 数据面 endpoints：`src/endpoints/*`
- 管理面：`src/admin/*`
- Provider 池与策略：`src/pool/*`
- 上游请求适配：`src/adapter/*`
- DB：`src/db/*`

## 8. 发布与版本管理

如果你需要发布到 crates.io，参考发布流程与注意事项请统一看本文档末尾“发布流程”章节，避免维护多份重复清单。

### 8.1 发布流程（简版）

发布前建议完成：

- `cargo test`
- `cargo fmt`、`cargo clippy`
- 更新 `Cargo.toml` 版本与 `CHANGELOG.md`

发布操作：

- `cargo publish --dry-run`
- `cargo publish`

注意：crates.io 发布不可撤销，只能 yank。

## 9. 文档维护约束

- `docs/` 目录保持扁平化，最多 5 个文件。
- 面向客户的产品口径放在 `docs/xgateway.md`。
