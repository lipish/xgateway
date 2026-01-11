# LLM-Link 调度与负载均衡策略详解

本文介绍 LLM-Link 网关在 **请求唯一指定 `service_id`** 前提下的核心调度机制，包括权限校验、负载均衡策略、健康检查、熔断保护及故障切换。

---

## 1. 概念与数据模型

本项目中存在三类核心对象：

Service（逻辑服务）：对外暴露的稳定目标，请求必须且只能指定 `service_id`。

Model Service（模型服务实例）：实际发请求的上游连接配置，对应数据库的 `providers` 表记录（不强制改表名，但语义上把它当作模型服务实例）。

API Key：调用方身份与权限载体。

推荐的绑定关系：

API Key -> Service：多对多（授权关系，决定某个 key 能否访问某个 service）。

Service -> Model Service：一对多（一个 service 下挂多个模型服务实例，调度在该候选集合内发生）。

---

## 2. 核心架构概述

LLM-Link 的调度层由 `PoolManager` 统一管理，其内部整合了四个核心组件：

LoadBalancer（负载均衡器）：在同一个 `service_id` 绑定的多个健康模型服务实例之间选择最优节点。

HealthChecker（健康检查器）：实时监控每个模型服务实例的存活状态和延迟。

CircuitBreaker（熔断器）：对每个模型服务实例实施自保护，避免持续向故障上游发送流量。

FailoverManager（故障切换器）：请求失败后的重试及备用节点切换逻辑。

---

## 3. 请求流转与权限校验（service_id 唯一指定）

建议把数据面执行顺序固定为：

1) 解析并校验 API Key（key 是否存在、是否 active、限流/并发等）。

2) 解析 `service_id`（请求必须显式携带）。

3) 校验授权关系：API Key 是否允许访问该 `service_id`（scope=global 可放行；否则必须存在 key->service 的授权）。

4) 校验 Service 是否启用（`service.enabled = true` 才允许进入调度）。

5) 获取该 Service 绑定的候选模型服务实例集合（即 providers 集合）。

6) 过滤候选实例：

过滤 `provider.enabled = false` 的实例。

过滤 HealthChecker/CircuitBreaker 判定为不可用的实例。

7) 在剩余实例中按该 Service 的负载均衡策略选择一个执行；若失败，再进入 Failover/Retry。

---

## 4. 负载均衡策略（在 Service 的候选实例集合内）

负载均衡策略不再以“全局模型服务”为选择范围，而是严格限定在某个 `service_id` 绑定的候选实例集合内。

基础分配类：

RoundRobin（轮询）：按顺序循环分配。

Random（随机）：完全随机选择。

Priority（优先级）：始终选择 `priority` 最高的实例；高优先级不健康时才降级。

性能导向类：

LeastConnections（最少连接）：基于当前活跃连接数选择。

LatencyBased（延迟导向）：基于过去一段时间的平均响应时间动态选择。

成本与配额类：

WeightedRoundRobin（加权轮询）：根据手动设置的权重比例分配流量。

LowestPrice（最低单价优先）：比较输入 Token 单价（如 `input_price`），选择成本最低实例。

QuotaAware（配额感知）：过滤 `tokens_used >= quota_limit` 的实例；若全部耗尽，回退到纯单价/权重策略。

---

## 5. 健康检查机制（Health Management）

HealthChecker 后台任务会周期性执行以下逻辑：

主动探测：定期请求模型服务实例的 `/v1/models` 接口（或进行 TCP 连接检查）。

状态流转：

Healthy：连续 N 次成功探测。

Degraded：响应变慢或偶尔超时。

Unhealthy：连续多次探测失败，实例会被暂时移出调度候选集。

指标收集：更新模型服务实例的平均延迟、当前 RPS 等数据，供负载均衡器参考。

---

## 6. 熔断与保护（Circuit Breaker）

每个模型服务实例都配备独立的熔断器：

Closed：正常通行。

Open：当错误率或连续失败次数超过阈值时开启，所有发往该实例的请求将被直接拦截。

Half-Open：经过恢复等待时间后，允许少量探测请求；成功则闭合，失败则重新开启。

---

## 7. 故障切换与重试（Failover & Retry）

当调度选中的实例执行失败时，FailoverManager 介入：

智能重试：满足网络超时、5xx 等条件时按指数退避进行原位重试。

备用切换：若重试失败，在同一 service 的其它健康实例中选择备用；也可按 service 配置的 `fallback_chain` 跳转到其它 service（可选扩展）。

---

## 8. 禁用语义（关键约束）

API Key 禁用：key 被禁用后所有请求直接拒绝。

Service 禁用：`service.enabled = false` 时，该 service 的所有请求直接拒绝。

Model Service（providers）禁用：`provider.enabled = false` 时实例必须从候选集中移除，从而对所有绑定该 service 的 key 立即生效。

---

## 9. 配置参考

Service 配置示例（逻辑层）：

```json
{
  "id": "deepseek-chat",
  "enabled": true,
  "strategy": "QuotaAware",
  "fallback_chain": ["deepseek-chat-backup", "openai-chat"]
}
```

Model Service（providers）配置示例（实例层，字段可来自表列或 config JSON）：

```json
{
  "api_key": "sk-...",
  "base_url": "https://api.deepseek.com",
  "priority": 10,
  "weight": 80,
  "input_price": 2.0,
  "output_price": 8.0,
  "quota_limit": 1000000
}
```
