# 工具定义持久化修复

## 问题描述

在使用 Zed + llm-link + Qwen3-Coder-Plus 时，出现以下问题：

1. **第一次工具调用成功**：Zed 发送带有工具定义的请求，模型正确返回工具调用
2. **后续对话失败**：Zed 在工具调用后的后续请求中不再发送工具定义，导致模型失去工具调用能力
3. **表现为空白工具**：在 Zed 中显示为"blank tool"，无法继续使用工具功能

## 根本原因

从日志分析可以看出：

```
# 第一次请求 - 成功
tools_count=9, chunks=189  # 有工具定义，完整响应

# 第二次请求 - 失败  
tools_count=0, chunks=4    # 无工具定义，简单文本响应
```

**Zed 的行为特性**：在工具调用后的后续对话中，Zed 可能不会重新发送工具定义，这是 Zed 编辑器的设计行为。

## 解决方案

实现**工具定义持久化缓存**机制：

### 1. 添加全局工具缓存

```rust
// src/api/ollama.rs
use std::sync::{Arc, Mutex, OnceLock};
use std::collections::HashMap;

static TOOL_CACHE: OnceLock<Arc<Mutex<HashMap<String, Vec<llm_connector::types::Tool>>>>> = OnceLock::new();

fn get_tool_cache() -> &'static Arc<Mutex<HashMap<String, Vec<llm_connector::types::Tool>>>> {
    TOOL_CACHE.get_or_init(|| Arc::new(Mutex::new(HashMap::new())))
}
```

### 2. 实现工具缓存逻辑

```rust
fn handle_tool_caching(
    model: &str, 
    request_tools: Option<Vec<Value>>
) -> Option<Vec<llm_connector::types::Tool>> {
    let cache_key = format!("model_{}", model);
    let cache = get_tool_cache();
    
    match request_tools {
        Some(tools) if !tools.is_empty() => {
            // 有工具定义：转换并缓存
            let converted = convert::openai_tools_to_llm(tools);
            if let Ok(mut cache_map) = cache.lock() {
                cache_map.insert(cache_key, converted.clone());
            }
            Some(converted)
        }
        _ => {
            // 无工具定义：从缓存获取
            if let Ok(cache_map) = cache.lock() {
                cache_map.get(&cache_key).cloned()
            } else {
                None
            }
        }
    }
}
```

### 3. 集成到请求处理

```rust
// 替换原来的工具转换逻辑
let tools = handle_tool_caching(&request.model, request.tools);
```

## 工作原理

### 缓存策略
- **缓存键**：`model_{model_name}` - 每个模型独立缓存
- **缓存时机**：当请求包含工具定义时
- **使用时机**：当请求不包含工具定义时

### 流程图
```
请求到达
    ↓
有工具定义？
    ├─ 是 → 转换工具 → 缓存工具 → 使用工具
    └─ 否 → 查找缓存 → 有缓存？
                        ├─ 是 → 使用缓存的工具
                        └─ 否 → 无工具调用
```

## 测试验证

### 1. 运行测试脚本

```bash
./scripts/test-tool-persistence.sh "your-aliyun-api-key"
```

### 2. 测试场景

1. **初始请求**：发送带工具定义的请求
   - ✅ 工具被缓存
   - ✅ 模型正确调用工具

2. **后续请求**：发送不带工具定义的请求
   - ✅ 使用缓存的工具定义
   - ✅ 模型继续能够调用工具

3. **不同模型**：切换到其他模型
   - ✅ 独立的工具缓存
   - ✅ 不会混用其他模型的工具

### 3. 日志验证

```bash
# 查看缓存日志
grep -E "(缓存|cached|💾|🔄)" /tmp/tool-persistence-test.log

# 查看工具转换日志  
grep -E "(Converted.*tools|🔧)" /tmp/tool-persistence-test.log
```

## 影响范围

### ✅ 解决的问题
- 修复 Zed 工具调用后的"blank tool"问题
- 确保工具功能在整个对话过程中保持可用
- 提供更好的用户体验

### ✅ 兼容性
- 兼容所有支持工具调用的模型
- 兼容 Ollama 协议规范
- 不影响其他客户端的使用

### ✅ 性能优化
- 内存中缓存，访问速度快
- 按模型独立缓存，避免冲突
- 自动清理机制（进程重启时清空）

## 使用方法

### 1. 重新构建

```bash
cargo build --release
```

### 2. 启动服务

```bash
./scripts/zed-qwen3-coder.sh "your-aliyun-api-key"
```

### 3. 在 Zed 中使用

1. 发起第一次工具调用（Zed 会发送工具定义）
2. 继续对话（Zed 不发送工具定义，但 llm-link 会使用缓存）
3. 享受持续的工具调用功能 🎉

## 相关文件

- `src/api/ollama.rs` - 工具缓存实现
- `scripts/test-tool-persistence.sh` - 功能测试脚本
- `scripts/zed-qwen3-coder.sh` - Qwen3-Coder-Plus 启动脚本

## 技术细节

### 线程安全
- 使用 `Arc<Mutex<HashMap>>` 确保多线程安全
- 使用 `OnceLock` 实现单例模式

### 内存管理
- 缓存在进程生命周期内有效
- 进程重启时自动清空缓存
- 未来可考虑添加 TTL 或 LRU 清理机制

### 错误处理
- 缓存失败时降级到无工具模式
- 不影响正常的聊天功能
- 详细的日志记录便于调试

---

🎉 **现在 Zed + Qwen3-Coder-Plus 的工具调用功能可以在整个对话过程中保持可用了！**
