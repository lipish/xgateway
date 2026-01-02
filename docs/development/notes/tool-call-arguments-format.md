# 工具调用 Arguments 格式修复

## 问题描述

在 Zed 中使用 llm-link 时,即使模型返回了工具调用,Zed 仍然报错:

```
Unable to parse chat response: invalid value: map, expected map with a single key at line 1 column 284
```

## 根本原因

通过查看 Zed 源代码 (`/Users/mac-m4/github/zed/crates/ollama/src/ollama.rs`),发现问题在于 `tool_calls` 中 `arguments` 字段的格式:

### llm-connector 格式 (我们返回的)

```rust
pub struct ToolCall {
    pub function: FunctionCall {
        pub name: String,
        pub arguments: String,  // ← JSON 字符串
    }
}
```

返回的 JSON:
```json
{
  "tool_calls": [{
    "function": {
      "name": "get_weather",
      "arguments": "{\"location\": \"Beijing\"}"  // ← 字符串
    }
  }]
}
```

### Zed 期望的格式

```rust
pub struct OllamaToolCall {
    pub function: OllamaToolCallFunction {
        pub name: String,
        pub arguments: Value,  // ← JSON 对象
    }
}
```

期望的 JSON:
```json
{
  "tool_calls": [{
    "function": {
      "name": "get_weather",
      "arguments": {"location": "Beijing"}  // ← 对象
    }
  }]
}
```

**关键区别**: Zed 期望 `arguments` 是 JSON 对象,而不是 JSON 字符串!

## 解决方案

在流式响应处理中,将 `arguments` 从字符串解析为 JSON 对象:

### 修改文件: `src/normalizer/stream.rs`

```rust
// 之前的代码 (错误)
if let Ok(tool_calls_value) = serde_json::to_value(tool_calls) {
    message.insert("tool_calls".to_string(), tool_calls_value);
}

// 修复后的代码
let mut ollama_tool_calls = Vec::new();
for tc in tool_calls {
    let mut ollama_tc = serde_json::Map::new();
    
    // Add function object
    let mut function = serde_json::Map::new();
    function.insert("name".to_string(), Value::String(tc.function.name.clone()));
    
    // Parse arguments from string to JSON object
    let arguments_value = if tc.function.arguments.is_empty() {
        Value::Object(serde_json::Map::new())
    } else {
        match serde_json::from_str::<Value>(&tc.function.arguments) {
            Ok(v) => v,
            Err(_) => {
                tracing::warn!("⚠️ Failed to parse tool arguments as JSON: {}", tc.function.arguments);
                Value::String(tc.function.arguments.clone())
            }
        }
    };
    function.insert("arguments".to_string(), arguments_value);
    
    ollama_tc.insert("function".to_string(), Value::Object(function));
    ollama_tool_calls.push(Value::Object(ollama_tc));
}

message.insert("tool_calls".to_string(), Value::Array(ollama_tool_calls));
```

## 验证

### 1. 编译

```bash
cargo build --release
```

### 2. 启动服务

```bash
./target/release/llm-link \
  --protocols ollama \
  --provider zhipu \
  --model glm-4.6 \
  --llm-api-key "$ZHIPU_API_KEY"
```

### 3. 测试工具调用

```bash
bash tests/test_tool_call_format.sh
```

### 4. 检查响应格式

响应应该包含:

```json
{
  "message": {
    "role": "assistant",
    "content": "",
    "tool_calls": [{
      "function": {
        "name": "get_weather",
        "arguments": {
          "location": "Beijing"
        }
      }
    }]
  }
}
```

注意 `arguments` 是一个对象 `{...}`,而不是字符串 `"{...}"`。

### 5. 在 Zed 中验证

1. 重启 llm-link 服务
2. 在 Zed 中使用 AI 助手
3. 不再出现 "Unable to parse chat response" 错误
4. 工具调用正常工作

## 影响范围

- ✅ 修复 Zed 解析工具调用响应的错误
- ✅ 符合 Ollama API 规范
- ✅ 兼容所有支持工具调用的模型
- ✅ 流式和非流式响应都正确处理

## 相关文件

- `src/normalizer/stream.rs` - 流式响应处理
- `tests/test_tool_call_format.sh` - 格式验证测试
- `docs/fixes/zed-tools-detection.md` - 工具检测修复
- `docs/fixes/ollama-tools-support.md` - Ollama 工具支持修复

## 参考

- [Zed Ollama 实现](https://github.com/zed-industries/zed/blob/main/crates/ollama/src/ollama.rs)
- [Ollama API 文档](https://github.com/ollama/ollama/blob/main/docs/api.md)

