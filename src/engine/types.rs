
/// Token usage information
#[derive(Debug, Clone)]
#[allow(dead_code)]
pub struct Usage {
    pub prompt_tokens: u32,
    pub completion_tokens: u32,
    pub total_tokens: u32,
}

/// LLM response
#[derive(Debug, Clone)]
#[allow(dead_code)]
pub struct Response {
    pub content: String,
    pub model: String,
    pub usage: Usage,
    pub tool_calls: Option<serde_json::Value>,  // Store tool_calls from LLM response
}

/// Model information
#[derive(Debug, Clone)]
pub struct Model {
    pub id: String,
}

