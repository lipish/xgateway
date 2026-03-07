//! Real provider connectivity tests
//!
//! Tests actual API calls to verify provider connectivity
//! Run with: cargo test --test real_provider_tests -- --nocapture --ignored

use reqwest::Client;
use serde_json::json;
use std::time::Instant;

const ALIYUN_API_KEY: &str = "sk-17cb8a1feec2440bad2c5a73d7d08af2";
const ZHIPU_API_KEY: &str = "6b4c24a7a3df47a8898b006f9f5c23b6.PXpYUIvTdUU9uKPS";
const MINIMAX_API_KEY: &str = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJHcm91cE5hbWUiOiJsaXBpIiwiVXNlck5hbWUiOiJsaXBpIiwiQWNjb3VudCI6IiIsIlN1YmplY3RJRCI6IjE3NTQwMTIzODY3MTAyNjE3ODQiLCJQaG9uZSI6IjEzOTAxNzMxMjY2IiwiR3JvdXBJRCI6IjE3NTQwMTIzODY3MDYwNjc0ODAiLCJQYWdlTmFtZSI6IiIsIk1haWwiOiIiLCJDcmVhdGVUaW1lIjoiMjAyNS0xMS0wNCAwMDowMzo0MSIsIlRva2VuVHlwZSI6MSwiaXNzIjoibWluaW1heCJ9.hSPik-eRMCB1X7M3p2MK84SgR1YyZ3T8n8wg7jII8O6kYgC34BUXQzLt4y_RCsBu3G8IRo5CcljzvLG--78ogRxgQO1x-4DcizIRfCYpquQoilkjwn2HF436-jtez1mHd4c3WVg9_RNbzd-ioRXcsWj82e2TtamSidXxwPWSyz740n3VgQhREtXh8ww4QQPZV1ngTcfsMY_egbC1Pl1-J27rnRhgNhBx-kc4H4NiYQWKALEuaA_XIfUT2k9LmiSF0vC-F6AsW_rKgKiMuqgdUsvfYQUXQx_8SOQ2EL9To6490LuvhCHrIsTkyzVdwdFS5yDJI0VTDRkB_2o0lc5r9Q";

#[tokio::test]
#[ignore] // Run with --ignored flag for real API tests
async fn test_aliyun_connectivity() {
    println!("\n=== Testing Aliyun (Qwen) Connectivity ===\n");

    let client = Client::new();
    let start = Instant::now();

    let response = client
        .post("https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions")
        .header("Authorization", format!("Bearer {}", ALIYUN_API_KEY))
        .header("Content-Type", "application/json")
        .json(&json!({
            "model": "qwen-turbo",
            "messages": [{"role": "user", "content": "Say hello"}],
            "max_tokens": 10
        }))
        .send()
        .await;

    let latency = start.elapsed();

    match response {
        Ok(resp) => {
            println!("Status: {}", resp.status());
            println!("Latency: {:?}", latency);
            if resp.status().is_success() {
                println!("Result: ✅ Aliyun connected successfully");
            } else {
                let body = resp.text().await.unwrap_or_default();
                println!("Error: {}", body);
            }
        }
        Err(e) => println!("Error: {}", e),
    }
}

#[tokio::test]
#[ignore]
async fn test_zhipu_connectivity() {
    println!("\n=== Testing Zhipu (GLM) Connectivity ===\n");

    let client = Client::new();
    let start = Instant::now();

    let response = client
        .post("https://open.bigmodel.cn/api/paas/v4/chat/completions")
        .header("Authorization", format!("Bearer {}", ZHIPU_API_KEY))
        .header("Content-Type", "application/json")
        .json(&json!({
            "model": "glm-4-flash",
            "messages": [{"role": "user", "content": "Say hello"}],
            "max_tokens": 10
        }))
        .send()
        .await;

    let latency = start.elapsed();

    match response {
        Ok(resp) => {
            println!("Status: {}", resp.status());
            println!("Latency: {:?}", latency);
            if resp.status().is_success() {
                println!("Result: ✅ Zhipu connected successfully");
            } else {
                let body = resp.text().await.unwrap_or_default();
                println!("Error: {}", body);
            }
        }
        Err(e) => println!("Error: {}", e),
    }
}

#[tokio::test]
#[ignore]
async fn test_minimax_connectivity() {
    println!("\n=== Testing Minimax Connectivity ===\n");

    let client = Client::new();
    let start = Instant::now();

    let response = client
        .post("https://api.minimax.chat/v1/text/chatcompletion_v2")
        .header("Authorization", format!("Bearer {}", MINIMAX_API_KEY))
        .header("Content-Type", "application/json")
        .json(&json!({
            "model": "abab6.5s-chat",
            "messages": [{"role": "user", "content": "Say hello"}],
            "max_tokens": 10
        }))
        .send()
        .await;

    let latency = start.elapsed();

    match response {
        Ok(resp) => {
            println!("Status: {}", resp.status());
            println!("Latency: {:?}", latency);
            if resp.status().is_success() {
                println!("Result: ✅ Minimax connected successfully");
            } else {
                let body = resp.text().await.unwrap_or_default();
                println!("Error: {}", body);
            }
        }
        Err(e) => println!("Error: {}", e),
    }
}

#[tokio::test]
#[ignore]
async fn test_all_providers() {
    println!("\n=== Testing All Providers ===\n");
    // Note: Each provider test runs independently
    // Run with: cargo test --test real_provider_tests -- --nocapture --ignored
    println!("Run individual tests to see results");
}
