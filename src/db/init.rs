//! Database initialization with default provider types
//!
//! This module handles initializing the database with default provider configurations.
//! All provider type data is stored in the database and can be managed via the admin UI.

use tracing::info;
use crate::db::{DatabasePool, NewProviderType, ModelInfo};
use anyhow::Result;

/// Get default provider types for initialization
fn get_default_provider_types() -> Vec<NewProviderType> {
    vec![
        // 智谱 AI
        NewProviderType {
            id: "zhipu".to_string(),
            label: "智谱 AI".to_string(),
            base_url: "https://open.bigmodel.cn/api/paas/v4".to_string(),
            default_model: "glm-4-flash".to_string(),
            models: vec![
                ModelInfo { id: "glm-4-flash".to_string(), name: "GLM-4 Flash".to_string(), description: Some("快速版 GLM-4 模型".to_string()), supports_tools: Some(true), context_length: Some(128000), input_price: None, output_price: None },
                ModelInfo { id: "glm-4".to_string(), name: "GLM-4".to_string(), description: Some("标准 GLM-4 模型".to_string()), supports_tools: Some(true), context_length: Some(128000), input_price: None, output_price: None },
                ModelInfo { id: "glm-4-plus".to_string(), name: "GLM-4 Plus".to_string(), description: Some("增强版 GLM-4 模型".to_string()), supports_tools: Some(true), context_length: Some(128000), input_price: None, output_price: None },
                ModelInfo { id: "glm-4-0520".to_string(), name: "GLM-4 0520".to_string(), description: Some("GLM-4 0520 版本".to_string()), supports_tools: Some(true), context_length: Some(128000), input_price: None, output_price: None },
                ModelInfo { id: "glm-4-air".to_string(), name: "GLM-4 Air".to_string(), description: Some("轻量版 GLM-4 模型".to_string()), supports_tools: Some(true), context_length: Some(128000), input_price: None, output_price: None },
                ModelInfo { id: "glm-4-airx".to_string(), name: "GLM-4 AirX".to_string(), description: Some("GLM-4 AirX 模型".to_string()), supports_tools: Some(true), context_length: Some(8192), input_price: None, output_price: None },
                ModelInfo { id: "glm-4-long".to_string(), name: "GLM-4 Long".to_string(), description: Some("长上下文 GLM-4 模型".to_string()), supports_tools: Some(true), context_length: Some(1000000), input_price: None, output_price: None },
                ModelInfo { id: "glm-4-flashx".to_string(), name: "GLM-4 FlashX".to_string(), description: Some("GLM-4 FlashX 模型".to_string()), supports_tools: Some(true), context_length: Some(128000), input_price: None, output_price: None },
                ModelInfo { id: "glm-4.7".to_string(), name: "GLM-4.7".to_string(), description: Some("GLM-4.7 最新模型".to_string()), supports_tools: Some(true), context_length: Some(128000), input_price: None, output_price: None },
            ],
            enabled: Some(true),
            sort_order: Some(0),
            docs_url: Some("https://open.bigmodel.cn/dev/howuse/model".to_string()),
        },
        // Aliyun DashScope
        NewProviderType {
            id: "aliyun".to_string(),
            label: "Aliyun DashScope".to_string(),
            base_url: "https://dashscope.aliyuncs.com/compatible-mode/v1".to_string(),
            default_model: "qwen-turbo".to_string(),
            models: vec![
                ModelInfo { id: "qwen-turbo".to_string(), name: "Qwen Turbo".to_string(), description: Some("快速版通义千问".to_string()), supports_tools: Some(true), context_length: Some(8192), input_price: None, output_price: None },
                ModelInfo { id: "qwen-plus".to_string(), name: "Qwen Plus".to_string(), description: Some("增强版通义千问".to_string()), supports_tools: Some(true), context_length: Some(32768), input_price: None, output_price: None },
                ModelInfo { id: "qwen-max".to_string(), name: "Qwen Max".to_string(), description: Some("最强版通义千问".to_string()), supports_tools: Some(true), context_length: Some(32768), input_price: None, output_price: None },
                ModelInfo { id: "qwen-long".to_string(), name: "Qwen Long".to_string(), description: Some("长上下文通义千问".to_string()), supports_tools: Some(true), context_length: Some(1000000), input_price: None, output_price: None },
            ],
            enabled: Some(true),
            sort_order: Some(1),
            docs_url: Some("https://help.aliyun.com/zh/model-studio/getting-started/models".to_string()),
        },
        // 月之暗面
        NewProviderType {
            id: "moonshot".to_string(),
            label: "月之暗面".to_string(),
            base_url: "https://api.moonshot.cn/v1".to_string(),
            default_model: "moonshot-v1-8k".to_string(),
            models: vec![
                ModelInfo { id: "moonshot-v1-8k".to_string(), name: "Moonshot V1 8K".to_string(), description: Some("8K 上下文模型".to_string()), supports_tools: Some(true), context_length: Some(8192), input_price: None, output_price: None },
                ModelInfo { id: "moonshot-v1-32k".to_string(), name: "Moonshot V1 32K".to_string(), description: Some("32K 上下文模型".to_string()), supports_tools: Some(true), context_length: Some(32768), input_price: None, output_price: None },
                ModelInfo { id: "moonshot-v1-128k".to_string(), name: "Moonshot V1 128K".to_string(), description: Some("128K 上下文模型".to_string()), supports_tools: Some(true), context_length: Some(128000), input_price: None, output_price: None },
            ],
            enabled: Some(true),
            sort_order: Some(2),
            docs_url: Some("https://platform.moonshot.cn/docs/overview".to_string()),
        },
        // MiniMax
        NewProviderType {
            id: "minimax".to_string(),
            label: "MiniMax".to_string(),
            base_url: "https://api.minimax.chat/v1".to_string(),
            default_model: "MiniMax-Text-01".to_string(),
            models: vec![
                ModelInfo { id: "MiniMax-Text-01".to_string(), name: "MiniMax Text 01".to_string(), description: Some("MiniMax 文本模型".to_string()), supports_tools: Some(true), context_length: Some(1000000), input_price: None, output_price: None },
                ModelInfo { id: "abab6.5s-chat".to_string(), name: "ABAB 6.5s Chat".to_string(), description: Some("ABAB 6.5s 对话模型".to_string()), supports_tools: Some(true), context_length: Some(245760), input_price: None, output_price: None },
            ],
            enabled: Some(true),
            sort_order: Some(3),
            docs_url: Some("https://platform.minimaxi.com/document/Models".to_string()),
        },
        // DeepSeek
        NewProviderType {
            id: "deepseek".to_string(),
            label: "DeepSeek".to_string(),
            base_url: "https://api.deepseek.com".to_string(),
            default_model: "deepseek-chat".to_string(),
            models: vec![
                ModelInfo { id: "deepseek-chat".to_string(), name: "DeepSeek Chat".to_string(), description: Some("DeepSeek 对话模型".to_string()), supports_tools: Some(true), context_length: Some(64000), input_price: None, output_price: None },
                ModelInfo { id: "deepseek-coder".to_string(), name: "DeepSeek Coder".to_string(), description: Some("DeepSeek 编程模型".to_string()), supports_tools: Some(true), context_length: Some(64000), input_price: None, output_price: None },
                ModelInfo { id: "deepseek-reasoner".to_string(), name: "DeepSeek Reasoner".to_string(), description: Some("DeepSeek 推理模型".to_string()), supports_tools: Some(false), context_length: Some(64000), input_price: None, output_price: None },
            ],
            enabled: Some(true),
            sort_order: Some(4),
            docs_url: Some("https://api-docs.deepseek.com/zh-cn/".to_string()),
        },
        // 硅基流动
        NewProviderType {
            id: "siliconflow".to_string(),
            label: "硅基流动".to_string(),
            base_url: "https://api.siliconflow.cn/v1".to_string(),
            default_model: "Qwen/Qwen2.5-7B-Instruct".to_string(),
            models: vec![
                ModelInfo { id: "Qwen/Qwen2.5-7B-Instruct".to_string(), name: "Qwen 2.5 7B".to_string(), description: Some("通义千问 2.5 7B".to_string()), supports_tools: Some(true), context_length: Some(32768), input_price: None, output_price: None },
                ModelInfo { id: "Qwen/Qwen2.5-32B-Instruct".to_string(), name: "Qwen 2.5 32B".to_string(), description: Some("通义千问 2.5 32B".to_string()), supports_tools: Some(true), context_length: Some(32768), input_price: None, output_price: None },
                ModelInfo { id: "deepseek-ai/DeepSeek-V3".to_string(), name: "DeepSeek V3".to_string(), description: Some("DeepSeek V3 模型".to_string()), supports_tools: Some(true), context_length: Some(64000), input_price: None, output_price: None },
            ],
            enabled: Some(true),
            sort_order: Some(5),
            docs_url: Some("https://docs.siliconflow.cn/cn/docs/model-names".to_string()),
        },
        // 火山引擎
        NewProviderType {
            id: "volcengine".to_string(),
            label: "火山引擎".to_string(),
            base_url: "https://ark.cn-beijing.volces.com/api/v3".to_string(),
            default_model: "doubao-pro-32k".to_string(),
            models: vec![
                ModelInfo { id: "doubao-pro-32k".to_string(), name: "Doubao Pro 32K".to_string(), description: Some("豆包 Pro 32K 模型".to_string()), supports_tools: Some(true), context_length: Some(32768), input_price: None, output_price: None },
                ModelInfo { id: "doubao-pro-128k".to_string(), name: "Doubao Pro 128K".to_string(), description: Some("豆包 Pro 128K 模型".to_string()), supports_tools: Some(true), context_length: Some(128000), input_price: None, output_price: None },
            ],
            enabled: Some(true),
            sort_order: Some(6),
            docs_url: Some("https://www.volcengine.com/docs/82379/1263482".to_string()),
        },
        // 腾讯混元
        NewProviderType {
            id: "tencent".to_string(),
            label: "腾讯混元".to_string(),
            base_url: "https://api.hunyuan.cloud.tencent.com/v1".to_string(),
            default_model: "hunyuan-lite".to_string(),
            models: vec![
                ModelInfo { id: "hunyuan-lite".to_string(), name: "Hunyuan Lite".to_string(), description: Some("混元 Lite 模型".to_string()), supports_tools: Some(true), context_length: Some(256000), input_price: None, output_price: None },
                ModelInfo { id: "hunyuan-standard".to_string(), name: "Hunyuan Standard".to_string(), description: Some("混元标准模型".to_string()), supports_tools: Some(true), context_length: Some(256000), input_price: None, output_price: None },
                ModelInfo { id: "hunyuan-pro".to_string(), name: "Hunyuan Pro".to_string(), description: Some("混元 Pro 模型".to_string()), supports_tools: Some(true), context_length: Some(32768), input_price: None, output_price: None },
            ],
            enabled: Some(true),
            sort_order: Some(7),
            docs_url: Some("https://cloud.tencent.com/document/product/1729/97731".to_string()),
        },
        // LongCat
        NewProviderType {
            id: "longcat".to_string(),
            label: "LongCat".to_string(),
            base_url: "https://api.longcat.chat/v1".to_string(),
            default_model: "LongCat-Flash-Chat".to_string(),
            models: vec![
                ModelInfo { id: "LongCat-Flash-Chat".to_string(), name: "LongCat Flash Chat".to_string(), description: Some("LongCat 快速对话模型".to_string()), supports_tools: Some(false), context_length: Some(4096), input_price: None, output_price: None },
            ],
            enabled: Some(true),
            sort_order: Some(8),
            docs_url: None,
        },
        // Ollama (本地)
        NewProviderType {
            id: "ollama".to_string(),
            label: "Ollama (本地)".to_string(),
            base_url: "http://localhost:11434/v1".to_string(),
            default_model: "llama3.2".to_string(),
            models: vec![
                ModelInfo { id: "llama3.2".to_string(), name: "Llama 3.2".to_string(), description: Some("Llama 3.2 模型".to_string()), supports_tools: Some(false), context_length: Some(128000), input_price: None, output_price: None },
                ModelInfo { id: "llama2".to_string(), name: "Llama 2".to_string(), description: Some("Llama 2 模型".to_string()), supports_tools: Some(false), context_length: Some(4096), input_price: None, output_price: None },
                ModelInfo { id: "qwen2.5".to_string(), name: "Qwen 2.5".to_string(), description: Some("通义千问 2.5".to_string()), supports_tools: Some(true), context_length: Some(32768), input_price: None, output_price: None },
            ],
            enabled: Some(true),
            sort_order: Some(9),
            docs_url: Some("https://ollama.com/library".to_string()),
        },
    ]
}

/// Initialize provider_types table with default values
pub async fn initialize_provider_types(db: &DatabasePool) -> Result<()> {
    // Check if already initialized
    if !db.is_provider_types_empty().await? {
        info!("Provider types already initialized, skipping");
        return Ok(());
    }

    info!("Initializing provider types with defaults...");

    let provider_types = get_default_provider_types();
    let count = provider_types.len();

    db.batch_insert_provider_types(provider_types).await?;

    info!("✅ Initialized {} provider types", count);
    Ok(())
}
