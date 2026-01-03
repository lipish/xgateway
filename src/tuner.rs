use crate::settings::Settings;
use axum::http::HeaderMap;
use llm_connector::StreamFormat;
use serde_json::Value;

/// Client adapter type
///
/// Used to identify different clients and apply corresponding response transformations.
///
/// # Workflow
/// 1. Detect client type (through HTTP headers, User-Agent, configuration, etc.)
/// 2. Determine preferred streaming format (SSE/NDJSON/JSON)
/// 3. Apply client-specific response adaptations (field addition, format adjustment, etc.)
///
/// # Usage Locations
/// - `src/api/ollama.rs::detect_ollama_client()` - Ollama API client detection
/// - `src/api/openai.rs::detect_openai_client()` - OpenAI API client detection
///
/// # Example
/// ```rust,ignore
/// let adapter = detect_client(&headers, &config);
/// let format = adapter.preferred_format();
/// adapter.apply_response_adaptations(&config, &mut response_data);
/// ```
#[derive(Debug, Clone, PartialEq)]
#[allow(dead_code)]
pub enum ClientTuner {
    /// Standard Ollama client
    /// - Preferred format: NDJSON
    /// - Special handling: None
    Standard,

    /// Zed editor adapter
    /// - Preferred format: NDJSON
    /// - Special handling: Add `images` field
    Zed,

    /// OpenAI API client adapter (including Codex CLI)
    /// - Preferred format: SSE
    /// - Special handling: finish_reason correction (handled in llm/stream.rs)
    OpenAI,
}

impl ClientTuner {
    /// 获取该客户端的首选流式格式
    ///
    /// 当客户端没有明确指定 Accept 头（或使用 `*/*`）时，
    /// 使用此方法返回的格式。
    ///
    /// # 返回值
    /// - `StreamFormat::SSE` - Server-Sent Events (OpenAI/Codex 偏好)
    /// - `StreamFormat::NDJSON` - Newline Delimited JSON (Ollama/Zed 偏好)
    ///
    /// # 使用场景
    /// ```rust,ignore
    /// let format = if headers.get("accept").contains("*/*") {
    ///     adapter.preferred_format()  // 使用偏好格式
    /// } else {
    ///     detected_format  // 使用客户端指定的格式
    /// };
    /// ```
    pub fn preferred_format(&self) -> StreamFormat {
        match self {
            ClientTuner::Standard => StreamFormat::NDJSON, // Ollama 标准
            ClientTuner::Zed => StreamFormat::NDJSON,      // Zed 偏好 NDJSON
            ClientTuner::OpenAI => StreamFormat::SSE,      // OpenAI/Codex 偏好 SSE
        }
    }

    /// 应用客户端特定的响应处理
    ///
    /// 根据客户端类型，对 LLM 返回的响应数据进行适配转换。
    ///
    /// # 参数
    /// - `config`: 全局配置
    /// - `data`: 响应数据（可变引用），会被就地修改
    ///
    /// # 适配内容
    ///
    /// ## Standard
    /// - 无特殊处理
    ///
    /// ## Zed
    /// - 添加 `images: null` 字段（Zed 要求）
    ///
    /// ## OpenAI
    /// - finish_reason 修正（在 client.rs 中处理）
    ///
    /// # 调用位置
    /// - `src/handlers/ollama.rs` - 在流式响应的每个 chunk 中调用
    /// - `src/handlers/openai.rs` - 在流式响应的每个 chunk 中调用
    ///
    /// # 示例
    /// ```rust,ignore
    /// let mut response_data = serde_json::from_str(&chunk)?;
    /// adapter.apply_response_adaptations(&config, &mut response_data);
    /// // response_data 已被适配
    /// ```
    pub fn apply_response_adaptations(&self, config: &Settings, data: &mut Value) {
        match self {
            ClientTuner::Standard => {
                // 标准模式：无特殊处理
            }
            ClientTuner::Zed => {
                // Zed 特定适配：添加 images 字段
                let should_add_images = if let Some(ref tuner) = config.client_adapters {
                    if let Some(ref zed_config) = tuner.zed {
                        zed_config.force_images_field.unwrap_or(true)
                    } else {
                        true
                    }
                } else {
                    true
                };

                if should_add_images {
                    if let Some(message) = data.get_mut("message") {
                        if message.get("images").is_none() {
                            if let Some(msg_obj) = message.as_object_mut() {
                                msg_obj.insert("images".to_string(), Value::Null);
                            }
                        }
                    }
                }
            }
            ClientTuner::OpenAI => {
                // OpenAI 特定适配：无特殊处理
                // finish_reason 修正在 client.rs 中处理
            }
        }
    }
}

/// 格式检测器
#[allow(dead_code)]
pub struct FormatDetector;

impl FormatDetector {
    /// 根据 HTTP 标准确定响应格式
    pub fn determine_format(headers: &HeaderMap) -> (StreamFormat, &'static str) {
        if let Some(accept) = headers.get("accept") {
            if let Ok(accept_str) = accept.to_str() {
                if accept_str.contains("text/event-stream") {
                    return (StreamFormat::SSE, "text/event-stream");
                }
                if accept_str.contains("application/x-ndjson")
                    || accept_str.contains("application/jsonlines")
                {
                    return (StreamFormat::NDJSON, "application/x-ndjson");
                }
            }
        }
        // 默认：NDJSON
        (StreamFormat::NDJSON, "application/x-ndjson")
    }

    /// 获取格式对应的 Content-Type
    pub fn get_content_type(format: StreamFormat) -> &'static str {
        match format {
            StreamFormat::SSE => "text/event-stream",
            StreamFormat::NDJSON => "application/x-ndjson",
            StreamFormat::Json => "application/json",
        }
    }
}
