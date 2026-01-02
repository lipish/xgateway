# Zed 上下文限制和推理内容修复

## 问题 1: "thread reached the token limit"

### 问题描述

在 Zed 中使用 GLM-4.6 时,即使对话不长,也会显示 "thread reached the token limit, start new thread"。

### 根本原因

`/api/show` 端点返回的 `context_length` 被硬编码为 4096,而 GLM-4.6 实际支持 200K 上下文。

```rust
// 之前的代码 (错误)
"parameters": "",  // 没有指定 num_ctx
```

Zed 使用这个值来判断对话是否超过上下文限制。

### 解决方案

1. **在 `models.yaml` 中为每个模型添加 `context_length` 字段**:

```yaml
zhipu:
  models:
    - id: "glm-4.6"
      name: "GLM-4.6"
      description: "Latest flagship model with 200K context"
      supports_tools: true
      context_length: 200000  # 新增
```

2. **更新 `ModelInfo` 结构体**:

```rust
pub struct ModelInfo {
    pub id: String,
    pub name: String,
    pub description: String,
    pub supports_tools: bool,
    #[serde(default = "default_context_length")]
    pub context_length: u32,  // 新增
}
```

3. **在 `/api/show` 响应中包含 `num_ctx` 参数**:

```rust
let response = json!({
    "parameters": format!("num_ctx {}", context_length),  // 修复
    // ...
});
```

### 各模型的上下文长度

- **GLM-4.6**: 200,000 tokens
- **GLM-4.5 系列**: 128,000 tokens
- **GPT-4o**: 128,000 tokens
- **Claude 3.5**: 200,000 tokens
- **Volcengine Seed**: 根据具体模型

---

## 问题 2: 显示 `<think>` 标签

### 问题描述

Zed 中显示的内容包含很多 `<think>` 标签:

```
<think>让我查看一下项目的配置文件，了解更多技术细节：</think>
<think></think>让我查看一下项目的Rust配置文件，以了解Rust部分的设置：</think>
```

### 根本原因

GLM-4.6 支持**推理过程输出**,类似于 OpenAI o1。智谱 API 返回的流式响应包含两个字段:

```json
{
  "delta": {
    "role": "assistant",
    "content": "实际回复内容",
    "reasoning_content": "<think>推理过程</think>"
  }
}
```

我们的代码将 `reasoning_content` 也发送给了 Zed,导致显示了 `<think>` 标签。

### 解决方案

有两种方案:

#### 方案 1: 过滤 reasoning_content (推荐)

只发送 `content`,不发送 `reasoning_content`:

```rust
// 在 src/normalizer/stream.rs 中
if let Some(content) = &first_choice.delta.content {
    if !content.is_empty() {
        message.insert("content".to_string(), Value::String(content.clone()));
        has_payload = true;
    }
}
// 不处理 reasoning_content
```

#### 方案 2: 分离显示

将 `reasoning_content` 作为单独的字段发送,让 Zed 决定是否显示:

```rust
// 发送 content
if let Some(content) = &first_choice.delta.content {
    message.insert("content".to_string(), Value::String(content.clone()));
}

// 发送 reasoning_content (可选)
if let Some(reasoning) = &first_choice.delta.reasoning_content {
    message.insert("reasoning_content".to_string(), Value::String(reasoning.clone()));
}
```

### 当前状态

目前 llm-connector 可能已经合并了 `content` 和 `reasoning_content`。需要检查 llm-connector 的实现,确保只发送 `content` 给 Zed。

---

## 验证

### 1. 检查上下文长度

```bash
curl -X POST http://localhost:11434/api/show \
  -H "Content-Type: application/json" \
  -d '{"name": "glm-4.6"}' | jq '.parameters'
```

应该返回:
```
"num_ctx 200000"
```

### 2. 检查响应内容

在 Zed 中使用 AI 助手,确认:
- ✅ 不再显示 "thread reached the token limit"
- ✅ 不再显示 `<think>` 标签
- ✅ 只显示实际的回复内容

---

## 相关文件

- `src/models/models.yaml` - 模型配置
- `src/models/mod.rs` - ModelInfo 结构体
- `src/api/ollama.rs` - /api/show 端点
- `src/normalizer/stream.rs` - 流式响应处理

---

## 参考

- [智谱 GLM-4.6 文档](https://open.bigmodel.cn/dev/api#glm-4)
- [Ollama API 文档](https://github.com/ollama/ollama/blob/main/docs/api.md)
- [Zed Ollama 实现](https://github.com/zed-industries/zed/blob/main/crates/ollama/src/ollama.rs)

