//! Static models configuration for fallback use
//! 
//! This module provides a static ModelsConfig that can be used when database
//! access is not available (e.g., in single mode or during initialization).

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Model information (for static config)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelInfo {
    pub id: String,
    pub name: String,
    pub description: String,
    #[serde(default)]
    pub supports_tools: bool,
    #[serde(default = "default_context_length")]
    pub context_length: u32,
}

fn default_context_length() -> u32 {
    4096
}

/// Provider models collection
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderModels {
    pub models: Vec<ModelInfo>,
}

/// Models configuration using HashMap for flexible provider support
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelsConfig {
    #[serde(flatten)]
    pub providers: HashMap<String, ProviderModels>,
}

impl ModelsConfig {
    /// Load models configuration with fallback to default
    pub fn load_with_fallback() -> Self {
        Self::default()
    }

    /// Get models for a specific provider
    pub fn get_models_for_provider(&self, provider: &str) -> Vec<ModelInfo> {
        self.providers
            .get(&provider.to_lowercase())
            .map(|p| p.models.clone())
            .unwrap_or_default()
    }

    /// Get all provider names
    #[allow(dead_code)]
    pub fn get_all_providers(&self) -> Vec<String> {
        self.providers.keys().cloned().collect()
    }
}

impl Default for ModelsConfig {
    fn default() -> Self {
        let mut providers = HashMap::new();

        // Zhipu
        providers.insert("zhipu".to_string(), ProviderModels {
            models: vec![
                ModelInfo { id: "glm-4-flash".to_string(), name: "GLM-4 Flash".to_string(), description: "快速版 GLM-4 模型".to_string(), supports_tools: true, context_length: 128000 },
                ModelInfo { id: "glm-4".to_string(), name: "GLM-4".to_string(), description: "标准 GLM-4 模型".to_string(), supports_tools: true, context_length: 128000 },
                ModelInfo { id: "glm-4-plus".to_string(), name: "GLM-4 Plus".to_string(), description: "增强版 GLM-4 模型".to_string(), supports_tools: true, context_length: 128000 },
                ModelInfo { id: "glm-4.7".to_string(), name: "GLM-4.7".to_string(), description: "GLM-4.7 最新模型".to_string(), supports_tools: true, context_length: 128000 },
            ],
        });

        // Aliyun
        providers.insert("aliyun".to_string(), ProviderModels {
            models: vec![
                ModelInfo { id: "qwen-turbo".to_string(), name: "Qwen Turbo".to_string(), description: "快速版通义千问".to_string(), supports_tools: true, context_length: 8192 },
                ModelInfo { id: "qwen-plus".to_string(), name: "Qwen Plus".to_string(), description: "增强版通义千问".to_string(), supports_tools: true, context_length: 32768 },
                ModelInfo { id: "qwen-max".to_string(), name: "Qwen Max".to_string(), description: "最强版通义千问".to_string(), supports_tools: true, context_length: 32768 },
            ],
        });

        // Moonshot
        providers.insert("moonshot".to_string(), ProviderModels {
            models: vec![
                ModelInfo { id: "moonshot-v1-8k".to_string(), name: "Moonshot V1 8K".to_string(), description: "8K 上下文模型".to_string(), supports_tools: true, context_length: 8192 },
                ModelInfo { id: "moonshot-v1-32k".to_string(), name: "Moonshot V1 32K".to_string(), description: "32K 上下文模型".to_string(), supports_tools: true, context_length: 32768 },
                ModelInfo { id: "moonshot-v1-128k".to_string(), name: "Moonshot V1 128K".to_string(), description: "128K 上下文模型".to_string(), supports_tools: true, context_length: 128000 },
            ],
        });

        // MiniMax
        providers.insert("minimax".to_string(), ProviderModels {
            models: vec![
                ModelInfo { id: "MiniMax-Text-01".to_string(), name: "MiniMax Text 01".to_string(), description: "MiniMax 文本模型".to_string(), supports_tools: true, context_length: 1000000 },
                ModelInfo { id: "abab6.5s-chat".to_string(), name: "ABAB 6.5s Chat".to_string(), description: "ABAB 6.5s 对话模型".to_string(), supports_tools: true, context_length: 245760 },
            ],
        });

        // DeepSeek
        providers.insert("deepseek".to_string(), ProviderModels {
            models: vec![
                ModelInfo { id: "deepseek-chat".to_string(), name: "DeepSeek Chat".to_string(), description: "DeepSeek 对话模型".to_string(), supports_tools: true, context_length: 64000 },
                ModelInfo { id: "deepseek-coder".to_string(), name: "DeepSeek Coder".to_string(), description: "DeepSeek 编程模型".to_string(), supports_tools: true, context_length: 64000 },
            ],
        });

        // Volcengine
        providers.insert("volcengine".to_string(), ProviderModels {
            models: vec![
                ModelInfo { id: "doubao-pro-32k".to_string(), name: "Doubao Pro 32K".to_string(), description: "豆包 Pro 32K 模型".to_string(), supports_tools: true, context_length: 32768 },
            ],
        });

        // Tencent
        providers.insert("tencent".to_string(), ProviderModels {
            models: vec![
                ModelInfo { id: "hunyuan-lite".to_string(), name: "Hunyuan Lite".to_string(), description: "混元 Lite 模型".to_string(), supports_tools: true, context_length: 256000 },
            ],
        });

        // LongCat
        providers.insert("longcat".to_string(), ProviderModels {
            models: vec![
                ModelInfo { id: "LongCat-Flash-Chat".to_string(), name: "LongCat Flash Chat".to_string(), description: "LongCat 快速对话模型".to_string(), supports_tools: false, context_length: 4096 },
            ],
        });

        // Ollama
        providers.insert("ollama".to_string(), ProviderModels {
            models: vec![
                ModelInfo { id: "llama3.2".to_string(), name: "Llama 3.2".to_string(), description: "Llama 3.2 模型".to_string(), supports_tools: false, context_length: 128000 },
                ModelInfo { id: "llama2".to_string(), name: "Llama 2".to_string(), description: "Llama 2 模型".to_string(), supports_tools: false, context_length: 4096 },
            ],
        });

        // OpenAI
        providers.insert("openai".to_string(), ProviderModels {
            models: vec![
                ModelInfo { id: "gpt-4o".to_string(), name: "GPT-4o".to_string(), description: "GPT-4 Omni model".to_string(), supports_tools: true, context_length: 128000 },
                ModelInfo { id: "gpt-4".to_string(), name: "GPT-4".to_string(), description: "Most capable GPT-4 model".to_string(), supports_tools: true, context_length: 8192 },
                ModelInfo { id: "gpt-3.5-turbo".to_string(), name: "GPT-3.5 Turbo".to_string(), description: "Fast and efficient model".to_string(), supports_tools: true, context_length: 16385 },
            ],
        });

        // Anthropic
        providers.insert("anthropic".to_string(), ProviderModels {
            models: vec![
                ModelInfo { id: "claude-3-5-sonnet-20241022".to_string(), name: "Claude 3.5 Sonnet".to_string(), description: "Latest Claude 3.5 Sonnet model".to_string(), supports_tools: true, context_length: 200000 },
                ModelInfo { id: "claude-3-haiku-20240307".to_string(), name: "Claude 3 Haiku".to_string(), description: "Fast Claude 3 model".to_string(), supports_tools: true, context_length: 200000 },
            ],
        });

        Self { providers }
    }
}

