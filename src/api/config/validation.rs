#[allow(dead_code)]
pub fn mask_api_key(api_key: &str) -> String {
    if api_key.len() <= 8 {
        "*".repeat(api_key.len())
    } else {
        format!("{}***{}", &api_key[..4], &api_key[api_key.len()-4..])
    }
}

#[allow(dead_code)]
pub fn validate_api_key(provider: &str, api_key: &str) -> Result<(), String> {
    if api_key.trim().is_empty() {
        return Err("API key cannot be empty".to_string());
    }

    match provider {
        "openai" => {
            if !api_key.starts_with("sk-") {
                return Err("OpenAI API key should start with 'sk-'".to_string());
            }
        }
        "anthropic" => {
            if !api_key.starts_with("sk-ant-") {
                return Err("Anthropic API key should start with 'sk-ant-'".to_string());
            }
        }
        "zhipu" => {
            if api_key.len() < 10 {
                return Err("Zhipu API key seems too short".to_string());
            }
        }
        "ollama" => {
        }
        _ => {
            if api_key.len() < 10 {
                return Err("API key seems too short".to_string());
            }
        }
    }

    Ok(())
}

#[allow(dead_code)]
pub fn validate_provider(provider: &str) -> Result<(), String> {
    match provider {
        "openai" | "anthropic" | "zhipu" | "ollama" | "aliyun" | "volcengine" | "tencent" | "longcat" | "moonshot" | "minimax" => Ok(()),
        _ => Err(format!("Unsupported provider: {}", provider)),
    }
}