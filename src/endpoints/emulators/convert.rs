use crate::engine::Response;
use anyhow::Result;
use llm_connector::types::{Function, Message as LlmMessage, MessageBlock, Role as LlmRole, Tool};
use serde_json::Value;

/// Convert OpenAI messages format to llm-connector format
#[allow(dead_code)]
pub fn openai_messages_to_llm(messages: Vec<Value>) -> Result<Vec<LlmMessage>> {
    let mut llm_messages = Vec::with_capacity(messages.len());

    for msg in messages {
        let role = msg["role"]
            .as_str()
            .ok_or_else(|| anyhow::anyhow!("Missing role"))?;

        // Determine the role
        let llm_role = match role {
            "system" => LlmRole::System,
            "user" => LlmRole::User,
            "assistant" => LlmRole::Assistant,
            "tool" => LlmRole::Tool,
            _ => return Err(anyhow::anyhow!("Unsupported role: {}", role)),
        };

        // Handle content (can be string, array, or null)
        let content = if msg["content"].is_null() {
            // Null content is allowed for assistant messages with tool_calls
            String::new()
        } else if let Some(content_str) = msg["content"].as_str() {
            // Simple string content
            content_str.to_string()
        } else if let Some(content_array) = msg["content"].as_array() {
            // Array content (e.g., from Codex with text and images)
            // Extract text parts and concatenate them
            let mut text_parts = Vec::with_capacity(content_array.len());
            for part in content_array {
                if let Some(text) = part["text"].as_str() {
                    text_parts.push(text);
                } else if let Some(text) = part.as_str() {
                    // Sometimes the array contains direct strings
                    text_parts.push(text);
                }
            }
            if text_parts.is_empty() {
                return Err(anyhow::anyhow!("Content array has no text parts"));
            }
            text_parts.join("\n")
        } else {
            return Err(anyhow::anyhow!(
                "Content must be string, array, or null, got: {:?}",
                msg["content"]
            ));
        };

        // Extract tool_calls if present (for assistant messages)
        let tool_calls = if role == "assistant" {
            msg.get("tool_calls")
                .and_then(|tc| serde_json::from_value(tc.clone()).ok())
        } else {
            None
        };

        // Extract tool_call_id if present (for tool messages)
        let tool_call_id = if role == "tool" {
            // First try standard tool_call_id field
            let tool_call_id = msg.get("tool_call_id")
                .and_then(|id| id.as_str())
                .map(|s| s.to_string());

            // If not found, try Zed's tool_name field as fallback
            let tool_call_id = if tool_call_id.is_none() {
                msg.get("tool_name")
                    .and_then(|name| name.as_str())
                    .map(|s| format!("zed_tool_{}", s)) // Prefix to distinguish from real tool_call_ids
            } else {
                tool_call_id
            };

            tracing::debug!("Tool message: tool_call_id={:?}, tool_name={:?}",
                          tool_call_id, msg.get("tool_name"));

            tool_call_id
        } else {
            None
        };

        // Debug logging for tool messages
        if role == "tool" {
            tracing::debug!("Converting tool message: role={}, tool_call_id={:?}, content_len={}",
                          role, tool_call_id, content.len());

            // Additional validation: ensure tool_call_id is not empty
            if let Some(ref id) = tool_call_id {
                if id.trim().is_empty() {
                    return Err(anyhow::anyhow!(
                        "Tool message has empty 'tool_call_id' field. Tool call ID must be a non-empty string."
                    ));
                }
                tracing::debug!("Tool message validation passed: tool_call_id='{}'", id);
            }
        }

        llm_messages.push(LlmMessage {
            role: llm_role,
            content: vec![MessageBlock::Text { text: content }],
            name: None,
            tool_calls,
            tool_call_id,
            reasoning_content: None,
            reasoning: None,
            thought: None,
            thinking: None,
        });
    }

    Ok(llm_messages)
}

/// Convert Response to OpenAI format
#[allow(dead_code)]
pub fn response_to_openai(response: Response) -> Value {
    let mut message = serde_json::json!({
        "role": "assistant",
        "content": response.content
    });

    // Add tool_calls if present
    if let Some(tool_calls) = response.tool_calls {
        message["tool_calls"] = tool_calls;
    }

    serde_json::json!({
        "id": uuid::Uuid::new_v4().to_string(),
        "object": "chat.completion",
        "created": chrono::Utc::now().timestamp(),
        "model": response.model,
        "choices": [{
            "index": 0,
            "message": message,
            "finish_reason": "stop"
        }],
        "usage": {
            "prompt_tokens": response.usage.prompt_tokens,
            "completion_tokens": response.usage.completion_tokens,
            "total_tokens": response.usage.total_tokens
        }
    })
}

/// Convert Response to Ollama format
#[allow(dead_code)]
pub fn response_to_ollama(response: Response) -> Value {
    let mut message = serde_json::json!({
        "role": "assistant",
        "content": response.content
    });

    if let Some(tool_calls) = response.tool_calls {
        message["tool_calls"] = tool_calls;
    }

    serde_json::json!({
        "model": response.model,
        "created_at": chrono::Utc::now().to_rfc3339(),
        "message": message,
        "done": true,
        "total_duration": 0,
        "load_duration": 0,
        "prompt_eval_count": response.usage.prompt_tokens,
        "prompt_eval_duration": 0,
        "eval_count": response.usage.completion_tokens,
        "eval_duration": 0
    })
}

/// Convert MiniMax API response to Ollama format
#[allow(dead_code)]
pub fn response_to_ollama_from_minimax(minimax_response: Value) -> Value {
    // Extract content from MiniMax response
    let content = minimax_response
        .get("choices")
        .and_then(|c| c.get(0))
        .and_then(|c| c.get("message"))
        .and_then(|m| m.get("content"))
        .and_then(|c| c.as_str())
        .unwrap_or("No response")
        .to_string();

    let model = minimax_response
        .get("model")
        .and_then(|m| m.as_str())
        .unwrap_or("MiniMax-M2")
        .to_string();

    serde_json::json!({
        "model": model,
        "created_at": chrono::Utc::now().to_rfc3339(),
        "message": {
            "role": "assistant",
            "content": content
        },
        "done": true,
        "total_duration": 0,
        "load_duration": 0,
        "prompt_eval_count": 0,
        "prompt_eval_duration": 0,
        "eval_count": 0,
        "eval_duration": 0
    })
}

/// Convert OpenAI tools format to llm-connector format
#[allow(dead_code)]
pub fn openai_tools_to_llm(tools: Vec<Value>) -> Vec<Tool> {
    tools
        .into_iter()
        .filter_map(|tool| {
            let tool_type = tool.get("type")?.as_str()?.to_string();
            let function = tool.get("function")?;

            Some(Tool {
                tool_type,
                function: Function {
                    name: function.get("name")?.as_str()?.to_string(),
                    description: function
                        .get("description")
                        .and_then(|d| d.as_str())
                        .map(String::from),
                    parameters: function.get("parameters")?.clone(),
                },
            })
        })
        .collect()
}

/// Convert model list to Ollama format
#[allow(dead_code)]
pub fn models_to_ollama(models: Vec<crate::engine::Model>) -> Vec<Value> {
    models
        .into_iter()
        .map(|model| {
            let family = model.id.split('-').next().unwrap_or("unknown");
            serde_json::json!({
                "name": model.id,
                "model": model.id,
                "modified_at": chrono::Utc::now().to_rfc3339(),
                "size": 1000000,
                "digest": format!("sha256:{}", "0".repeat(64)),
                "details": {
                    "parent_model": "",
                    "format": "gguf",
                    "family": family,
                    "families": [family],
                    "parameter_size": "7B",
                    "quantization_level": "Q4_K_M"
                },
                "expires_at": null
            })
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_tool_call_id_conversion() {
        let messages = vec![
            json!({
                "role": "user",
                "content": "What is the weather in Beijing?"
            }),
            json!({
                "role": "assistant",
                "content": null,
                "tool_calls": [
                    {
                        "id": "call_123",
                        "type": "function",
                        "function": {
                            "name": "get_weather",
                            "arguments": "{\"location\": \"Beijing\"}"
                        }
                    }
                ]
            }),
            json!({
                "role": "tool",
                "content": "The weather in Beijing is sunny, 25°C",
                "tool_call_id": "call_123"
            }),
            json!({
                "role": "user",
                "content": "What about Shanghai?"
            })
        ];

        let result = openai_messages_to_llm(messages);
        assert!(result.is_ok());

        let llm_messages = result.unwrap();
        assert_eq!(llm_messages.len(), 4);

        // Check that the tool message has the tool_call_id
        let tool_message = &llm_messages[2];
        assert_eq!(tool_message.role, LlmRole::Tool);
        assert_eq!(tool_message.tool_call_id, Some("call_123".to_string()));

        // Check that the assistant message has tool_calls
        let assistant_message = &llm_messages[1];
        assert_eq!(assistant_message.role, LlmRole::Assistant);
        assert!(assistant_message.tool_calls.is_some());
    }

    #[test]
    fn test_missing_tool_call_id() {
        let messages = vec![
            json!({
                "role": "tool",
                "content": "Some tool response"
                // Missing tool_call_id field - this is now allowed for compatibility
            })
        ];

        let result = openai_messages_to_llm(messages);
        assert!(result.is_ok());

        let llm_messages = result.unwrap();
        assert_eq!(llm_messages.len(), 1);

        let tool_message = &llm_messages[0];
        assert_eq!(tool_message.role, LlmRole::Tool);
        assert_eq!(tool_message.tool_call_id, None); // No tool_call_id is now allowed
    }

    #[test]
    fn test_empty_tool_call_id() {
        let messages = vec![
            json!({
                "role": "tool",
                "content": "Some tool response",
                "tool_call_id": ""  // Empty tool_call_id
            })
        ];

        let result = openai_messages_to_llm(messages);
        assert!(result.is_err());

        let error_msg = result.unwrap_err().to_string();
        assert!(error_msg.contains("Tool message has empty 'tool_call_id' field"));
    }
}

