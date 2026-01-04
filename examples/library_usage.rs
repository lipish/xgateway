use llm_link::provider::{ProviderRegistry, ApiType};
use llm_link::db::DatabasePool;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    println!("🚀 LLM Link Library Demo");
    println!("========================\n");

    // For library usage, we need a database pool even if we only use static providers
    // (though in a real library usage without DB, you'd use get_static_provider_info)
    let db_url = "sqlite::memory:";
    let db_pool = DatabasePool::new(db_url).await?;

    let providers = ProviderRegistry::list_providers();
    println!("📋 Supported providers ({}):", providers.len());
    for provider in &providers {
        println!("  • {}", provider);
    }

    println!("\n📋 Provider Details:");
    let demo_providers = ["openai", "anthropic", "zhipu"];
    for provider_name in &demo_providers {
        if let Some(info) = ProviderRegistry::get_provider_info(&db_pool, provider_name).await {
            println!("\n🔸 {}:", info.name);
            println!("  Environment Variable: {}", info.env_var);
            println!("  API Type: {:?}", info.api_type);
            println!("  Requires API Key: {}", info.requires_api_key);
            println!("  Requires Base URL: {}", info.requires_base_url);
        }
    }

    println!("\n✅ Demo completed! You can now integrate llm-link as a library.");
    Ok(())
}