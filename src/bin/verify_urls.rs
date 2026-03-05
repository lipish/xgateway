use llm_providers::get_providers_data;

fn main() {
    let providers_to_test = ["zhipu", "moonshot", "minimax", "deepseek"];
    let regions = ["cn", "global"];

    println!("\n--- LLM Providers Region Resolution Test ---");
    let registry = get_providers_data();
    for &p_id in &providers_to_test {
        if let Some(provider) = registry.get(p_id) {
            println!("Provider: {}", p_id);
            for &region in &regions {
                if let Some(endpoint) = provider.endpoints.get(region) {
                    println!("  Region: {:<6} -> URL: {}", region, endpoint.base_url);
                }
            }
        }
    }
}
