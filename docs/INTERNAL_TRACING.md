# 内置追踪服务设计方案

## 问题分析

### 当前现状
- XGateway 使用 `xtrace-client` 发送追踪数据到外部 XTrace 服务
- 需要单独启动 XTrace 服务
- 两边启动可能不一致（版本、配置、可用性）

### 痛点
1. **部署复杂**：需要维护两个服务
2. **启动不一致**：XGateway 启动但 XTrace 未启动时，追踪功能不可用
3. **数据分散**：XGateway 和 XTrace 的数据在不同地方
4. **依赖外部服务**：XTrace 是外部依赖，版本控制和升级复杂

---

## 推荐方案：内置追踪存储（方案 A）

### 设计思路
- 利用现有的 PostgreSQL 数据库存储追踪数据
- 实现兼容 xtrace 的 API
- 在 Admin UI 中增加追踪查看页面
- 保持向后兼容：仍然支持外部 XTrace（可选）

### 架构

```
┌─────────────────────────────────────────────────────────┐
│                    XGateway                              │
│  ┌─────────────────────────────────────────────────┐   │
│  │            内置追踪服务 (可选)                   │   │
│  │  ┌───────────────────────────────────────────┐  │   │
│  │  │  追踪存储层 (PostgreSQL)                 │  │   │
│  │  │  - traces 表                             │  │   │
│  │  │  - observations 表                       │  │   │
│  │  └───────────────────────────────────────────┘  │   │
│  │  ┌───────────────────────────────────────────┐  │   │
│  │  │  兼容 xtrace 的 API                      │  │   │
│  │  │  - POST /v1/l/batch                      │  │   │
│  │  │  - 查询 API (GET /traces, etc.)         │  │   │
│  │  └───────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │         原有功能 (保持不变)                      │   │
│  │  - 数据面 API (/v1/chat/completions)         │   │
│  │  - 管理面 API (/api/*)                        │   │
│  │  - Admin UI                                    │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## 详细设计

### 1. 数据库表设计

#### traces 表
```sql
CREATE TABLE IF NOT EXISTS traces (
    id UUID PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    name VARCHAR(255),
    input JSONB,
    output JSONB,
    session_id UUID,
    release VARCHAR(255),
    version VARCHAR(255),
    user_id VARCHAR(255),
    metadata JSONB,
    tags TEXT[],
    public BOOLEAN DEFAULT false,
    environment VARCHAR(255),
    external_id VARCHAR(255),
    bookmarked BOOLEAN DEFAULT false,
    latency DOUBLE PRECISION,
    total_cost DOUBLE PRECISION,
    project_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_traces_timestamp ON traces(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_traces_project_id ON traces(project_id);
CREATE INDEX IF NOT EXISTS idx_traces_tags ON traces USING GIN(tags);
```

#### observations 表
```sql
CREATE TABLE IF NOT EXISTS observations (
    id UUID PRIMARY KEY,
    trace_id UUID NOT NULL REFERENCES traces(id) ON DELETE CASCADE,
    type VARCHAR(50),
    name VARCHAR(255),
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    completion_start_time TIMESTAMP WITH TIME ZONE,
    model VARCHAR(255),
    model_parameters JSONB,
    input JSONB,
    output JSONB,
    usage JSONB,
    level VARCHAR(50),
    status_message TEXT,
    parent_observation_id UUID,
    prompt_id VARCHAR(255),
    prompt_name VARCHAR(255),
    prompt_version VARCHAR(255),
    model_id VARCHAR(255),
    input_price DOUBLE PRECISION,
    output_price DOUBLE PRECISION,
    total_price DOUBLE PRECISION,
    calculated_input_cost DOUBLE PRECISION,
    calculated_output_cost DOUBLE PRECISION,
    calculated_total_cost DOUBLE PRECISION,
    latency DOUBLE PRECISION,
    time_to_first_token DOUBLE PRECISION,
    completion_tokens BIGINT,
    prompt_tokens BIGINT,
    total_tokens BIGINT,
    unit VARCHAR(50),
    metadata JSONB,
    environment VARCHAR(255),
    project_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_observations_trace_id ON observations(trace_id);
CREATE INDEX IF NOT EXISTS idx_observations_start_time ON observations(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_observations_model ON observations(model);
```

---

### 2. 配置

在 `config/xgateway.yaml` 中增加：

```yaml
# 内置追踪配置
tracing:
  # 模式：internal（内置）, external（外部 xtrace）, disabled
  mode: "internal"
  
  # 内置追踪配置
  internal:
    # 是否启用
    enabled: true
    # 数据保留天数
    retention_days: 30
    # 批量大小
    batch_size: 100
    # 队列大小
    queue_size: 10000
  
  # 外部 xtrace 配置（向后兼容）
  external:
    enabled: false
    base_url: "${XTRACE_BASE_URL}"
    auth_mode: "bearer"
    api_bearer_token: "${XTRACE_API_BEARER_TOKEN}"
```

---

### 3. API 设计

#### 兼容 xtrace 的 API（现有代码继续工作）
- `POST /v1/l/batch` - 批量摄入追踪数据

#### 新增查询 API（Admin UI 使用）
- `GET /api/traces` - 查询追踪列表
- `GET /api/traces/:id` - 获取单个追踪详情
- `GET /api/traces/:id/observations` - 获取追踪的 observations

---

### 4. Admin UI 新增页面
- `/traces` - 追踪列表页
- `/traces/:id` - 追踪详情页

---

## 实施方案

### Phase 1：基础数据库和存储层
- [ ] 创建数据库迁移脚本
- [ ] 实现内置追踪存储层
- [ ] 实现配置（支持 internal/external 模式）

### Phase 2：兼容 xtrace API
- [ ] 实现 `POST /v1/l/batch` 端点
- [ ] 保持向后兼容（仍然支持外部 xtrace）

### Phase 3：查询 API 和 Admin UI
- [ ] 实现查询 API
- [ ] 实现 Admin UI 追踪页面
- [ ] 实现数据清理（保留天数）

---

## 优势

1. **单一服务部署**：只需要启动 XGateway
2. **数据一致性**：追踪数据和业务数据在同一个数据库
3. **简化运维**：不需要管理两个服务
4. **向后兼容**：仍然支持外部 xtrace（可选）
5. **更好的集成**：在 Admin UI 中直接查看追踪

---

## 其他方案

### 方案 B：集成 xtrace 作为子模块
- 前提：xtrace 是开源的且易于集成
- 优点：功能完整
- 缺点：依赖 xtrace 的代码，维护复杂

### 方案 C：仅内存存储（不推荐）
- 优点：简单快速
- 缺点：重启后数据丢失，不适合生产环境

**推荐方案 A**：内置追踪存储 + 数据库持久化
