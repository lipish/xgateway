use llm_link::db::ModelsConfig;
use llm_link::provider::ProviderRegistry;

fn main() {
    println!("🚀 LLM Link Library Demo");
    println!("========================\n");

    // Get all supported providers
    let providers = ProviderRegistry::list_providers();
    println!("📋 Supported providers ({}):", providers.len());
    for provider in &providers {
        println!("  • {}", provider);
    }

    // Load models configuration
    let models_config = ModelsConfig::load_with_fallback();
    println!("\n📊 Loading models configuration...");
    
    // Get models for specific providers
    for provider in &providers {
        let models = models_config.get_models_for_provider(provider);
        if !models.is_empty() {
            println!("\n🔹 {} ({} models):", provider, models.len());
            for model in models.iter().take(3) {
                println!("    • {} - {}", model.name, model.id);
                if !model.description.is_empty() {
                    println!("      {}", model.description);
                }
            }
            if models.len() > 3 {
                println!("    ... and {} more models", models.len() - 3);
            }
        }
    }

    // Get detailed provider information
    println!("\n📋 Provider Details:");
    let demo_providers = ["openai", "anthropic", "zhipu"];
    for provider_name in &demo_providers {
        if let Some(info) = ProviderRegistry::get_provider_info(provider_name) {
            println!("\n🔸 {}:", info.name);
            println!("  Default Model: {}", info.default_model);
            println!("  Environment Variable: {}", info.env_var);
            println!("  API Type: {:?}", info.api_type);
            println!("  Requires API Key: {}", info.requires_api_key);
            println!("  Requires Base URL: {}", info.requires_base_url);
        }
    }

    println!("\n✅ Demo completed! You can now integrate llm-link as a library.");
}