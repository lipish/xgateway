use llm_providers::get_providers_data;
fn main() {
    let providers = vec!["zhipu", "minimax", "moonshot", "deepseek", "aliyun", "tencent", "longcat"];
    for name in providers {
        if let Some(p) = get_providers_data().get(name) {
            for (key, ep) in p.endpoints.entries() {
                println!("{:<12} {:^10} -> {}", name, key, ep.base_url);
            }
        }
    }
}
