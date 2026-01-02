# Think 标签过滤修复

## 问题描述

在 Zed 中使用 GLM-4.6 时,显示的内容包含 `<think>` 和 `</think>` 标签:

```
现在让我查看 `Cargo.toml` 和 `pyproject.toml` 文件，了解项目的依赖和结构：</think>
让我查看 `pyproject.toml` 文件：</think></think>
# Folders:
agent-ui/web/src/components
</think></think>
```

## 根本原因

GLM-4.6 的推理内容**直接包含在 `content` 字段中**,而不是在 `reasoning_content` 字段中:

```json
{
  "choices": [{
    "delta": {
      "content": "<think>推理过程</think>实际内容"
    }
  }]
}
```

之前的修复只过滤了 `reasoning_content` 字段,但没有处理 `content` 中的 `<think>` 标签。

## 解决方案

在 `src/normalizer/stream.rs` 中添加 `filter_think_tags` 函数,在发送给 Zed 之前过滤掉所有 `<think>` 标签。

### 实现

```rust
/// Filter out <think> tags from content
fn filter_think_tags(content: &str) -> String {
    let mut result = content.to_string();
    
    // Remove <think>...</think> blocks (non-greedy)
    while let Some(start) = result.find("<think>") {
        if let Some(end) = result[start..].find("</think>") {
            let end_pos = start + end + "</think>".len();
            result.replace_range(start..end_pos, "");
        } else {
            // If no closing tag, remove from <think> to end
            result.replace_range(start.., "");
            break;
        }
    }
    
    // Also remove standalone </think> tags
    result = result.replace("</think>", "");
    result = result.replace("<think>", "");
    
    result.trim().to_string()
}
```

### 使用

```rust
if let Some(content) = &first_choice.delta.content {
    if !content.is_empty() {
        // Filter out <think> tags from content
        content_text = filter_think_tags(content);
    }
}
```

## 测试

### 单元测试

```bash
cargo test filter_think_tags --lib
```

测试用例:
- ✅ 简单的 `<think>` 标签
- ✅ 多个 `<think>` 标签
- ✅ 嵌套的 `<think>` 标签
- ✅ 独立的 `</think>` 标签
- ✅ 没有标签的正常内容
- ✅ 空内容

### 集成测试

```bash
# 重启服务
pkill -f "llm-link.*ollama"
./target/release/llm-link \
  --protocols ollama \
  --provider zhipu \
  --model glm-4.6 \
  --llm-api-key "$ZHIPU_API_KEY"

# 在 Zed 中测试
# 发送需要推理的问题,确认不再显示 <think> 标签
```

## 效果

### 修复前

Zed 显示:
```
现在让我查看配置文件：</think>
让我分析一下：</think></think>
# 实际内容
</think>
```

### 修复后

Zed 显示:
```
现在让我查看配置文件：
让我分析一下：
# 实际内容
```

## 性能考虑

- 过滤操作在每个 chunk 上执行,但只处理非空的 `content`
- 使用简单的字符串查找和替换,性能开销很小
- 对于大多数 chunk (没有 `<think>` 标签),只需要一次 `find` 操作

## 相关文件

- `src/normalizer/stream.rs` - 过滤函数实现
- `docs/fixes/reasoning-content-filtering.md` - 推理内容过滤总览
- `docs/fixes/zed-context-and-reasoning.md` - 上下文和推理问题

## 未来改进

如果需要支持其他推理标签格式,可以扩展 `filter_think_tags` 函数:

```rust
fn filter_reasoning_tags(content: &str) -> String {
    let mut result = content.to_string();
    
    // Filter <think> tags (GLM-4.6)
    result = filter_think_tags(&result);
    
    // Filter <reasoning> tags (other models)
    result = filter_tag(&result, "reasoning");
    
    // Filter <thought> tags (OpenAI o1)
    result = filter_tag(&result, "thought");
    
    result
}
```

## 参考

- [智谱 GLM-4.6 文档](https://open.bigmodel.cn/dev/api#glm-4)
- [OpenAI o1 推理模型](https://platform.openai.com/docs/guides/reasoning)

