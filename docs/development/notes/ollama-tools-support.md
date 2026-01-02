# Ollama 协议工具调用支持修复

## 问题描述

在使用 Zed 连接 llm-link (Ollama 协议) 时,即使后端模型支持工具调用(如智谱 GLM-4.6),也无法获得工具调用响应。

## 根本原因

Ollama 协议的实现中缺少对 `tools` 参数的支持:

1. `OllamaChatRequest` 结构体没有 `tools` 字段
2. `/api/chat` 路由处理函数没有提取和传递 `tools` 参数
3. 底层的流式和非流式处理函数没有接受 `tools` 参数

## 解决方案

### 1. 添加 tools 字段到请求结构体

```rust
#[derive(Debug, Deserialize)]
pub struct OllamaChatRequest {
    pub model: String,
    pub messages: Vec<Value>,
    pub stream: Option<bool>,
    pub options: Option<Value>,
    pub tools: Option<Vec<Value>>,  // 新增
}
```

### 2. 更新路由处理函数

在 `/api/chat` 路由中提取 tools 参数:

```rust
// Extract tools parameter
let tools_value = req.get("tools")
    .and_then(|v| v.as_array())
    .cloned();
```

### 3. 更新处理函数链

- `handle_generic_chat` - 添加 `tools_value` 参数
- `handle_generic_chat_stream` - 添加 `tools` 参数
- `handle_generic_chat_nonstream` - 添加 `tools` 参数
- `handle_streaming_request` - 添加 `tools` 参数
- `handle_non_streaming_request` - 添加 `tools` 参数

### 4. 添加 Service 层方法

```rust
pub async fn chat_stream_ollama_with_tools(
    &self,
    model: Option<&str>,
    messages: Vec<llm_connector::types::Message>,
    tools: Option<Vec<llm_connector::types::Tool>>,
    format: StreamFormat,
) -> Result<UnboundedReceiverStream<String>>
```

### 5. 添加 Normalizer 层方法

```rust
pub async fn chat_stream_with_format_and_tools(
    &self,
    model: &str,
    messages: Vec<llm_connector::types::Message>,
    tools: Option<Vec<llm_connector::types::Tool>>,
    format: StreamFormat,
) -> Result<UnboundedReceiverStream<String>>
```

## 测试验证

使用智谱 GLM-4.6 测试工具调用:

```bash
bash tests/test_ollama_tools.sh
```

成功响应示例:

```json
{
  "created_at": "2025-11-17T13:43:22.230303+00:00",
  "done": false,
  "message": {
    "content": "",
    "images": null,
    "role": "assistant",
    "tool_calls": [{
      "function": {
        "arguments": "{\"location\": \"Beijing\"}",
        "name": "get_weather"
      },
      "id": "call_20251117214321ac7754cc86854aa8_0",
      "type": "function"
    }]
  },
  "model": "glm-4-flash"
}
```

## 影响范围

- ✅ Zed IDE 通过 Ollama 协议使用工具调用
- ✅ 其他使用 Ollama 协议的客户端
- ✅ 支持流式和非流式工具调用
- ✅ 兼容所有支持工具调用的后端模型(智谱、OpenAI、Anthropic 等)

## 相关文件

- `src/api/ollama.rs` - Ollama API 实现
- `src/service.rs` - Service 层
- `src/normalizer/stream.rs` - Normalizer 流式处理
- `tests/test_ollama_tools.sh` - 测试脚本

