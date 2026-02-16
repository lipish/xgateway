# 配置管理优化方案

## 当前配置管理现状分析

### 1. 配置来源现状

XGateway 当前配置分散在多个地方：

| 配置来源 | 存储内容 | 示例 |
|---------|---------|------|
| **环境变量** | 数据库连接、Provider API Keys、认证配置 | `DATABASE_URL`, `OPENAI_API_KEY`, `XGATEWAY_API_KEY` |
| **CLI 参数** | 应用模式、Provider、Model、端口等 | `--app zed`, `--port 3000`, `--api-key xxx` |
| **数据库 (config 表)** | 系统基础配置 | `setup_completed`, `version` |
| **数据库 (providers 表)** | Provider 实例配置 | API Key、Base URL、Model 等 |
| **数据库 (services 表)** | Service 配置 | 策略、限流、fallback chain 等 |
| **代码默认值** | Settings 结构体的 Default 实现 | `Settings::default()` |

### 2. 主要问题

#### 2.1 配置分散，难以管理
- 需要同时维护环境变量、CLI 参数和数据库配置
- 不同环境（开发/测试/生产）配置切换困难
- 缺乏统一的配置视图

#### 2.2 无热加载能力
- 配置修改后需要重启服务
- 影响可用性，特别是生产环境
- Provider 配置更新依赖 Admin API，但系统级配置不行

#### 2.3 无版本管理和回滚
- 配置变更历史不可追溯
- 出错后无法快速回滚到上一个版本
- 缺乏配置审计能力

#### 2.4 安全性不足
- 敏感信息（API Key）在环境变量和数据库中明文存储
- 缺乏密钥轮换机制
- 缺乏访问控制

---

## 优化方案设计

### 方案一：分层配置管理（推荐）

#### 架构设计

```
┌─────────────────────────────────────────────────────────┐
│                     配置加载层                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  配置文件     │  │  环境变量     │  │  CLI 参数     │ │
│  │ (YAML/TOML)  │  │   (覆盖)      │  │  (最高优先级) │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                   配置合并与验证层                        │
│              - 合并多个来源配置                           │
│              - Schema 验证                                │
│              - 默认值填充                                 │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                   配置存储与热加载层                      │
│  ┌───────────────────────────────────────────────────┐  │
│  │  ConfigManager (单例)                              │  │
│  │  - 内存缓存当前配置                                 │  │
│  │  - 配置版本管理                                     │  │
│  │  - 热加载订阅机制                                   │  │
│  │  - 变更通知                                         │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                   动态配置源 (可选)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   etcd       │  │   Consul     │  │   数据库      │ │
│  │  (远程配置)   │  │  (服务发现)   │  │  (业务配置)   │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
```

#### 1.1 配置文件结构

建议使用 YAML 格式（人类可读性好），文件位置：`config/xgateway.yaml`

```yaml
# config/xgateway.yaml
version: "1.0"

server:
  host: "0.0.0.0"
  port: 3000
  log_level: "info"
  graceful_shutdown_timeout: "30s"

database:
  url: "${DATABASE_URL}"
  max_connections: 20
  min_connections: 5
  connect_timeout: "5s"
  idle_timeout: "10m"

security:
  auth_key: "${XGATEWAY_AUTH_KEY}"
  api_key_expiry_days: 90
  ip_whitelist: []
  secrets_encryption_key: "${SECRETS_ENCRYPTION_KEY}"

metrics:
  enabled: true
  prometheus:
    enabled: true
    endpoint: "/metrics"
  tracing:
    enabled: "${XTRACE_ENABLED:false}"
    otlp_endpoint: "${OTLP_ENDPOINT}"

providers:
  # 预配置的 Provider 模板
  templates:
    - type: "openai"
      base_url: "https://api.openai.com/v1"
      default_model: "gpt-4o"
    - type: "anthropic"
      base_url: "https://api.anthropic.com"
      default_model: "claude-3-5-sonnet-20241022"

logging:
  format: "json"
  level: "info"
  file:
    enabled: false
    path: "/var/log/xgateway"
    rotation: "daily"

# 配置热加载
config_watch:
  enabled: true
  interval: "5s"
```

#### 1.2 配置优先级

优先级从高到低：
1. **CLI 参数**（最高优先级）
2. **环境变量**（覆盖配置文件）
3. **配置文件**（YAML/TOML）
4. **数据库配置**（业务层配置，如 Provider、Service）
5. **代码默认值**

#### 1.3 ConfigManager 设计

```rust
// src/config/mod.rs

use serde::{Deserialize, Serialize};
use std::sync::{Arc, RwLock};
use std::collections::HashMap;
use chrono::{DateTime, Utc};
use tokio::sync::broadcast;

/// 配置版本信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigVersion {
    pub version: String,
    pub created_at: DateTime<Utc>,
    pub created_by: Option<String>,
    pub change_log: Option<String>,
}

/// 配置变更事件
#[derive(Debug, Clone)]
pub enum ConfigChangeEvent {
    Updated { old_version: String, new_version: String },
    RolledBack { from_version: String, to_version: String },
}

/// 配置管理器
pub struct ConfigManager {
    current_config: Arc<RwLock<Config>>,
    versions: Arc<RwLock<Vec<ConfigVersion>>>,
    config_history: Arc<RwLock<HashMap<String, Config>>>,
    change_tx: broadcast::Sender<ConfigChangeEvent>,
    config_file_path: Option<String>,
}

impl ConfigManager {
    /// 创建新的配置管理器
    pub fn new() -> Self {
        let (change_tx, _) = broadcast::channel(100);
        Self {
            current_config: Arc::new(RwLock::new(Config::default())),
            versions: Arc::new(RwLock::new(Vec::new())),
            config_history: Arc::new(RwLock::new(HashMap::new())),
            change_tx,
            config_file_path: None,
        }
    }

    /// 从文件加载配置
    pub async fn load_from_file(&self, path: &str) -> anyhow::Result<()> {
        // 读取并解析 YAML 文件
        // 合并环境变量覆盖
        // 验证配置
        // 更新 current_config
        // 记录版本
        Ok(())
    }

    /// 获取当前配置
    pub fn get(&self) -> Config {
        self.current_config.read().unwrap().clone()
    }

    /// 更新配置
    pub async fn update(&self, new_config: Config, change_log: Option<String>) -> anyhow::Result<String> {
        // 验证新配置
        // 生成新版本号
        // 保存到历史
        // 原子更新 current_config
        // 发送变更通知
        Ok(new_version)
    }

    /// 回滚到指定版本
    pub async fn rollback(&self, version: &str) -> anyhow::Result<()> {
        // 从历史中查找版本
        // 执行回滚
        // 发送回滚通知
        Ok(())
    }

    /// 订阅配置变更
    pub fn subscribe(&self) -> broadcast::Receiver<ConfigChangeEvent> {
        self.change_tx.subscribe()
    }

    /// 启动配置文件监控（热加载）
    pub async fn start_watch(&self, path: &str, interval: std::time::Duration) {
        // 定期检查文件变化
        // 自动重新加载
    }
}

/// 主配置结构体
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    pub version: String,
    pub server: ServerConfig,
    pub database: DatabaseConfig,
    pub security: SecurityConfig,
    pub metrics: MetricsConfig,
    pub logging: LoggingConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerConfig {
    pub host: String,
    pub port: u16,
    pub log_level: String,
    pub graceful_shutdown_timeout: String,
}

// ... 其他配置结构体定义
```

#### 1.4 配置热加载实现

```rust
// src/config/watcher.rs

use notify::{Watcher, RecommendedWatcher, RecursiveMode, Result as NotifyResult};
use std::path::Path;
use tokio::sync::mpsc;

pub struct ConfigWatcher {
    watcher: RecommendedWatcher,
    rx: mpsc::Receiver<notify::Event>,
}

impl ConfigWatcher {
    pub fn new<P: AsRef<Path>>(path: P) -> NotifyResult<Self> {
        let (tx, rx) = mpsc::channel(100);
        
        let mut watcher = RecommendedWatcher::new(
            move |res: NotifyResult<notify::Event>| {
                let _ = tx.blocking_send(res.unwrap());
            },
            notify::Config::default(),
        )?;
        
        watcher.watch(path.as_ref(), RecursiveMode::NonRecursive)?;
        
        Ok(Self { watcher, rx })
    }

    pub async fn watch(&mut self, config_manager: Arc<ConfigManager>) {
        while let Some(event) = self.rx.recv().await {
            if event.kind.is_modify() {
                tracing::info!("Config file changed, reloading...");
                if let Err(e) = config_manager.load_from_file(&event.paths[0].to_string_lossy()).await {
                    tracing::error!("Failed to reload config: {}", e);
                }
            }
        }
    }
}
```

---

### 方案二：etcd/Consul 远程配置（适用于大规模部署）

对于大规模部署或需要集中配置管理的场景，可以使用 etcd 或 Consul。

#### 架构

```
                    ┌──────────────┐
                    │   Admin UI   │
                    └──────┬───────┘
                           │ 配置变更
                           ↓
                    ┌──────────────┐
                    │  etcd/Consul │
                    │  (配置中心)   │
                    └──────┬───────┘
                           │
            ┌──────────────┼──────────────┐
            ↓              ↓              ↓
    ┌────────────┐ ┌────────────┐ ┌────────────┐
    │ XGateway-1 │ │ XGateway-2 │ │ XGateway-N │
    │  (Watcher)  │ │  (Watcher)  │ │  (Watcher)  │
    └────────────┘ └────────────┘ └────────────┘
```

#### 优点
- 集中配置管理
- 实时推送配置变更
- 支持配置版本和历史
- 支持集群部署

#### 实现要点
- 使用 etcd-rs 或 consul-rs 客户端
- 实现 watch 机制监听配置变更
- 配置变更时原子更新内存缓存

---

## 实施步骤

### Phase 1: 基础配置文件支持（MVP）

**目标**: 引入配置文件，支持基础配置管理

- [ ] 定义配置文件 Schema (YAML)
- [ ] 实现配置文件读取和解析
- [ ] 实现环境变量替换 (`${VAR}` 语法)
- [ ] 实现 CLI/环境变量/配置文件优先级合并
- [ ] 更新 `main.rs` 使用新的 ConfigManager
- [ ] 添加配置验证

### Phase 2: 热加载与版本管理

**目标**: 支持配置热加载和版本回滚

- [ ] 实现 ConfigManager 的内存缓存
- [ ] 实现配置文件监控 (notify crate)
- [ ] 实现配置版本管理
- [ ] 实现配置回滚功能
- [ ] 实现配置变更事件订阅机制
- [ ] 更新 PoolManager、Service 等组件订阅配置变更

### Phase 3: 高级特性

**目标**: 远程配置、加密存储等

- [ ] 敏感配置加密存储
- [ ] etcd/Consul 远程配置支持（可选）
- [ ] 配置变更审计日志
- [ ] 配置验证和 Schema 校验
- [ ] Admin UI 配置管理页面

---

## 关键技术选型

| 组件 | 推荐选型 | 说明 |
|------|---------|------|
| **配置文件格式** | YAML | 人类可读性好，支持注释 |
| **配置解析** | serde_yaml | Rust 生态成熟 |
| **文件监控** | notify | 跨平台文件系统事件监听 |
| **远程配置** | etcd-rs / consul-rs | 根据需求选择 |
| **加密** | aes-gcm / orion | 敏感数据加密 |

---

## 风险与注意事项

### 1. 向后兼容
- 保留现有的环境变量和 CLI 参数支持
- 配置文件作为可选功能，不破坏现有部署

### 2. 配置变更的原子性
- 确保配置更新是原子操作
- 避免部分更新导致的不一致

### 3. 性能影响
- 配置读取使用内存缓存，避免每次请求都读文件
- 热加载检查间隔合理设置（建议 5-10 秒）

### 4. 错误处理
- 配置加载失败时使用上一个有效配置
- 配置验证失败时提供清晰的错误信息
