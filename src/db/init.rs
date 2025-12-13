//! Database initialization from models.yaml
//! 
//! This module handles loading provider types from models.yaml and
//! initializing the database with default configurations.

use std::collections::HashMap;
use serde::Deserialize;
use tracing::{info, warn};
use crate::db::{DatabasePool, NewProviderType, ModelInfo};
use anyhow::Result;

/// Raw model entry from models.yaml
#[derive(Debug, Deserialize)]
struct YamlModel {
    id: String,
    name: String,
    #[serde(default)]
    description: Option<String>,
    #[serde(default)]
    supports_tools: Option<bool>,
    #[serde(default)]
    context_length: Option<u32>,
}

/// Raw provider entry from models.yaml
#[derive(Debug, Deserialize)]
struct YamlProvider {
    models: Vec<YamlModel>,
}

/// Provider metadata (not in yaml, hardcoded)
struct ProviderMeta {
    label: &'static str,
    base_url: &'static str,
}

/// Get provider metadata
fn get_provider_meta(id: &str) -> Option<ProviderMeta> {
    match id {
        "zhipu" => Some(ProviderMeta {
            label: "智谱 AI",
            base_url: "https://open.bigmodel.cn/api/paas/v4",
        }),
        "aliyun" => Some(ProviderMeta {
            label: "阿里云百炼",
            base_url: "https://dashscope.aliyuncs.com/compatible-mode/v1",
        }),
        "moonshot" => Some(ProviderMeta {
            label: "月之暗面",
            base_url: "https://api.moonshot.cn/v1",
        }),
        "minimax" => Some(ProviderMeta {
            label: "MiniMax",
            base_url: "https://api.minimax.chat/v1",
        }),
        "longcat" => Some(ProviderMeta {
            label: "LongCat",
            base_url: "https://api.longcat.chat/v1",
        }),
        "tencent" => Some(ProviderMeta {
            label: "腾讯混元",
            base_url: "https://api.hunyuan.cloud.tencent.com/v1",
        }),
        "volcengine" => Some(ProviderMeta {
            label: "火山引擎",
            base_url: "https://ark.cn-beijing.volces.com/api/v3",
        }),
        "deepseek" => Some(ProviderMeta {
            label: "DeepSeek",
            base_url: "https://api.deepseek.com",
        }),
        "siliconflow" => Some(ProviderMeta {
            label: "硅基流动",
            base_url: "https://api.siliconflow.cn/v1",
        }),
        "ollama" => Some(ProviderMeta {
            label: "Ollama (本地)",
            base_url: "http://localhost:11434/v1",
        }),
        _ => None,
    }
}

/// Load models.yaml and initialize provider_types table
pub async fn initialize_provider_types(db: &DatabasePool) -> Result<()> {
    // Check if already initialized
    if !db.is_provider_types_empty().await? {
        info!("Provider types already initialized, skipping");
        return Ok(());
    }

    info!("Initializing provider types from models.yaml...");

    // Load and parse models.yaml
    let yaml_content = include_str!("../models/models.yaml");
    let providers: HashMap<String, YamlProvider> = serde_yaml::from_str(yaml_content)?;

    // Convert to NewProviderType
    let mut provider_types = Vec::new();
    
    for (id, provider) in providers {
        // Skip ollama (dynamic models)
        if id == "ollama" {
            continue;
        }

        let meta = match get_provider_meta(&id) {
            Some(m) => m,
            None => {
                warn!("Unknown provider '{}', skipping", id);
                continue;
            }
        };

        // Convert models
        let models: Vec<ModelInfo> = provider.models.into_iter().map(|m| ModelInfo {
            id: m.id,
            name: m.name,
            description: m.description,
            supports_tools: m.supports_tools,
            context_length: m.context_length,
        }).collect();

        if models.is_empty() {
            warn!("Provider '{}' has no models, skipping", id);
            continue;
        }

        let default_model = models.first().map(|m| m.id.clone()).unwrap_or_default();

        provider_types.push(NewProviderType {
            id: id.clone(),
            label: meta.label.to_string(),
            base_url: meta.base_url.to_string(),
            default_model,
            models,
            enabled: Some(true),
            sort_order: None,
        });
    }

    // Insert into database
    let count = provider_types.len();
    db.batch_insert_provider_types(provider_types).await?;
    
    info!("✅ Initialized {} provider types from models.yaml", count);
    Ok(())
}

