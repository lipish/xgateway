use llm_providers::get_providers_data;

fn main() {
    let providers = vec![
        "openai",
        "anthropic",
        "zhipu",
        "ollama",
        "aliyun",
        "volcengine",
        "tencent",
        "longcat",
        "moonshot",
        "minimax",
        "deepseek",
    ];
    for name in providers {
        if let Some(p) = get_providers_data().get(name) {
            let ep_key = if p.endpoints.contains_key("global") {
                "global"
            } else if p.endpoints.contains_key("cn") {
                "cn"
            } else {
                p.endpoints.keys().next().unwrap()
            };
            let ep = p.endpoints.get(ep_key).unwrap();
            println!("{:<12} -> {}", name, ep.base_url);
        } else {
            println!("{:<12} -> NOT FOUND", name);
        }
    }
}
