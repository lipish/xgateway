use crate::adapter::drivers::minimax::MinimaxClient;
use crate::endpoints::emulators::convert;
use axum::body::Body;
use axum::response::Response;
use futures::StreamExt;
use serde_json::Value;
use std::convert::Infallible;
use tracing::info;

pub async fn handle_minimax_chat(
    model: &str,
    messages_value: Vec<Value>,
    stream: bool,
    api_key: Option<String>,
) -> Response {
    // Use direct MiniMax client for better compatibility
    if let Some(api_key) = api_key {
        let minimax_client = MinimaxClient::new(&api_key);

        if stream {
            handle_minimax_stream(&minimax_client, model, messages_value).await
        } else {
            // Handle non-streaming response
            match minimax_client.chat(model, messages_value).await {
                Ok(response) => {
                    info!("Chat response generated successfully (MiniMax direct)");
                    let ollama_response = convert::response_to_ollama_from_minimax(response);
                    Response::builder()
                        .status(200)
                        .header("content-type", "application/json")
                        .body(Body::from(serde_json::to_string(&ollama_response).unwrap()))
                        .unwrap()
                }
                Err(e) => {
                    info!("MiniMax direct request failed: {:?}", e);
                    Response::builder()
                        .status(500)
                        .header("content-type", "application/json")
                        .body(Body::from(
                            serde_json::json!({"error": "Chat request failed"}).to_string(),
                        ))
                        .unwrap()
                }
            }
        }
    } else {
        info!("Minimax API key not set in config");
        Response::builder()
            .status(500)
            .header("content-type", "application/json")
            .body(Body::from(
                serde_json::json!({"error": "API key not configured"}).to_string(),
            ))
            .unwrap()
    }
}

pub async fn handle_minimax_stream(
    minimax_client: &MinimaxClient,
    model: &str,
    messages_value: Vec<Value>,
) -> Response {
    // Handle streaming response
    match minimax_client.chat_stream(model, messages_value).await {
        Ok(stream) => {
            info!("MiniMax streaming started");

            let model_name = model.to_string();
            let in_think = std::sync::Arc::new(std::sync::Mutex::new(false));
            let in_think_clone = in_think.clone();
            let adapted_stream = stream.map(move |result| {
                let in_think = in_think_clone.clone();
                match result {
                    Ok(chunk) => {
                        let output = minimax_chunk_to_ollama_lines(&chunk, &model_name, &in_think);
                        Ok::<_, Infallible>(output)
                    }
                    Err(_) => Ok(String::new()),
                }
            });

            let body_stream = adapted_stream.map(|data| match data {
                Ok(s) => Ok::<_, Infallible>(axum::body::Bytes::from(s)),
                Err(_) => Ok(axum::body::Bytes::new()),
            });
            let body = Body::from_stream(body_stream);

            Response::builder()
                .status(200)
                .header("content-type", "application/x-ndjson")
                .body(body)
                .unwrap()
        }
        Err(e) => {
            info!("MiniMax streaming failed: {:?}", e);
            Response::builder()
                .status(500)
                .header("content-type", "application/json")
                .body(Body::from(
                    serde_json::json!({"error": "Streaming failed"}).to_string(),
                ))
                .unwrap()
        }
    }
}

pub fn minimax_chunk_to_ollama_lines(
    chunk: &str,
    model_name: &str,
    in_think: &std::sync::Arc<std::sync::Mutex<bool>>,
) -> String {
    // Parse each JSON line in the chunk
    let mut output = String::new();

    for line in chunk.lines() {
        if line.is_empty() {
            continue;
        }

        // Parse JSON line; skip on failure
        let Ok(json_data) = serde_json::from_str::<Value>(line) else {
            continue;
        };

        // Extract choices[0].delta.content as &str; skip if any step is missing
        let Some(choices) = json_data.get("choices").and_then(|c| c.as_array()) else {
            continue;
        };
        let Some(choice) = choices.first() else {
            continue;
        };
        let Some(delta) = choice.get("delta") else {
            continue;
        };
        let Some(content) = delta.get("content").and_then(|c| c.as_str()) else {
            continue;
        };

        // Track think blocks across chunks
        let mut in_think_block = in_think.lock().unwrap();

        // Check if we're entering a think block
        if content.contains("<think>") {
            *in_think_block = true;
        }

        // Check if we're exiting a think block
        if content.contains("</think>") {
            *in_think_block = false;
            continue;
        }

        // Skip content inside think blocks
        if *in_think_block {
            continue;
        }

        drop(in_think_block);

        // Clean up any remaining <think> tags
        let cleaned = MinimaxClient::clean_think_tags(content);

        if !cleaned.is_empty() {
            let ollama_chunk = serde_json::json!({
                "model": model_name,
                "created_at": chrono::Utc::now().to_rfc3339(),
                "message": {
                    "role": "assistant",
                    "content": cleaned,
                },
                "done": false
            });
            output.push_str(&format!("{}\n", ollama_chunk));
        }
    }

    output
}
