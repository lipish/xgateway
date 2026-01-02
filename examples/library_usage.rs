use llm_link::provider::ProviderRegistry;

fn main() {
    println!("🚀 LLM Link Library Demo");
    println!("========================\n");

    let providers = ProviderRegistry::list_providers();
    println!("📋 Supported providers ({}):", providers.len());
    for provider in &providers {
        println!("  • {}", provider);
    }

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