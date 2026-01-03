use super::Client;
use anyhow::{anyhow, Result};
use llm_connector::{
    types::{ChatRequest, Usage as ConnectorUsage},
    StreamFormat,
};
use serde_json::{Map, Value};
use tokio_stream::wrappers::UnboundedReceiverStream;

/// Filter out <think> tags from content
/// GLM-4.6 and similar models may include reasoning process in <think></think> tags
fn filter_think_tags(content: &str) -> String {
    // Use simple string replacement to remove <think>...</think> tags
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

    // Also remove standalone </think> tags (in case of malformed HTML)
    result = result.replace("</think>", "");
    result = result.replace("<think>", "");

    // DON'T trim! Whitespace and newlines are important in streaming chunks
    // Each chunk might be just a newline or space, which is part of the formatting
    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_filter_think_tags() {
        // Test simple think tag
        assert_eq!(
            filter_think_tags("<think>reasoning</think>actual content"),
            "actual content"
        );

        // Test multiple think tags
        assert_eq!(
            filter_think_tags("<think>first</think>content<think>second</think>"),
            "content"
        );

        // Test nested think tags
        assert_eq!(
            filter_think_tags("<think>outer<think>inner</think></think>text"),
            "text"
        );

        // Test standalone closing tags
        assert_eq!(
            filter_think_tags("content</think></think>"),
            "content"
        );

        // Test no think tags
        assert_eq!(
            filter_think_tags("normal content"),
            "normal content"
        );

        // Test empty content
        assert_eq!(
            filter_think_tags("<think></think>"),
            ""
        );

        // Test whitespace preservation (important for streaming!)
        assert_eq!(
            filter_think_tags("\n"),
            "\n"
        );

        assert_eq!(
            filter_think_tags("  "),
            "  "
        );

        assert_eq!(
            filter_think_tags("<think>test</think>\n"),
            "\n"
        );

        // Test newlines in content
        assert_eq!(
            filter_think_tags("line1\nline2"),
            "line1\nline2"
        );
    }
}

impl Client {
    /// Send a streaming chat request with specified format (Ollama-style response)
    ///
    /// This method returns streaming responses in Ollama API format, which is used by
    /// Ollama-compatible clients like Zed.dev.
    #[allow(dead_code)]
    pub async fn chat_stream_with_format(
        &self,
        model: &str,
        messages: Vec<llm_connector::types::Message>,
        format: StreamFormat,
    ) -> Result<UnboundedReceiverStream<String>> {
        self.chat_stream_with_format_and_tools(model, messages, None, format).await
    }

    /// Send a streaming chat request with specified format and tools (Ollama-style response)
    ///
    /// This method returns streaming responses in Ollama API format, which is used by
    /// Ollama-compatible clients like Zed.dev.
    #[allow(dead_code)]
    pub async fn chat_stream_with_format_and_tools(
        &self,
        model: &str,
        messages: Vec<llm_connector::types::Message>,
        tools: Option<Vec<llm_connector::types::Tool>>,
        format: StreamFormat,
    ) -> Result<UnboundedReceiverStream<String>> {
        use futures_util::StreamExt;

        // Messages are already in llm-connector format
        let request = ChatRequest {
            model: model.to_string(),
            messages,
            stream: Some(true),
            tools,
            ..Default::default()
        };

        tracing::info!("Requesting streaming from LLM connector (Ollama format) with {} tools...",
                      request.tools.as_ref().map_or(0, |t| t.len()));

        // Debug: log messages being sent to LLM connector
        for (i, msg) in request.messages.iter().enumerate() {
            tracing::debug!("📨 Message {}: role={:?}, tool_call_id={:?}, has_tool_calls={}",
                          i, msg.role, msg.tool_call_id, msg.tool_calls.is_some());
        }

        // Use real streaming API
        let mut stream = self.llm_client.chat_stream(&request).await
            .map_err(|e| anyhow!("LLM connector streaming error: {}", e))?;

        let (tx, rx) = tokio::sync::mpsc::unbounded_channel();
        let model_name = model.to_string();
        let mut last_finish_reason: Option<String> = None;
        let mut last_usage: Option<ConnectorUsage> = None;
        let mut thinking_buffer = String::new();

        tokio::spawn(async move {
            tracing::debug!("Starting to process stream chunks (Ollama format)...");
            let mut chunk_count = 0;

            while let Some(chunk) = stream.next().await {
                tracing::debug!("📥 Received raw chunk from stream");

                match chunk {
                    Ok(stream_chunk) => {
                        tracing::debug!("Chunk OK, checking for content/tool_calls...");

                        if let Some(usage) = stream_chunk.usage.clone() {
                            last_usage = Some(usage);
                        }

                        if let Some(first_choice) = stream_chunk.choices.first() {
                            if let Some(reason) = first_choice.finish_reason.clone() {
                                last_finish_reason = Some(reason);
                            }
                        }

                        let mut message = Map::new();
                        message.insert("role".to_string(), Value::String("assistant".to_string()));
                        message.insert("content".to_string(), Value::String(String::new()));
                        message.insert("images".to_string(), Value::Null);

                        let mut has_payload = false;
                        let mut content_text = String::new();

                        // Only use delta.content, NOT reasoning_content
                        // This prevents <think> tags from being sent to Zed
                        if let Some(first_choice) = stream_chunk.choices.first() {
                            if let Some(content) = &first_choice.delta.content {
                                if !content.is_empty() {
                                    // Filter out <think> tags from content
                                    // GLM-4.6 sometimes includes reasoning in <think></think> tags
                                    content_text = filter_think_tags(content);

                                    // Only count as payload if there's actual content after filtering
                                    if content_text.is_empty() && !content.is_empty() {
                                        tracing::debug!("🧠 Filtered entire chunk (was only <think> tags): {:?}",
                                                      content.chars().take(50).collect::<String>());
                                    }
                                }
                            }

                            // Log if we're filtering out reasoning content
                            if let Some(reasoning) = &first_choice.delta.reasoning_content {
                                if !reasoning.is_empty() {
                                    tracing::debug!("🧠 Filtered reasoning_content ({} chars): {:?}",
                                                  reasoning.len(),
                                                  reasoning.chars().take(50).collect::<String>());
                                }
                            }
                        }

                        if !content_text.is_empty() {
                            chunk_count += 1;
                            has_payload = true;
                            if chunk_count == 1 {
                                tracing::info!("📦 Received first streaming chunk ({} chars)", content_text.len());
                            } else {
                                tracing::debug!("📦 Received chunk #{} ({} chars)", chunk_count, content_text.len());
                            }
                        }

                        message.insert("content".to_string(), Value::String(content_text));

                        if let Some(first_choice) = stream_chunk.choices.first() {
                            if let Some(tool_calls) = &first_choice.delta.tool_calls {
                                if !tool_calls.is_empty() {
                                    // Convert tool_calls to Ollama format
                                    // Zed expects arguments to be a JSON object, not a string
                                    let mut ollama_tool_calls = Vec::new();
                                    for (i, tc) in tool_calls.iter().enumerate() {
                                        tracing::debug!("Processing tool call {}: name={}, args_len={}",
                                                      i, tc.function.name, tc.function.arguments.len());

                                        let mut ollama_tc = serde_json::Map::new();

                                        // Add tool call ID - this is crucial for Zed
                                        if !tc.id.is_empty() {
                                            ollama_tc.insert("id".to_string(), Value::String(tc.id.clone()));
                                            tracing::debug!("Tool call ID: {}", tc.id);
                                        } else {
                                            // Generate a unique ID if missing
                                            let generated_id = format!("call_{}", uuid::Uuid::new_v4().to_string().replace("-", "")[..8].to_string());
                                            ollama_tc.insert("id".to_string(), Value::String(generated_id.clone()));
                                            tracing::warn!("Generated tool call ID: {}", generated_id);
                                        }

                                        // Add type field
                                        ollama_tc.insert("type".to_string(), Value::String("function".to_string()));

                                        // Add function object
                                        let mut function = serde_json::Map::new();
                                        function.insert("name".to_string(), Value::String(tc.function.name.clone()));

                                        // Parse arguments from string to JSON object
                                        let arguments_value = if tc.function.arguments.is_empty() {
                                            Value::Object(serde_json::Map::new())
                                        } else {
                                            match serde_json::from_str::<Value>(&tc.function.arguments) {
                                                Ok(v) => {
                                                    tracing::debug!("Parsed tool arguments: {}", serde_json::to_string(&v).unwrap_or_default());
                                                    v
                                                }
                                                Err(e) => {
                                                    // If parsing fails, wrap in an object
                                                    tracing::warn!("Failed to parse tool arguments as JSON: {} - Error: {}", tc.function.arguments, e);
                                                    Value::String(tc.function.arguments.clone())
                                                }
                                            }
                                        };
                                        function.insert("arguments".to_string(), arguments_value);

                                        ollama_tc.insert("function".to_string(), Value::Object(function));

                                        tracing::debug!("Converted tool call: {}", serde_json::to_string(&ollama_tc).unwrap_or_default());
                                        ollama_tool_calls.push(Value::Object(ollama_tc));
                                    }

                                    message.insert("tool_calls".to_string(), Value::Array(ollama_tool_calls));
                                    has_payload = true;
                                    tracing::debug!("Chunk includes {} tool call(s)", tool_calls.len());
                                }
                            }

                            // Don't collect reasoning content for Zed
                            // Zed doesn't need to see the thinking process (<think> tags)
                            // If needed in the future, this can be controlled by a config flag
                            // if let Some(reason_text) = first_choice.delta.reasoning_any() {
                            //     if !reason_text.is_empty() {
                            //         if !thinking_buffer.is_empty() {
                            //             thinking_buffer.push(' ');
                            //         }
                            //         thinking_buffer.push_str(reason_text);
                            //     }
                            // }
                        }

                        if !has_payload {
                            tracing::debug!("Chunk has no content/tool_calls (likely metadata or finish chunk): {:?}",
                                          serde_json::to_string(&stream_chunk).unwrap_or_default().chars().take(200).collect::<String>());
                            continue;
                        }

                        // Build Ollama-format streaming response
                        let response_chunk = serde_json::json!({
                            "model": &model_name,
                            "created_at": chrono::Utc::now().to_rfc3339(),
                            "message": Value::Object(message.clone()),
                            "done": false
                        });

                        let formatted_data = match format {
                            StreamFormat::SSE => format!("data: {}\n\n", response_chunk),
                            StreamFormat::NDJSON => format!("{}\n", response_chunk),
                            StreamFormat::Json => response_chunk.to_string(),
                        };

                        if tx.send(formatted_data).is_err() {
                            tracing::warn!("Failed to send chunk to receiver (client disconnected?)");
                            break;
                        }
                        tracing::debug!("Sent chunk #{} to client", chunk_count);
                    }
                    Err(e) => {
                        tracing::error!("Stream error: {:?}", e);
                        break;
                    }
                }
            }

            tracing::info!("Stream processing completed. Total chunks: {}", chunk_count);

            // Send final message
            let mut final_message = Map::new();
            final_message.insert("role".to_string(), Value::String("assistant".to_string()));
            let final_content = String::new();
            if !thinking_buffer.is_empty() {
                final_message.insert(
                    "thinking".to_string(),
                    Value::String(thinking_buffer.clone()),
                );
                thinking_buffer.clear();
            }
            final_message.insert("content".to_string(), Value::String(final_content));
            final_message.insert("images".to_string(), Value::Null);

            let mut final_chunk = Map::new();
            final_chunk.insert("model".to_string(), Value::String(model_name.clone()));
            final_chunk.insert(
                "created_at".to_string(),
                Value::String(chrono::Utc::now().to_rfc3339()),
            );
            final_chunk.insert("message".to_string(), Value::Object(final_message));
            final_chunk.insert("done".to_string(), Value::Bool(true));

            let done_reason = last_finish_reason.unwrap_or_else(|| "stop".to_string());
            final_chunk.insert("done_reason".to_string(), Value::String(done_reason));

            if let Some(usage) = last_usage {
                final_chunk.insert(
                    "prompt_eval_count".to_string(),
                    Value::Number(usage.prompt_tokens.into()),
                );
                final_chunk.insert(
                    "eval_count".to_string(),
                    Value::Number(usage.completion_tokens.into()),
                );
            }

            let final_chunk_value = Value::Object(final_chunk);

            let formatted_final = match format {
                StreamFormat::SSE => format!("data: {}\n\n", final_chunk_value),
                StreamFormat::NDJSON => format!("{}\n", final_chunk_value),
                StreamFormat::Json => final_chunk_value.to_string(),
            };
            let _ = tx.send(formatted_final);
            tracing::debug!("🏁 Sent final chunk");
        });

        Ok(UnboundedReceiverStream::new(rx))
    }

    /// Send a streaming chat request for OpenAI API (OpenAI-style response)
    ///
    /// This method returns streaming responses in OpenAI API format, which is used by
    /// OpenAI-compatible clients like Codex CLI.
    ///
    /// Key feature: Automatically corrects finish_reason from "stop" to "tool_calls"
    /// when tool_calls are detected in the stream.
    #[allow(dead_code)]
    pub async fn chat_stream_openai(
        &self,
        model: &str,
        messages: Vec<llm_connector::types::Message>,
        tools: Option<Vec<llm_connector::types::Tool>>,
        format: StreamFormat,
    ) -> Result<UnboundedReceiverStream<String>> {
        use futures_util::StreamExt;

        // Messages are already in llm-connector format
        let request = ChatRequest {
            model: model.to_string(),
            messages,
            stream: Some(true),
            tools,
            ..Default::default()
        };

        tracing::info!("Requesting streaming from LLM connector...");

        // Use real streaming API
        let mut stream = self.llm_client.chat_stream(&request).await
            .map_err(|e| anyhow!("LLM connector streaming error: {}", e))?;

        let (tx, rx) = tokio::sync::mpsc::unbounded_channel();
        let model_name = model.to_string();

        tokio::spawn(async move {
            tracing::info!("Starting to process stream chunks (OpenAI format)...");
            let mut chunk_count = 0;
            let mut has_tool_calls = false;  // Track if tool_calls detected
            
            // Track tool call IDs by index for Codex CLI compatibility
            // Codex uses `id` field to accumulate arguments across chunks,
            // but llm-connector only includes `id` in the first chunk.
            // We remember the id for each index and inject it into subsequent chunks.
            let mut tool_call_ids: std::collections::HashMap<usize, String> = std::collections::HashMap::new();

            while let Some(chunk) = stream.next().await {
                tracing::debug!("📥 Received raw chunk from stream");

                match chunk {
                    Ok(stream_chunk) => {
                        tracing::debug!("Chunk OK, checking for content or tool_calls...");

                        // Build delta object
                        let mut delta = serde_json::json!({});
                        let mut has_data = false;

                        // Check for content
                        if let Some(content) = stream_chunk.get_content() {
                            if !content.is_empty() {
                                delta["content"] = serde_json::json!(content);
                                has_data = true;
                                chunk_count += 1;
                                tracing::info!("📦 Received chunk #{}: '{}' ({} chars)", chunk_count, content, content.len());
                            }
                        }

                        // Check for tool_calls (extract from choices[0].delta.tool_calls)
                        if let Some(first_choice) = stream_chunk.choices.first() {
                            if let Some(tool_calls) = &first_choice.delta.tool_calls {
                                // Build tool_calls array with id injection for Codex compatibility
                                let mut tool_calls_array = Vec::new();
                                
                                for tc in tool_calls {
                                    let index = tc.index.unwrap_or(0);
                                    
                                    // Remember id from first chunk, inject into subsequent chunks
                                    if !tc.id.is_empty() {
                                        tool_call_ids.insert(index, tc.id.clone());
                                        tracing::debug!("Remembered tool call id for index {}: {}", index, tc.id);
                                    }
                                    
                                    // Build tool call object with id always present
                                    let mut tc_obj = serde_json::Map::new();
                                    
                                    // Always include id (from current chunk or remembered)
                                    if let Some(remembered_id) = tool_call_ids.get(&index) {
                                        tc_obj.insert("id".to_string(), Value::String(remembered_id.clone()));
                                    }
                                    
                                    // Include index
                                    tc_obj.insert("index".to_string(), Value::Number(index.into()));
                                    
                                    // Include type if present
                                    if !tc.call_type.is_empty() {
                                        tc_obj.insert("type".to_string(), Value::String(tc.call_type.clone()));
                                    }
                                    
                                    // Include function object
                                    let mut func_obj = serde_json::Map::new();
                                    if !tc.function.name.is_empty() {
                                        func_obj.insert("name".to_string(), Value::String(tc.function.name.clone()));
                                    }
                                    if !tc.function.arguments.is_empty() {
                                        func_obj.insert("arguments".to_string(), Value::String(tc.function.arguments.clone()));
                                    }
                                    if !func_obj.is_empty() {
                                        tc_obj.insert("function".to_string(), Value::Object(func_obj));
                                    }
                                    
                                    tool_calls_array.push(Value::Object(tc_obj));
                                }
                                
                                if !tool_calls_array.is_empty() {
                                    delta["tool_calls"] = Value::Array(tool_calls_array);
                                    has_data = true;
                                    has_tool_calls = true;
                                    chunk_count += 1;
                                    tracing::info!("Received chunk #{} with tool_calls: {} calls", chunk_count, tool_calls.len());
                                }
                            }
                        }

                        if has_data {
                            // Build OpenAI-standard streaming response format
                            let openai_chunk = serde_json::json!({
                                "id": "chatcmpl-123",
                                "object": "chat.completion.chunk",
                                "created": chrono::Utc::now().timestamp(),
                                "model": &model_name,
                                "choices": [{
                                    "index": 0,
                                    "delta": delta,
                                    "finish_reason": null
                                }]
                            });

                            let formatted_data = match format {
                                StreamFormat::SSE => format!("data: {}\n\n", openai_chunk),
                                StreamFormat::NDJSON => format!("{}\n", openai_chunk),
                                StreamFormat::Json => openai_chunk.to_string(),
                            };

                            // Send all chunks immediately (preserve streaming experience)
                            if tx.send(formatted_data).is_err() {
                                tracing::warn!("Failed to send chunk to receiver (client disconnected?)");
                                break;
                            }
                            tracing::debug!("Sent chunk #{} to client", chunk_count);
                        } else {
                            tracing::debug!("Chunk has no content or tool_calls (likely metadata or finish chunk)");
                        }
                    }
                    Err(e) => {
                        tracing::error!("Stream error: {:?}", e);
                        break;
                    }
                }
            }

            tracing::info!("Stream processing completed. Total chunks: {}", chunk_count);

            // Send final message at stream end
            // 🎯 Key fix: If tool_calls detected, finish_reason should be "tool_calls" not "stop"
            let finish_reason = if has_tool_calls {
                tracing::info!("🎯 Setting finish_reason to 'tool_calls' (detected tool_calls in stream)");
                "tool_calls"
            } else {
                "stop"
            };

            let final_chunk = serde_json::json!({
                "id": "chatcmpl-123",
                "object": "chat.completion.chunk",
                "created": chrono::Utc::now().timestamp(),
                "model": model_name,
                "choices": [{
                    "index": 0,
                    "delta": {},
                    "finish_reason": finish_reason
                }]
            });

            let formatted_final = match format {
                StreamFormat::SSE => format!("data: {}\n\ndata: [DONE]\n\n", final_chunk),
                StreamFormat::NDJSON => format!("{}\n", final_chunk),
                StreamFormat::Json => final_chunk.to_string(),
            };
            let _ = tx.send(formatted_final);
            tracing::info!("🏁 Sent final chunk and [DONE] marker");
        });

        Ok(UnboundedReceiverStream::new(rx))
    }
}

