# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.13.2] - 2026-02-23

### 🚀 CI / Deploy

- 修复远端部署在工作区存在残留改动时的失败问题。
- 在 `deploy` workflow 中增加部署前仓库清理（`git reset --hard` + `git clean -fd`）。
- 增强部署脚本 checkout 容错（强制 checkout），避免 `Cargo.lock` 等本地改动导致中断。

## [0.13.1] - 2026-02-22

### ⚙️ 迁移与数据库

- 迁移目录简化为 bootstrap 入口：新增 `migrations/001_bootstrap.sql`，历史迁移归档到 `migrations/archive/`。
- 清理临时变体迁移链路：移除 `021_add_global_provider_variants.sql` 及对应校验工具。
- 修复 bootstrap 在 `sqlx` 下执行兼容性问题（移除 pg_dump 元命令与异常 search_path 影响）。

### 🧭 运行与可观测性

- 内置 xtrace 启动逻辑调整为仅使用 `XTRACE_DATABASE_URL`（不再回退 `DATABASE_URL`），明确与 xgateway 主库分离。
- 默认联调流程统一为“xgateway/xtrace 双库分离 + 自定义端口”模式。

### 🧰 工具链与脚本

- 引入 `llm_providers` 作为 provider/model 数据来源。
- 新增 Rust 二进制 `src/bin/provider_models.rs`，替代旧 Python 模型脚本流程。
- 移除旧脚本：`scripts/build-provider-models.py`、`scripts/fetch-models.py`。

### 🌐 Admin 与文档

- 修正 Admin dev 代理默认后端端口（`admin/vite.config.ts`）。
- 更新启动与部署文档，统一双库分离与新端口示例：`README.md`、`docs/USER_GUIDE.md`、`docs/xgateway.md`、`config/xgateway.yaml.example`。

## [0.13.0] - 2026-02-16

### ✨ 新增功能

#### 统一配置文件管理
- **新增 YAML 配置文件支持** - 现在可以通过 `config/xgateway.yaml` 来管理所有配置
  - 支持完整的配置项：Server、Database、Security、Metrics、Logging 等
  - 提供示例配置文件 `config/xgateway.yaml.example`
  - 向后兼容：没有配置文件时使用默认值

#### 环境变量替换
- **支持 `${VAR}` 和 `${VAR:default}` 语法** - 配置文件中可以使用环境变量
  - 例如：`database.url: "${DATABASE_URL}"`
  - 例如：`tracing.enabled: "${XTRACE_ENABLED:false}"`
  - 本地开发无需设置环境变量，直接使用默认值

#### CLI 参数优先级
- **CLI 参数覆盖配置文件** - 保持原有的灵活性
  - `--port`, `--host`, `--log-level`, `--auth-key` 等参数可以覆盖配置文件
  - 优先级顺序：CLI > 环境变量 > 配置文件 > 默认值

### 🏗️ 架构改进

#### 新的 config 模块
- **新增 `src/config/` 模块** - 完整的配置管理系统
  - `src/config/models.rs` - 配置数据模型定义
  - `src/config/loader.rs` - 配置加载器（YAML 解析、环境变量替换、CLI 合并）
  - `src/config/manager.rs` - ConfigManager 基础实现
  - 线程安全的配置管理（使用 `Arc<RwLock>`）

### 📚 文档

- 新增 `docs/CONFIG_MANAGEMENT_OPTIMIZATION.md` - 配置管理优化方案详细文档
- 新增 `docs/OPTIMIZATION_SUGGESTIONS.md` - 项目优化建议汇总
- 新增 `config/xgateway.yaml.example` - 完整的配置文件示例

### 🧪 测试

- 新增配置文件加载测试
- 新增 CLI 参数覆盖测试
- 新增环境变量替换测试
- **全部 65 个测试通过** ✅

---

## [0.12.6] - 2026-02-02

### 🎛️ Admin

- 对话测试最大化窗口修正为全屏显示。
- 对话历史加载优先填充空窗口。
- 对话测试配置按钮跳转到模型实例页。

## [0.12.5] - 2026-02-02

### 🎛️ Admin

- 对话页模型实例选择：空列表显示提示，修正默认选择逻辑。
- 模型实例列表允许普通用户启用/禁用。

## [0.12.4] - 2026-02-02

### 🎛️ Admin

- API 密钥详情页与列表样式细节优化（对齐、间距与样式）。
- 管理台文案与交互细节调整（菜单命名、复制提示、多语言日期格式）。
- 服务商目录切换详情时减少闪烁。

## [0.12.5] - 2026-02-02

### 🎛️ Admin

- 对话页模型实例选择：空列表显示提示，修正默认选择逻辑。
- 模型实例列表允许普通用户启用/禁用。

## [0.12.6] - 2026-02-02

### 🎛️ Admin

- 对话测试最大化窗口修正为全屏显示。
- 对话历史加载优先填充空窗口。
- 对话测试配置按钮跳转到模型实例页。

## [0.12.1] - 2026-01-13

### 🧰 CI / Release

- Release workflow 精简：仅构建并上传 Linux 二进制到 GitHub Release。
- 移除 Homebrew tap 自动更新与 PyPI 发布。
- 停用 docs-site 的 GitHub Pages 自动部署。

## [0.12.3] - 2026-01-14

### 🧪 Testing

- 新增整体冒烟测试脚本：支持按 service_id + API Key 随机调用 2-6 次，并支持多样化 prompt。

### 📈 Observability

- request_logs 增加 service_id 字段，所有请求（包含网关早退失败）均落日志并带上 service_id（如可获取）。
- 管理台日志页支持展示/搜索对外服务（service_id），并补充相关多语言文案。

### 🩺 Health Check

- 健康检查失败会写入 request_logs（request_type=health_check），并修正 model 字段为真实 endpoint。
- 当检测到余额不足（1008）或健康状态达到 Unhealthy（默认 3 次失败）时，自动禁用对应模型服务并写入 provider_disabled 事件日志。

## [0.12.2] - 2026-01-13

### 🐛 Fixed

- 修复数据分析页“热门模型”无数据：新增 `/api/logs/top-models` 并接入前端。
- 修复热门模型统计 SQL 在 PostgreSQL 下因 `make_interval(hours => bigint)` 导致查询失败的问题。
- 热门模型统计排除 `health_check` 等非业务请求，避免污染榜单。

### 🎛️ Admin

- 开发环境下 API 请求强制走 Vite proxy（避免直连错误端口导致“网络错误”）。
- Vite dev server proxy 正确读取 `VITE_API_URL`（使用 `loadEnv`）。

## [0.12.0] - 2026-01-13

### ✨ Milestone

- 统一服务端口为单一入口（默认 `:3000`），同时提供 Admin API 与对外 `/v1/*` 代理能力。
- 对外接口引入 `service_id` 维度的访问控制：API Key 只能访问绑定的服务，未授权返回 `service_access_denied`。

### 🎛️ Admin

- 服务与限流相关 UI/交互改进。

### 🧹 Docs

- 文档目录结构整理与历史内容清理。

## [0.11.0] - 2026-01-10

### 💥 Breaking Changes

- 移除 SQLite 支持，数据库仅支持 PostgreSQL（必须设置 `DATABASE_URL`，且为 `postgres://` 或 `postgresql://`）。
- 删除 `migrations/sqlite/`，迁移文件统一放在 `migrations/`。

### 🧹 Cleanup

- 数据库层收敛为 Postgres：移除 `SqlitePool`/SQLite 初始化与分支逻辑。
- 更新测试脚本，避免直接读取 SQLite 文件，改为通过 Admin API 获取 providers/logs。

### 🐛 Fixed

- 修复部分 Admin API 在 PostgreSQL 下的类型/聚合解码问题（例如 `/api/logs`、`/api/instances`、`/api/logs/performance`）。

## [0.11.1] - 2026-01-10

### 🐛 Fixed

- 修复 `/api/api-keys`、`/api/users` 在 PostgreSQL 下因 `TIMESTAMP` 与 `TIMESTAMPTZ` 类型不匹配导致列表接口解码失败的问题。

### 🎛️ Admin

- API Keys 页面改为响应式布局（大屏左右分栏，小屏上下堆叠）。
- API Keys 删除入口从右侧详情移到左侧列表行内。
- 启用状态徽标（success badge）提升文字对比度。
- 用户创建后刷新/选中逻辑修复（后端返回值为数字 id）。

## [0.11.2] - 2026-01-11

### 🎛️ Admin

- 统一各页面顶部标题与副标题（`PageHeader`），提升页面一致性与信息层级。
- 页面主操作按钮（如创建/添加）统一收敛到标题区右侧。
- 优化部分卡片/图表在窄容器下的溢出表现（`min-w-0`、滚动区域等）。
- 路由切换为 Hash 模式（`HashRouter`），便于静态部署场景。
- 顶部导航面包屑显示逻辑简化为当前页面标题。

## [0.6.0] - 2025-11-29

### 💥 Breaking Changes

#### Removed Claude Code Support
- **🚫 Removed Feature**: Claude Code integration has been completely removed
- **🔧 Reason**: Claude Code employs restrictive proxy mechanisms that prevent reliable third-party integration
- **📝 Impact**: All Claude Code-related documentation, scripts, and code modules have been removed
- **⚠️ Migration**: Users should migrate to Zed or Codex CLI for AI coding assistance

### 🧹 Cleanup Changes
- Deleted `src/apps/claude.rs` module and all related code
- Removed Claude Code from `SupportedApp` enum and application registry
- Updated documentation across README.md, docs/, and docs-site/
- Removed Claude-specific scripts: `start-claude-code.sh`, `mitm_proxy.py`, `start-with-mitm.sh`
- Cleaned up configuration examples and help text

### ✅ Retained Features
- Anthropic API implementation remains available for other clients
- OpenAI API (Codex CLI) and Ollama API (Zed) support unchanged
- All 10 LLM providers continue to work normally

## [0.5.0] - 2024-11-18

### 🎉 Major Features & Bug Fixes

#### Multi-Provider Support Enhancement
- **10 LLM Providers**: OpenAI, Anthropic, Zhipu AI, Aliyun, Volcengine, Tencent, Moonshot, MiniMax, LongCat, Ollama
- **Universal Provider Switching**: `scripts/switch-provider.sh` for seamless provider changes
- **Comprehensive Testing Suite**: Individual test scripts for each provider

#### Qwen3-Coder-Plus Integration ⭐
- **Specialized Code Model**: Added Qwen3-Coder-Plus with 262K context length
- **Enhanced Tool Support**: Full function calling capabilities for coding tasks
- **Zed Editor Integration**: Optimized scripts for Zed + Qwen3-Coder-Plus workflow

#### Critical Bug Fixes
- **🐛 Fixed Zed "Blank Tool" Issue**: Resolved tool display problems by adding required `id` and `type` fields
- **🔧 Tool Persistence**: Tools remain available throughout conversation without re-sending
- **✅ Enhanced Tool Format**: Proper Ollama-compatible tool call responses

#### New Scripts & Documentation
- `scripts/zed-qwen3-coder.sh` - Quick start for Zed + Qwen3-Coder-Plus
- `scripts/switch-provider.sh` - Universal provider switching
- `scripts/debug-zed-tools.sh` - Tool call debugging
- `scripts/README-ALL-PROVIDERS.md` - Complete multi-provider guide
- `scripts/ZED-QWEN3-CODER-SETUP.md` - Detailed Zed setup instructions

#### Quick Start
```bash
# Qwen3-Coder-Plus (recommended for coding)
./scripts/zed-qwen3-coder.sh "your-aliyun-api-key"

# Switch to other providers
./scripts/switch-provider.sh openai "your-openai-key"
./scripts/switch-provider.sh anthropic "your-anthropic-key"
```

## [0.4.0] - 2025-11-17

### 🎯 Zed Editor Full Compatibility

This release focuses on complete Zed editor compatibility, fixing all known issues with tool calling, context limits, and reasoning content display.

#### ✅ Fixed Issues

1. **Tool Calling Support**
   - Fixed "tools unsupported" error in Zed
   - Added `capabilities: ["tools"]` to `/api/show` response
   - Added `tags: ["tools"]` to `/api/tags` response for models that support tools
   - Fixed tool call `arguments` format (JSON object instead of string)
   - All tool-capable models (GLM-4.6, Volcengine Seed, OpenAI, Anthropic) now work correctly in Zed

2. **Context Length Detection**
   - Fixed "thread reached the token limit" error
   - Added `model_info.llama.context_length` to `/api/show` response
   - GLM-4.6 now correctly reports 200K context (was 4K)
   - All models now report their actual context limits

3. **Reasoning Content Filtering**
   - Fixed `<think>` tags appearing in Zed output
   - Added `filter_think_tags()` function to remove reasoning process tags
   - Preserves all formatting (newlines, spaces, indentation)
   - Only actual content is sent to Zed, not internal reasoning

#### 🏗️ Architecture Improvements

- **Proper Layer Separation**: llm-connector remains generic, xgateway handles Zed-specific adaptations
- **Content Filtering**: Smart filtering that preserves formatting while removing reasoning tags
- **Model Metadata**: Complete model information including context length and capabilities

#### 📚 Documentation

- Added comprehensive Zed integration guides:
  - `README_ZED.md` - Complete Zed setup guide
  - (Consolidated) Zed setup and provider switching notes are now maintained in `docs/USER_GUIDE.md`
  - `docs/fixes/zed-tools-detection.md` - Tool detection fix details
  - `docs/fixes/tool-call-arguments-format.md` - Arguments format fix
  - `docs/fixes/think-tags-filtering.md` - Reasoning content filtering
  - `FINAL_FIX_SUMMARY.md` - Complete fix summary

#### 🧪 Testing

- Added `tests/test_zed_compatibility.sh` - Zed compatibility tests
- Added `tests/test_tool_call_format.sh` - Tool call format validation
- Added `tests/verify_fixes.sh` - Complete fix verification
- All tests include proper error handling and validation

#### 🔧 Code Quality

- Fixed all clippy warnings
- Added comprehensive unit tests for `filter_think_tags()`
- Improved error messages and logging
- Better debugging support with detailed logs

### 🎉 What's Working Now

- ✅ Zed AI assistant with all Chinese LLM providers (Zhipu, Volcengine, etc.)
- ✅ Tool calling (function calling) in Zed
- ✅ Correct context length detection (no more false "token limit" errors)
- ✅ Clean output without reasoning tags
- ✅ Perfect formatting preservation
- ✅ All streaming responses work correctly

## [0.3.6] - 2025-11-16

### 🔥 Volcengine Doubao Improvements

- Upgraded `llm-connector` to **0.5.3**, fixing the Volcengine Doubao streaming issue where chunks had empty `content`, and improving reasoning model support.
- Unified Ollama `/api/chat` streaming through the **Normalizer** layer so that all providers, including Volcengine Doubao, work correctly with Ollama-compatible clients such as Zed.
- Introduced a clear separation between **logical model names** and **endpoint IDs (`ep-...`)** for Volcengine Doubao:
  - Logical model names (e.g. `doubao-seed-code-preview-latest`) are used at the protocol/UI layer.
  - Actual requests to Volcengine use endpoint IDs, resolved centrally by the Normalizer `ModelResolver`.

### 🧱 Architecture & Maintainability

- Added a new `ModelResolver` in `src/normalizer/` to centralize provider-specific model resolution logic.
  - Supports local overrides via [model-overrides.yaml](cci:7://file:///Users/mac-m4/github/xgateway/model-overrides.yaml:0:0-0:0).
  - Applies Volcengine-specific rules (logical name → default endpoint, `ep-...` passthrough).
- Completed the internal refactor from the old `llm` module to the **`normalizer`** module:
  - Moved [chat.rs](cci:7://file:///Users/mac-m4/github/xgateway/src/normalizer/chat.rs:0:0-0:0), [stream.rs](cci:7://file:///Users/mac-m4/github/xgateway/src/normalizer/stream.rs:0:0-0:0), `types.rs`, `models.rs` and `minimax_client.rs` under `src/normalizer/`.
  - Service layer now consistently depends on [normalizer::Client](cci:2://file:///Users/mac-m4/github/xgateway/src/normalizer/mod.rs:14:0-18:1).

### 📚 Docs, Examples & Tests

- Updated the main [README.md](cci:7://file:///Users/mac-m4/github/xgateway/README.md:0:0-0:0) with a **“Volcengine Doubao: Logical Models vs Endpoint IDs”** section explaining:
  - How logical model names relate to endpoint IDs.
  - How the Normalizer `ModelResolver` works.
  - How to configure [model-overrides.yaml](cci:7://file:///Users/mac-m4/github/xgateway/model-overrides.yaml:0:0-0:0) for per-user logical model → endpoint mappings.
- Added [examples/model-overrides.example.yaml](cci:7://file:///Users/mac-m4/github/xgateway/examples/model-overrides.example.yaml:0:0-0:0) as a template for local [model-overrides.yaml](cci:7://file:///Users/mac-m4/github/xgateway/model-overrides.yaml:0:0-0:0) configuration.
- Cleaned up the Volcengine streaming test script:
  - Removed hard-coded API keys and endpoint IDs.
  - Tests now require `VOLCENGINE_API_KEY` and `VOLCENGINE_ENDPOINT` to be provided via environment variables.

## [0.3.5] - 2025-11-05

### 🎉 New Features

#### Minimax Provider Support
- **Added Minimax Provider** - Now supports Minimax's powerful AI models
  - OpenAI-compatible API integration
  - Default model: MiniMax-M2
  - Environment variable: `MINIMAX_API_KEY`
  - Base URL: `https://api.minimaxi.com/v1`
  - Full hot-reload configuration support

#### Documentation Site
- **Modern Documentation Site** - Built with Svelte + shadcn/ui
  - Replaced lengthy README with interactive documentation
  - Homepage with hero section and key features
  - Comprehensive documentation pages for installation and usage
  - Detailed provider information for all 10 supported LLM providers
  - Automatic GitHub Pages deployment
  - Modern, responsive design matching shadcn/ui style

### 🔧 Technical Improvements
- Updated provider count from 9 to 10 in all documentation
- Enhanced provider registry with Minimax integration
- Improved GitHub Actions deployment configuration
- Fixed branch name compatibility (master vs main)

### 🛠️ Internal Refactors
- Renamed internal `LLM` communication layer to **Normalizer Layer** (`src/normalizer/`), emphasizing its role as the protocol normalization and LLM communication layer.
- Moved `MinimaxClient` into the provider system as `provider::minimax::MinimaxClient`, aligning all provider-specific direct clients under `src/provider/`.
- Enhanced Ollama protocol handler:
  - `/api/tags` now reads models dynamically from `models.yaml` using the current backend provider.
  - Volcengine Doubao models are fully reflected in tags, including `doubao-seed-code-preview-latest` for code-centric scenarios.

### 📚 Documentation Updates
- Added complete provider documentation for Minimax
- Updated all provider counts and descriptions
- Enhanced installation and configuration guides
- Added deployment checklist and troubleshooting guide

## [0.3.4] - 2025-10-31

### 🛠️ Code Quality Improvements

#### Robust Error Handling
- **Eliminated All unwrap() Calls** - Replaced all `unwrap()` calls with proper error handling
  - `RwLock` poisoning errors now return `StatusCode::INTERNAL_SERVER_ERROR`
  - Optional values use safe pattern matching (`if let Some`)
  - SystemTime operations use descriptive `expect()` messages
  - Streaming data locks handle failures gracefully with warnings

#### Performance Optimizations
- **Reduced Unnecessary Clones** - Optimized memory usage and performance
  - Function parameters now use `&str` instead of `String` where possible
  - Improved string handling to avoid unnecessary allocations
  - Pre-allocated container capacities using `Vec::with_capacity()` and `Map::with_capacity()`
  - Maintained necessary clones for error handling and ownership transfers

#### Documentation Restructuring
- **Organized Documentation Hierarchy** - Clear and maintainable documentation structure
  - Documentation is now kept flat under `docs/` (see `docs/README.md`)
  - User docs are consolidated in `docs/USER_GUIDE.md`
  - Development/ops docs are consolidated in `docs/DEVELOPMENT.md`
  - Created `docs/archive/` for historical documents (old releases, test reports)
  - Merged duplicate integration guides (Zed and Claude Code) into unified documentation
  - Updated main README.md with improved documentation links

### 🔧 Technical Improvements
- Fixed borrow checker issues in streaming response handling
- Improved error propagation in API endpoints
- Enhanced memory efficiency in message conversion functions
- Better separation of concerns in documentation organization

## [0.3.3] - 2025-10-30

### 🎉 Major Features

#### Optional API Key Startup
- **Start Without API Key** - xgateway can now start without requiring API keys
  - Service starts normally and displays helpful warnings
  - API keys can be set dynamically via hot-reload API after startup
  - Perfect for containerized deployments and development workflows
  - Supports all providers except Ollama (which doesn't need keys)

#### Enhanced Moonshot Provider Support
- **Full Moonshot Integration** - Complete support for Moonshot Kimi models
  - Added to all configuration systems
  - Integrated with hot-reload APIs
  - Default model: `kimi-k2-turbo-preview`

### 🔧 Technical Improvements

#### Startup Behavior
- **Before**: Required API key or service would fail to start
  ```bash
  Error: Missing API key for provider 'zhipu'
  ```

- **After**: Starts with warnings, allows dynamic configuration
  ```bash
  ⚠️  Starting without API key for provider 'zhipu'
  ⚠️  Set ZHIPU_API_KEY or use --llm-api-key
  ⚠️  Or update dynamically via: POST /api/config/update-key
  ✅ Service started successfully
  ```

#### Code Changes
- Modified `src/cli/loader.rs` to allow empty API keys
- Updated all `LlmBackendSettings` match statements to include Moonshot
- Added comprehensive warnings for missing API keys
- Improved error messages with actionable suggestions

### 📚 Documentation

#### New Documentation
- **[START_WITHOUT_API_KEY.md](docs/START_WITHOUT_API_KEY.md)** - Complete guide for optional API key startup
  - Usage scenarios and best practices
  - Security considerations
  - Docker and Kubernetes examples
  - Multi-provider switching workflows

### 🎯 Use Cases

1. **Container Deployments**
   ```bash
   # Start container without API key
   docker run -p 11434:11434 xgateway --app zed --provider zhipu

   # Inject API key after startup
   curl -X POST http://localhost:11434/api/config/update-key \
     -d '{"provider": "zhipu", "api_key": "xxx"}'
   ```

2. **Development Workflow**
   ```bash
   # Quick start for testing
   ./xgateway --app zed --provider zhipu

   # Set key when needed
   curl -X POST http://localhost:11434/api/config/update-key \
     -d '{"provider": "zhipu", "api_key": "dev-key"}'
   ```

3. **Dynamic Provider Switching**
   ```bash
   # Start without key
   ./xgateway --app zed --provider zhipu

   # Switch providers on the fly
   curl -X POST http://localhost:11434/api/config/switch-provider \
     -d '{"provider": "openai", "api_key": "openai-key"}'
   ```

### ⚠️ Breaking Changes

None. This is a backward-compatible enhancement.

### 🔗 Related

- Hot-reload API documentation: [HOT_RELOAD_API.md](docs/HOT_RELOAD_API.md)
- Configuration API: [CONFIG_UPDATE_API.md](docs/CONFIG_UPDATE_API.md)

## [0.3.2] - 2025-10-30

### 🎉 Major Features

#### Dynamic Model Discovery API
- **New `/api/info` Endpoint** - REST API to query all supported providers and models
  - Returns complete list of all 9 providers and their available models
  - Includes current provider and model information
  - Provides API endpoint configuration details
  - Enables dynamic UI generation and service discovery

#### Flexible Provider Configuration System
- **HashMap-Based Provider Support** - Refactored `ModelsConfig` for dynamic providers
  - No longer requires hardcoded provider fields in struct
  - Supports any provider defined in `models.yaml`
  - Easy to add new providers without code changes
  - Automatic loading from embedded YAML configuration

#### Moonshot Kimi Provider Support
- **Added Moonshot Provider** - Full support for Moonshot Kimi models
  - Provider: `moonshot` with 3 models
  - Models: `kimi-k2-turbo-preview`, `kimi-k2-0905-preview`, `kimi-k2-0711-preview`
  - Integrated into hot-reload and configuration systems

### 🔧 Technical Improvements

#### Models Configuration Refactoring
- **Before**: Fixed struct with hardcoded provider fields
  ```rust
  pub struct ModelsConfig {
      pub openai: ProviderModels,
      pub anthropic: ProviderModels,
      // ... must list all providers
  }
  ```
- **After**: Dynamic HashMap-based structure
  ```rust
  pub struct ModelsConfig {
      #[serde(flatten)]
      pub providers: HashMap<String, ProviderModels>,
  }
  ```

#### Enhanced Model Definitions
- **Complete OpenAI Models** - Added 7 OpenAI models including o1-preview, o1-mini
- **Complete Anthropic Models** - Added 5 Claude models including 3.5 Haiku
- **Complete Zhipu Models** - Added 6 GLM models including glm-4.6, glm-4.5 series
- **Complete Aliyun Models** - Added 8 Qwen models including qwen3-max
- **Complete Volcengine Models** - Added 6 Doubao Seed 1.6 models
- **Complete Tencent Models** - Added 10 Hunyuan models
- **Complete LongCat Models** - Added 2 LongCat Flash models
- **Complete Moonshot Models** - Added 3 Kimi K2 models

### 📚 Documentation

#### New Documentation
- **API_PROVIDERS_MODELS.md** - Complete API documentation for model discovery
  - API endpoint usage examples
  - Query patterns with jq
  - Provider and model listing
  - Configuration file structure

#### Updated Documentation
- **README.md** - Updated with API endpoints section
  - Added model discovery examples
  - Updated provider count to 9
  - Added API documentation links
  - Enhanced feature list

### 🐛 Bug Fixes

#### Model Loading Issues
- **Fixed YAML Parsing** - Models now correctly load from `models.yaml`
  - Previously returned only default hardcoded models
  - Now returns complete model list from YAML
  - Added logging for load success/failure
  - Proper fallback to defaults on error

#### Dead Code Warnings
- **Fixed All Compilation Warnings** - Clean compilation with no warnings
  - Added `#[allow(dead_code)]` for future-use code
  - Fixed documentation test examples with `ignore` attribute
  - Removed unused code warnings

### 📊 Provider Statistics

**9 Supported Providers** with **47+ Models**:
- OpenAI: 7 models
- Anthropic: 5 models
- Zhipu: 6 models
- Aliyun: 8 models
- Volcengine: 6 models
- Tencent: 10 models
- LongCat: 2 models
- Moonshot: 3 models
- Ollama: Dynamic (local models)

### 🧪 Testing

- ✅ All providers load correctly from YAML
- ✅ API returns complete model lists
- ✅ Dynamic provider addition works
- ✅ No compilation warnings or errors
- ✅ Hot-reload functionality verified

## [0.3.1] - 2025-10-26

### 🔥 New Provider Support

#### LongCat AI Integration
- **Added LongCat Provider** - Full support for LongCat AI API in hot-reload system
  - New provider: `longcat` with OpenAI-compatible API
  - Supports `LongCat-Flash-Chat` and `LongCat-Flash-Thinking` models
  - API endpoint: `https://api.longcat.chat/v1`

#### Enhanced Hot-Reload Support
- **LongCat Hot-Reload** - All hot-reload features work with LongCat
  - Runtime API key updates via `POST /api/config/update-key`
  - Dynamic provider switching via `POST /api/config/switch-provider`
  - API key validation via `POST /api/config/validate-key`
  - Model discovery and listing support

### 📊 Provider Count Update
- **8 Supported Providers** - Now supporting 8 LLM providers total:
  - OpenAI, Anthropic, Zhipu, Aliyun, Volcengine, Tencent, **LongCat**, Ollama

### 🔧 Technical Implementation
- **Code Integration** - Added LongCat support across all modules
  - Updated `LlmBackendSettings` enum with `Longcat` variant
  - Enhanced provider validation in hot-reload APIs
  - Added LongCat models to configuration system
  - Updated all provider matching logic

### 📚 Documentation Updates
- **Updated Documentation** - Comprehensive documentation updates
  - README updated to reflect 8 providers
  - HOT_RELOAD_API.md includes LongCat examples
  - Cargo.toml description updated
  - All provider lists updated

### 🧪 Testing Status
✅ **Fully Tested LongCat Features:**
- Provider switching to LongCat verified
- API key validation with model discovery working
- Configuration queries showing LongCat status
- Hot-reload functionality confirmed working

## [0.3.0] - 2025-10-26

### 🔥 Major Features

#### Hot-Reload Configuration System
- **Runtime API Key Updates** - Update API keys without restarting the service
  - New `POST /api/config/update-key` endpoint
  - Supports all providers: OpenAI, Anthropic, Zhipu, Aliyun, Volcengine, Tencent, Longcat, Ollama
  - Secure API key masking in logs and responses
  - Input validation for provider names and API key formats

- **Dynamic Provider Switching** - Switch between LLM providers on-the-fly
  - New `POST /api/config/switch-provider` endpoint
  - Instant provider switching without service restart
  - Automatic model selection or custom model specification
  - Preserves existing API key if not provided

- **Enhanced Configuration API** - Improved configuration management
  - Enhanced `GET /api/config/current` with `supports_hot_reload: true`
  - New `POST /api/config/validate-key` for hot-reload scenarios
  - Returns available model lists during validation
  - Thread-safe configuration updates using `Arc<RwLock<>>`

### ✨ New Features

#### Hot-Reload API Endpoints
- **`POST /api/config/update-key`** - Update API key for specific provider
- **`POST /api/config/switch-provider`** - Switch to different LLM provider
- **`POST /api/config/validate-key`** - Validate API key before applying
- **Enhanced `GET /api/config/current`** - Shows hot-reload support status

#### Security & Safety
- **API Key Masking** - All API keys are safely masked in logs (e.g., `sk-***1234`)
- **Input Validation** - Validates provider names and API key formats
- **Error Handling** - Comprehensive error messages and status codes
- **Thread Safety** - Uses `Arc<RwLock<>>` for safe concurrent access

### 🎯 Use Cases

Perfect for desktop applications like **z-agent**:
- **Settings UI** - Users can change API keys through settings interface
- **Provider Management** - Switch between different LLM providers instantly
- **Key Validation** - Test API keys before saving
- **No Downtime** - Configuration changes without service interruption

### 📖 API Examples

```bash
# Check current configuration
curl http://localhost:11434/api/config/current

# Update API key for OpenAI
curl -X POST http://localhost:11434/api/config/update-key \
  -H "Content-Type: application/json" \
  -d '{"provider": "openai", "api_key": "sk-..."}'

# Switch to Anthropic
curl -X POST http://localhost:11434/api/config/switch-provider \
  -H "Content-Type: application/json" \
  -d '{"provider": "anthropic", "model": "claude-3-5-sonnet-20241022", "api_key": "sk-ant-..."}'

# Validate API key before using
curl -X POST http://localhost:11434/api/config/validate-key \
  -H "Content-Type: application/json" \
  -d '{"provider": "ollama", "api_key": ""}'
```

### 🔧 Technical Details

#### Architecture Changes
- **AppState Refactoring** - Changed from `Arc<Service>` to `Arc<RwLock<Service>>`
- **Dynamic Service Updates** - New `update_llm_service()` method for runtime updates
- **Configuration Management** - Enhanced settings handling with hot-reload support
- **Route Organization** - Improved Axum router structure for better state management

#### Files Modified
- `src/api/mod.rs` - Enhanced AppState with hot-reload capabilities
- `src/api/config/mod.rs` - Added hot-reload endpoints and validation
- `src/settings.rs` - Added `get_model()` method to LlmBackendSettings
- `src/main.rs` - Updated router configuration for new endpoints
- `src/api/openai.rs`, `src/api/ollama.rs`, `src/api/anthropic.rs` - Updated for RwLock usage

#### Documentation
- **`HOT_RELOAD_API.md`** - Complete API documentation with examples
- **JavaScript/TypeScript client examples** - Ready-to-use client code
- **Python client examples** - Integration examples for Python applications

### 🧪 Testing

✅ **Fully Tested Features:**
- Runtime API key updates (Ollama ↔ Zhipu switching verified)
- Provider switching with model changes
- API key validation with model discovery
- Security features (API key masking, input validation)
- Thread safety under concurrent requests

### 🔄 Breaking Changes

**None!** This release is fully backward compatible:
- All existing APIs continue to work unchanged
- Original restart-based configuration still supported
- No changes to command-line interface or startup behavior

### 📊 Performance

- **Minimal Overhead** - Hot-reload adds negligible performance impact
- **Memory Efficient** - Configuration changes only affect necessary components
- **Thread Safe** - RwLock ensures safe concurrent access with minimal blocking

## [0.2.4] - 2025-10-26

### ✨ New Features

#### Provider and Model Discovery API
- **New `/api/info` endpoint** - Returns comprehensive information about:
  - Current active provider and model
  - All 7 supported providers (OpenAI, Anthropic, Zhipu, Aliyun, Volcengine, Tencent, Ollama)
  - Complete model list for each provider with descriptions
  - Enabled API endpoints configuration
- **Enhanced models endpoints** - Added `provider` field to existing model APIs:
  - `GET /api/tags` (Ollama API format)
  - `GET /v1/models` (OpenAI API format)
  - `GET /anthropic/v1/models` (Anthropic API format)

### 🎯 Use Cases

This feature enables:
- **External applications** to discover available providers and models
- **Dynamic UI generation** based on supported models
- **Service discovery** for XGateway capabilities
- **Provider switching** with full visibility of available options

### 📖 API Examples

```bash
# Get complete provider and model information
curl http://localhost:11434/api/info

# Get current provider's models (Ollama format)
curl http://localhost:11434/api/tags

# Get current provider's models (OpenAI format)
curl http://localhost:8080/v1/models
```

### 🔧 Technical Details

- Modified files:
  - `src/api/mod.rs` - Added `info()` endpoint handler
  - `src/main.rs` - Registered `/api/info` route
  - `src/api/ollama.rs` - Enhanced models API
  - `src/api/openai.rs` - Enhanced models API
  - `src/api/anthropic.rs` - Implemented models API

## [0.2.1] - 2025-10-23

### 📚 Documentation Improvements

#### Enhanced Claude Code Configuration Guide
- **Detailed setup instructions** for Claude Code integration with XGateway
- **Complete configuration examples** for `~/.claude/settings.json`
- **Multi-provider support guide** - how to use OpenAI, Zhipu, Aliyun, Ollama with Claude Code
- **Configuration options explanation** - ANTHROPIC_AUTH_TOKEN, ANTHROPIC_BASE_URL, API_TIMEOUT_MS
- **Enhanced testing section** with Claude Code API endpoint examples
- **Improved troubleshooting** with Claude Code specific issues and provider switching

#### Key Documentation Additions
- Step-by-step Claude Code configuration process
- Examples for all supported LLM providers with Claude Code
- API testing commands for Claude Code endpoints
- Troubleshooting guide for configuration and provider switching issues
- Clear explanation that Claude Code settings remain unchanged when switching providers

### 🔧 Benefits
- **Easier onboarding** for Claude Code users
- **Clear provider switching** instructions
- **Better troubleshooting** support
- **Complete configuration reference**

## [0.2.0] - 2025-10-21

### 🎉 Major Features

#### Multi-Modal Support
- **Upgraded to llm-connector 0.5.1** with native multi-modal content support
- **Message.content** now supports `Vec<MessageBlock>` (text + images)
- **Anthropic API** fully supports multi-modal messages (text + base64 images)
- **Future-proof** for documents, audio, and video content

#### Claude Code Integration
- **Fixed streaming detection** via HTTP Accept header
- **Smart content negotiation** - respects `Accept: text/event-stream`
- **Proper streaming** for Claude Code and other clients
- **No breaking changes** - non-streaming requests still work

### ✨ Enhancements

#### Code Quality
- **Cleaner API** with helper methods (`content_as_text()`, `is_text_only()`, `has_images()`)
- **Type-safe** content handling with Rust enums
- **Better error messages** and logging
- **Removed dead code warnings**

#### Provider Testing
- **Comprehensive testing** of Zhipu, Aliyun, Volcengine providers
- **Test report** documenting provider compatibility
- **Known issues** documented for Volcengine streaming

### 🔧 Bug Fixes

- **Fixed**: Client-requested model names now properly passed to backend
- **Fixed**: Streaming detection via Accept header instead of forcing all requests
- **Fixed**: Multi-modal content no longer discarded (images preserved)
- **Fixed**: Dead code warnings in Anthropic API

### 📚 Documentation

- **UPGRADE_v0.5.1.md** - Comprehensive upgrade guide
- **PROVIDER_TEST_REPORT.md** - Detailed provider test results
- **Updated CHANGELOG.md** - This changelog

### 🔄 Breaking Changes

**None!** This release is fully backward compatible.

### 📊 Technical Details

#### Dependencies
- **llm-connector**: 0.4.20 → 0.5.1

#### API Changes (Internal)
- `Message.content`: `String` → `Vec<MessageBlock>`
- Added `MessageBlock` enum for multi-modal content
- Added `ImageSource` enum for image handling

### 🧪 Testing

- ✅ Zhipu GLM-4-Flash: Fully tested (streaming + non-streaming)
- ✅ Aliyun Qwen-Max: Fully tested (streaming + non-streaming)
- ⚠️ Volcengine Doubao: Non-streaming works, streaming has known issue

---

## [0.1.4] - 2025-10-18

### Added
- **Smart `finish_reason` correction for streaming tool_calls** 🎯
  - Automatically detects tool_calls in streaming responses
  - Corrects `finish_reason` from `"stop"` to `"tool_calls"` when tool_calls are present
  - Ensures Codex and other clients correctly execute tools instead of just displaying text
  - Preserves full streaming experience: users see both content and tool execution

### Changed
- **Updated llm-connector to 0.4.15**: Full streaming tool_calls support
  - ✅ llm-connector correctly parses streaming tool_calls from Zhipu API
  - ✅ Streaming mode now works correctly with tool messages
  - ✅ Zhipu GLM-4.6 streaming + tool messages fully functional
  - ✅ Codex workflow now works perfectly in streaming mode

### Fixed
- **Critical: `finish_reason` correction for tool_calls** 🔧
  - GLM-4.6 returns `finish_reason: "stop"` even when tool_calls are present
  - xgateway now detects tool_calls and corrects `finish_reason` to `"tool_calls"`
  - This fixes Codex not executing tools (Codex checks `finish_reason` to decide action)
  - Root cause: Codex's logic: `finish_reason == "tool_calls"` → execute tool, `== "stop"` → display text
- **Streaming tool_calls extraction**: Now correctly extracts from `choices[0].delta.tool_calls`
  - Was checking wrong field (`chunk.tool_calls` instead of `chunk.choices[0].delta.tool_calls`)
  - Now properly forwards tool_calls in streaming responses
- Streaming responses with tool messages now return complete content
- Tool calls now appear in real-time during streaming

## [0.1.3] - 2025-10-18

### Added
- **Full Tool Message Support**: Complete support for OpenAI-style tool messages workflow
  - Support for `role="tool"` messages in conversation history
  - Support for `tool_call_id` field in tool response messages
  - Support for `tool_calls` field in assistant messages
  - Enables multi-turn function calling conversations (Codex workflow)

### Changed
- **Updated llm-connector to 0.4.13**: Full tool message support
  - Message structure now includes `tool_calls` and `tool_call_id` fields
  - Role enum now includes `Tool` variant
  - Support for reasoning fields (reasoning_content, reasoning, thought, thinking)
- **Simplified message handling**: Now directly use llm-connector's Message type
  - Removed custom Message type conversion
  - Direct pass-through of tool_calls and tool messages
  - Better content extraction from various reasoning fields

### Fixed
- Tool messages now correctly passed to LLM (previously converted to user messages)
- Assistant messages with tool_calls now properly handled (content can be null)
- Content extraction now checks multiple fields (content, reasoning_content, reasoning)

## [0.1.2] - 2025-10-18

### Added
- **Tool Calls Support in Non-Streaming Responses**: Full support for tool_calls in non-streaming mode
  - Added `tool_calls` field to Response structure
  - Extract and forward tool_calls from LLM responses
  - Compatible with OpenAI tool_calls format

### Changed
- **Updated llm-connector to 0.4.12**: Includes fixes for Zhipu GLM streaming and tool calling
  - Fixed Zhipu API SSE parsing (single newline separator)
  - Fixed StreamingResponse.content population
  - Added tools and tool_choice support to ZhipuRequest
  - Added tool_calls support to ZhipuMessage

### Fixed
- Non-streaming requests now properly pass tools parameter to LLM
- Tool calls are now correctly extracted and returned in responses
- Ollama handler updated to support new service signature

## [0.1.1] - 2025-10-18

### Added
- **Provider Override Feature**: Switch between LLM providers via command-line
  - New `--provider` flag to override LLM provider (openai, anthropic, zhipu, ollama)
  - New `--model` flag to override LLM model name
  - New `--llm-api-key` flag to override provider API key
  - Support for OpenAI, Anthropic, Zhipu, and Ollama providers
  - Smart default model selection for each provider
  - See [Provider Override Documentation](docs/PROVIDER_OVERRIDE.md) for details

- **Tools/Function Calling Support**: Full support for OpenAI-style function calling
  - Tools parameter support in OpenAI API handler
  - Tools conversion from OpenAI format to llm-connector format
  - Tools propagation through service and client layers
  - Verified with Zhipu API (returns standard OpenAI format)

- **XML to JSON Conversion Enhancement**: Improved handling of Zhipu XML responses
  - Fixed streaming response parsing (handle SSE `data:` prefix)
  - Move XML function calls from `content` to `function_call` field (OpenAI standard)
  - Provider isolation - only applies to Zhipu provider
  - Comprehensive unit tests

- **Documentation**:
  - [Provider Override Guide](docs/PROVIDER_OVERRIDE.md) - Complete usage guide
  - [Quick Start Guide](docs/QUICK_START.md) - Fast reference
  - [Provider Override Feature](docs/PROVIDER_OVERRIDE_FEATURE.md) - Implementation details
  - Environment variables configuration in README
  - Organized issue tracking in `docs/issues/` directory

- **Testing**:
  - Test scripts in `tests/` directory
  - Provider override tests
  - XML conversion tests
  - Tools support tests
  - Direct Zhipu API tests

### Changed
- Updated README with provider override examples and environment variables section
- Improved Codex CLI integration guide with multiple provider options
- Enhanced CLI help messages
- Reorganized test files into `tests/` directory
- Moved logs to `logs/` directory
- Moved issue tracking documents to `docs/issues/` directory
- Cleaned up root directory (only essential files remain)

### Fixed
- Streaming response XML conversion (was not parsing SSE format correctly)
- Model name in streaming responses (was hardcoded to `gpt-3.5-turbo`)
- Content field XML handling (now moves to `function_call` field per OpenAI spec)

### Known Issues
- ~~llm-connector may not pass `tools` parameter in streaming requests~~ ✅ Fixed in llm-connector 0.4.12
- ~~Zhipu function calling requires llm-connector fix~~ ✅ Fixed in llm-connector 0.4.12
- ~~Tool messages not supported in conversation history~~ ✅ Fixed in llm-connector 0.4.13
- ~~Streaming responses with tool messages return empty content~~ ✅ Fixed in llm-connector 0.4.15
- No known issues! All major features working correctly 🎉

## [0.1.0] - 2025-10-17

### Added
- Initial release
- Application-oriented configuration system
- Support for Codex CLI, Zed.dev, Claude Code
- Multi-protocol support (OpenAI, Ollama, Anthropic APIs)
- Smart client adaptation
- XML to JSON conversion for Zhipu responses
- Built-in application configurations
- CLI-first design with helpful guidance
- Comprehensive documentation

### Features
- Zero-configuration startup for common use cases
- Automatic client detection and optimization
- Bearer token authentication
- Health check endpoints
- Model listing endpoints
- Streaming and non-streaming support

---

## Version History

- **v0.1.4** (2025-10-18) - Streaming tool messages fix, llm-connector 0.4.15 update, Codex fully working
- **v0.1.3** (2025-10-18) - Full tool message support, llm-connector 0.4.13 update, Codex workflow enabled
- **v0.1.2** (2025-10-18) - Tool calls support, llm-connector 0.4.12 update
- **v0.1.1** (2025-10-18) - Provider override, tools support, XML conversion fixes
- **v0.1.0** (2025-10-17) - Initial release

## Upgrade Guide

### From 0.1.0 to 0.1.1

No breaking changes. All existing configurations and usage patterns continue to work.

**New capabilities:**
1. You can now override provider and model via command-line
2. Function calling is now supported (pending llm-connector fix)
3. XML conversion is more robust

**Migration:**
- No migration needed
- Optionally, you can start using `--provider` and `--model` flags

**Example:**
```bash
# Before (still works)
./target/release/xgateway --app codex-cli

# After (new option)
./target/release/xgateway --app codex-cli --provider openai --model gpt-4
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for details on how to contribute to this project.

## Support

If you encounter any issues or have questions:
1. Check the [documentation](docs/)
2. Search [existing issues](https://github.com/your-repo/xgateway/issues)
3. Create a [new issue](https://github.com/your-repo/xgateway/issues/new)

---

**Note**: This changelog follows [Keep a Changelog](https://keepachangelog.com/) format.
