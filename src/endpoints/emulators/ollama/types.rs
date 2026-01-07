use serde::Deserialize;
use serde_json::Value;
use std::sync::{Arc, Mutex, OnceLock};
use std::collections::HashMap;
use tracing::{info, warn};
use crate::endpoints::emulators::convert;

// 全局工具缓存，用于在对话过程中保持工具定义
static TOOL_CACHE: OnceLock<Arc<Mutex<HashMap<String, Vec<llm_connector::types::Tool>>>>> = OnceLock::new();

pub fn get_tool_cache() -> &'static Arc<Mutex<HashMap<String, Vec<llm_connector::types::Tool>>>> {
    TOOL_CACHE.get_or_init(|| Arc::new(Mutex::new(HashMap::new())))
}

/// 处理工具缓存逻辑
/// 如果请求包含工具，则缓存它们；如果没有工具但缓存中有，则使用缓存的工具
pub fn handle_tool_caching(
    model: &str,
    request_tools: Option<Vec<Value>>
) -> Option<Vec<llm_connector::types::Tool>> {
    let cache_key = format!("model_{}", model);
    let cache = get_tool_cache();

    match request_tools {
        Some(tools) if !tools.is_empty() => {
            // 有工具定义，转换并缓存
            let converted = convert::openai_tools_to_llm(tools);
            info!("Converted {} tools, caching for model {}", converted.len(), model);

            // 缓存工具定义
            if let Ok(mut cache_map) = cache.lock() {
                cache_map.insert(cache_key, converted.clone());
                info!("💾 Cached {} tools for model {}", converted.len(), model);
            }

            Some(converted)
        }
        _ => {
            // 没有工具定义，尝试从缓存获取
            if let Ok(cache_map) = cache.lock() {
                if let Some(cached_tools) = cache_map.get(&cache_key) {
                    info!("Using {} cached tools for model {} (no tools in request)",
                          cached_tools.len(), model);
                    Some(cached_tools.clone())
                } else {
                    info!("📋 No tools in request and no cached tools for model {}", model);
                    None
                }
            } else {
                warn!("Failed to access tool cache");
                None
            }
        }
    }
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
pub struct OllamaChatRequest {
    #[allow(dead_code)]
    pub model: String,
    #[allow(dead_code)]
    pub messages: Vec<Value>,
    #[allow(dead_code)]
    pub stream: Option<bool>,
    #[allow(dead_code)]
    pub options: Option<Value>,
    #[allow(dead_code)]
    pub tools: Option<Vec<Value>>,
}
