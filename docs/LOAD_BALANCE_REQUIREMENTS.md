# LLM-Link 负载均衡与高可用需求分析

## 需求概述

需要在 llm-link 中实现：负载均衡、流量统计与限流、可用性检测、模型故障时的切换降级。

## 现状分析

llm-link 已在 `src/pool` 模块中具备大部分基础实现，但当前这些模块尚未完全集成到主请求链路中。

### 已实现的模块

| 模块 | 文件 | 功能 |
|------|------|------|
| 健康检查 | `pool/health.rs` | 连续成功/失败计数、延迟监控、健康状态判定 |
| 负载均衡 | `pool/load_balancer.rs` | RoundRobin、LeastConnections、WeightedRoundRobin、Random、Priority、LatencyBased |
| 熔断器 | `pool/circuit_breaker.rs` | Closed → Open → HalfOpen 状态机 |
| 故障转移 | `pool/failover.rs` | 重试条件、退避策略、Fallback 链 |
| 指标采集 | `pool/metrics.rs` | 请求计数、延迟统计(avg/p50/p95/p99)、token 用量、RPS |
| 服务编排 | `pool/service.rs` | MultiProviderService 整合上述模块 |

### 差距分析

1. **负载均衡** - 策略已实现，但主请求路径 (`main.rs::handle_chat_completions`) 未调用 pool 模块的选择逻辑
2. **流量统计** - metrics 模块已有采集能力，但缺少持久化和 API 暴露
3. **限流** - 未实现，需新增 rate limiter
4. **可用性检测** - 健康检查逻辑已有，缺少定时探活和主动 probe
5. **故障降级** - failover 模块已实现 fallback chain，但未在请求路径中使用

---

## 实现方案

### 1. 负载均衡

**目标**：多 provider 配置时，按策略分发请求

**方案**：
- 在 `handle_chat_completions` 中调用 `MultiProviderService::select_provider()` 选择 provider
- 支持通过 Admin API 或配置文件设置负载策略
- 初始可使用 RoundRobin，后续可切换为 LatencyBased

**工作量**：约 2 天

### 2. 流量统计

**目标**：记录每个 provider 的请求量、成功率、延迟分布、token 消耗

**方案**：
- 在请求前后调用 `metrics.record_request_start/end`
- 新增 Admin API `/api/metrics` 返回各 provider 指标
- 可选：定时写入 PostgreSQL 实现历史查询

**工作量**：约 1 天

### 3. 限流

**目标**：防止单 provider 被过载，支持全局和 per-provider 限流

**方案**：
- 新增 `src/pool/rate_limiter.rs`，实现令牌桶或滑动窗口算法
- 配置项：`max_requests_per_second`、`max_concurrent_requests`
- 超限时返回 429 或等待队列

**工作量**：约 2 天

### 4. 可用性检测

**目标**：自动发现不可用 provider，标记为 Unhealthy

**方案**：
- 新增后台任务，定时对每个 provider 发送 probe 请求（如 `/v1/models`）
- 配置项：`health_check_interval`、`unhealthy_threshold`
- 连续失败达阈值时标记为 Unhealthy，从负载池移除

**工作量**：约 1.5 天

### 5. 故障降级

**目标**：主 provider 故障时自动切换到备用 provider

**方案**：
- 请求失败时调用 `failover_manager.find_fallback()` 获取备用 provider
- 根据 `should_retry()` 和退避策略决定是否重试
- 支持配置 fallback chain：`provider_a -> provider_b -> provider_c`
- 降级日志记录，方便排查

**工作量**：约 2 天

---

## 整合步骤

1. 修改 `main.rs::handle_chat_completions`，引入 `MultiProviderService`
2. 请求开始时调用 `select_provider()` 选择 provider
3. 请求结束时记录 metrics 和健康状态
4. 失败时触发 failover 逻辑
5. 新增限流中间件
6. 启动健康检查后台任务
7. 新增 Admin API 暴露状态和指标

---

## 预计总工作量

| 模块 | 工作量 |
|------|--------|
| 负载均衡整合 | 2 天 |
| 流量统计 API | 1 天 |
| 限流实现 | 2 天 |
| 可用性检测 | 1.5 天 |
| 故障降级整合 | 2 天 |
| 测试与调优 | 2 天 |
| **合计** | **10.5 天** |

---

## 配置示例

```yaml
pool:
  load_balance_strategy: round_robin  # round_robin | least_connections | latency_based | priority
  health_check:
    interval_secs: 30
    unhealthy_threshold: 3
    healthy_threshold: 2
  rate_limit:
    global_rps: 100
    per_provider_rps: 50
    max_concurrent: 20
  failover:
    enable: true
    max_retries: 3
    backoff: exponential
    fallback_chain:
      openai: [zhipu, volcengine]
      zhipu: [openai, aliyun]
```

---

## 优先级建议

1. **P0 - 必需**：故障降级（保证服务可用性）
2. **P0 - 必需**：可用性检测（故障降级的前提）
3. **P1 - 高**：负载均衡整合（多 provider 场景必需）
4. **P1 - 高**：流量统计（可观测性基础）
5. **P2 - 中**：限流（防护性功能）

