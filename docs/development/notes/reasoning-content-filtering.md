# 推理内容过滤修复

## 问题描述

在 Zed 中使用 GLM-4.6 时,显示的内容包含很多 `<think>` 标签:

```
<think>让我查看一下项目的配置文件，了解更多技术细节：</think>
<think></think>让我查看一下项目的Rust配置文件，以了解Rust部分的设置：</think>
```

## 根本原因

GLM-4.6 支持**推理过程输出**,类似于 OpenAI o1。智谱 API 返回的流式响应包含两个字段:

```json
{
  "choices": [{
    "delta": {
      "role": "assistant",
      "content": "实际回复内容",           // ← 用户应该看到的
      "reasoning_content": "<think>推理过程</think>"  // ← 内部思考过程
    }
  }]
}
```

之前的代码使用了 `stream_chunk.get_content()`,这个方法会 fallback 到 `reasoning_content`,导致推理内容被发送给 Zed。

## 架构设计原则

### ✅ 正确的分层

```
┌─────────────────────────────────────┐
│         Zed Editor                  │  应用层
└─────────────────────────────────────┘
                 ↑
                 │ 过滤后的内容（无 <think> 标签）
                 │
┌─────────────────────────────────────┐
│         llm-link                    │  适配层
│  - 过滤推理内容                      │  ← 在这里处理！
│  - 适配 Zed 协议                     │
└─────────────────────────────────────┘
                 ↑
                 │ 完整的流式数据
                 │
┌─────────────────────────────────────┐
│       llm-connector                 │  通用接入层
│  - 提供统一接口                      │  ← 保持通用性
│  - 支持所有推理模型                  │
└─────────────────────────────────────┘
```

### 职责划分

**llm-connector (通用接入层)**
- ✅ 提供统一的 LLM 协议抽象
- ✅ 保持通用性,提供完整的数据访问能力
- ❌ 不应该针对特定应用(如 Zed)做定制化处理

**llm-link (应用适配层)**
- ✅ 将 llm-connector 的数据适配到具体应用(Zed)
- ✅ 根据 Zed 的需求过滤/转换数据
- ✅ 决定是否显示推理内容

## 解决方案

### 修改文件: `src/normalizer/stream.rs`

#### 1. 只使用 `delta.content`,不使用 `reasoning_content`

```rust
// 之前的代码 (错误)
if let Some(content) = stream_chunk.get_content() {
    content_text = content.to_string();
}

// 修复后的代码
// Only use delta.content, NOT reasoning_content
// This prevents <think> tags from being sent to Zed
if let Some(first_choice) = stream_chunk.choices.get(0) {
    if let Some(content) = &first_choice.delta.content {
        if !content.is_empty() {
            content_text = content.clone();
        }
    }
}
```

#### 2. 不收集推理内容到 `thinking_buffer`

```rust
// 注释掉推理内容收集
// Don't collect reasoning content for Zed
// Zed doesn't need to see the thinking process (<think> tags)
// If needed in the future, this can be controlled by a config flag
// if let Some(reason_text) = first_choice.delta.reasoning_any() {
//     ...
// }
```

## 效果

### 修复前

Zed 显示:
```
<think>让我分析一下这个问题</think>
<think>首先需要查看配置文件</think>
让我查看配置文件的内容
```

### 修复后

Zed 显示:
```
让我查看配置文件的内容
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

### 3. 在 Zed 中测试

1. 打开 Zed AI 助手
2. 发送一个需要推理的问题
3. 确认:
   - ✅ 不再显示 `<think>` 标签
   - ✅ 只显示实际的回复内容
   - ✅ 推理过程被正确过滤

## 未来扩展

如果将来需要支持显示推理过程(例如在调试模式下),可以添加配置选项:

```rust
pub struct StreamConfig {
    pub include_reasoning: bool,  // 是否包含推理内容
}

// 在流式处理中
if config.include_reasoning {
    if let Some(reasoning) = &first_choice.delta.reasoning_content {
        // 发送推理内容
    }
}
```

## 相关文件

- `src/normalizer/stream.rs` - 流式响应处理 (已修改)
- `docs/fixes/zed-context-and-reasoning.md` - 上下文和推理问题总览

## 参考

- [智谱 GLM-4.6 文档](https://open.bigmodel.cn/dev/api#glm-4)
- [OpenAI o1 推理模型](https://platform.openai.com/docs/guides/reasoning)

