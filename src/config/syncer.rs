use crate::db::{DatabasePool, ModelInfo, NewProviderType};
use anyhow::Result;
use llm_providers::{get_providers_data, Provider};
use tracing::{info, warn};

pub struct ModelSyncer;

impl ModelSyncer {
    /// Synchronize model data from llm-providers crate to database
    pub async fn sync(db: &DatabasePool) -> Result<()> {
        info!("Starting dynamic model synchronization from llm-providers...");

        let providers_map = get_providers_data();
        let count = providers_map.len();
        info!("Found {} providers in llm-providers registry", count);

        for (id, provider) in providers_map.entries() {
            if let Err(e) = Self::sync_provider(db, id, provider).await {
                warn!("Failed to sync provider {}: {}", id, e);
                // Continue with other providers even if one fails
            }
        }

        info!("Model synchronization completed");
        Ok(())
    }

    async fn sync_provider(db: &DatabasePool, id: &str, provider: &Provider) -> Result<()> {
        let models: Vec<ModelInfo> = provider
            .models
            .iter()
            .map(|m| ModelInfo {
                id: m.id.to_string(),
                name: m.name.to_string(),
                description: Some(m.description.to_string()),
                supports_tools: Some(m.supports_tools),
                context_length: m.context_length.map(|l| l as u32),
                input_price: Some(m.input_price),
                output_price: Some(m.output_price),
            })
            .collect();

        match db.get_provider_type(id).await? {
            Some(_) => {
                // If it exists, we skip to avoid overwriting user customizations
                Ok(())
            }
            None => {
                info!("Adding new provider type: {} ({})", provider.label, id);
                let pt = NewProviderType {
                    id: id.to_string(),
                    label: provider.label.to_string(),
                    base_url: provider
                        .endpoints
                        .get("global")
                        .or_else(|| provider.endpoints.get("cn"))
                        .map(|e| e.base_url.to_string())
                        .unwrap_or_default(),
                    driver_type: "openai_compatible".to_string(), // Default driver
                    models,
                    enabled: Some(true),
                    sort_order: Some(0),
                    docs_url: provider
                        .endpoints
                        .get("global")
                        .or_else(|| provider.endpoints.get("cn"))
                        .and_then(|e| e.docs_url.map(|d| d.to_string())),
                };
                db.create_provider_type(pt).await?;
                Ok(())
            }
        }
    }
}
