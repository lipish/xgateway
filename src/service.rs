use crate::engine::{Client, Model, Response};
use crate::settings::LlmBackendSettings;
use anyhow::Result;
use llm_connector::types::Tool;
use llm_connector::StreamFormat;
use tokio_stream::wrappers::UnboundedReceiverStream;

/// Service layer - Business logic for LLM operations
///
/// This layer sits between handlers (HTTP) and client (LLM communication).
/// It handles:
/// - Model selection and validation
/// - Delegating to the appropriate client methods
/// - Business-level error handling
pub struct Service {
    client: Client,
    #[allow(dead_code)]
    model: String,
}

impl Service {
    /// Create a new service with the specified backend configuration
    pub fn new(config: &LlmBackendSettings) -> Result<Self> {
        let client = Client::new(config)?;
        let model = match config {
            LlmBackendSettings::OpenAI { model, .. } => model.clone(),
            LlmBackendSettings::Anthropic { model, .. } => model.clone(),
            LlmBackendSettings::Ollama { model, .. } => model.clone(),
            LlmBackendSettings::Aliyun { model, .. } => model.clone(),
            LlmBackendSettings::Zhipu { model, .. } => model.clone(),
            LlmBackendSettings::Volcengine { model, .. } => model.clone(),
            LlmBackendSettings::Tencent { model, .. } => model.clone(),
            LlmBackendSettings::Longcat { model, .. } => model.clone(),
            LlmBackendSettings::Moonshot { model, .. } => model.clone(),
            LlmBackendSettings::Minimax { model, .. } => model.clone(),
            LlmBackendSettings::DeepSeek { model, .. } => model.clone(),
        };

        Ok(Self { client, model })
    }

    /// Chat with a specific model (non-streaming)
    ///
    /// If model is None, uses the default model from configuration.
    #[allow(dead_code)]
    pub async fn chat(
        &self,
        model: Option<&str>,
        messages: Vec<llm_connector::types::Message>,
        tools: Option<Vec<Tool>>,
    ) -> Result<Response> {
        let backend_model = model.unwrap_or(&self.model);
        self.client.chat(backend_model, messages, tools).await
    }

    /// Chat with streaming (Ollama format)
    ///
    /// If model is None, uses the default model from configuration.
    #[allow(dead_code)]
    pub async fn chat_stream_ollama(
        &self,
        model: Option<&str>,
        messages: Vec<llm_connector::types::Message>,
        format: StreamFormat,
    ) -> Result<UnboundedReceiverStream<String>> {
        let backend_model = model.unwrap_or(&self.model);
        self.client
            .chat_stream_with_format(backend_model, messages, format)
            .await
    }

    /// Chat with streaming (Ollama format) with tools support
    ///
    /// If model is None, uses the default model from configuration.
    #[allow(dead_code)]
    pub async fn chat_stream_ollama_with_tools(
        &self,
        model: Option<&str>,
        messages: Vec<llm_connector::types::Message>,
        tools: Option<Vec<llm_connector::types::Tool>>,
        format: StreamFormat,
    ) -> Result<UnboundedReceiverStream<String>> {
        let backend_model = model.unwrap_or(&self.model);
        self.client
            .chat_stream_with_format_and_tools(backend_model, messages, tools, format)
            .await
    }

    /// Chat with streaming (OpenAI format)
    ///
    /// If model is None, uses the default model from configuration.
    #[allow(dead_code)]
    pub async fn chat_stream_openai(
        &self,
        model: Option<&str>,
        messages: Vec<llm_connector::types::Message>,
        tools: Option<Vec<Tool>>,
        format: StreamFormat,
    ) -> Result<UnboundedReceiverStream<String>> {
        let backend_model = model.unwrap_or(&self.model);
        self.client
            .chat_stream_openai(backend_model, messages, tools, format)
            .await
    }

    /// List available models
    pub async fn list_models(&self) -> Result<Vec<Model>> {
        self.client.list_models().await
    }

    /// Validate if a model is available
    #[allow(dead_code)]
    pub async fn validate_model(&self, model: &str) -> Result<bool> {
        let available_models: Vec<Model> = self.client.list_models().await?;
        Ok(available_models.iter().any(|m| m.id == model))
    }
}
