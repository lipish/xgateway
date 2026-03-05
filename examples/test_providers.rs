//! XGateway End-to-End Provider Integration Test
//!
//! Full pipeline:
//!   .env → llm_providers URL resolution → xgateway Admin API seed → API key creation → chat test
//!
//! Usage:
//!   cargo run --example test_providers
//!
//! Prerequisites:
//!   - xgateway running on 127.0.0.1:3001 (or set XGATEWAY_URL)
//!   - .env file with provider API keys at project root

use std::collections::HashMap;
use serde_json::{json, Value};

fn gateway_base() -> String {
    std::env::var("XGATEWAY_URL").unwrap_or_else(|_| "http://127.0.0.1:3001".to_string())
}

// ─── .env parser (section-aware REGION) ─────────────────────────────────────

fn load_env() -> HashMap<String, String> {
    let mut env = HashMap::new();
    if let Ok(content) = std::fs::read_to_string(".env") {
        let mut section: Option<&str> = None;

        for line in content.lines() {
            let trimmed = line.trim();
            if trimmed.is_empty() || trimmed.starts_with('#') {
                let upper = trimmed.to_uppercase();
                if upper.contains("OPENAI") {
                    section = Some("OPENAI");
                } else if upper.contains("ANTHROPIC") {
                    section = Some("ANTHROPIC");
                } else if upper.contains("ZHIPU") {
                    section = Some("ZHIPU");
                } else if upper.contains("MINIMAX") {
                    section = Some("MINIMAX");
                } else if upper.contains("MOONSHOT") {
                    section = Some("MOONSHOT");
                } else if upper.contains("DEEPSEEK") {
                    section = Some("DEEPSEEK");
                }
                continue;
            }
            if let Some((key, value)) = trimmed.split_once('=') {
                let key = key.trim();
                let value = value.trim();
                if key == "REGION" {
                    if let Some(sec) = section {
                        env.insert(format!("{}_REGION", sec), value.to_string());
                    }
                } else {
                    env.insert(key.to_string(), value.to_string());
                }
            }
        }
    } else {
        println!("  ⚠️  No .env file found, using system environment variables");
        for (key, value) in std::env::vars() {
            env.insert(key, value);
        }
    }
    env
}

// ─── llm_providers URL resolution ───────────────────────────────────────────

fn resolve_provider_url(provider_name: &str, region: &str) -> Option<String> {
    let providers = llm_providers::get_providers_data();
    let provider = match providers.get(provider_name) {
        Some(p) => p,
        None => {
            // Try matching by label if key name fails
            providers.values().find(|p| p.label.to_lowercase() == provider_name.to_lowercase())?
        }
    };

    // Priority: requested region → global → cn → first available
    if let Some(ep) = provider.endpoints.values().find(|ep| ep.region == region) {
        return Some(ep.base_url.to_string());
    }
    if let Some(ep) = provider.endpoints.get("global") {
        return Some(ep.base_url.to_string());
    }
    if let Some(ep) = provider.endpoints.get("cn") {
        return Some(ep.base_url.to_string());
    }
    provider.endpoints.values().next().map(|ep| ep.base_url.to_string())
}

fn capitalize(s: &str) -> String {
    let mut c = s.chars();
    match c.next() {
        None => String::new(),
        Some(f) => f.to_uppercase().collect::<String>() + c.as_str(),
    }
}

// ─── HTTP client helpers ────────────────────────────────────────────────────

fn build_http_client() -> reqwest::blocking::Client {
    reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .no_proxy()
        .build()
        .expect("Failed to build HTTP client")
}

fn gateway_post(client: &reqwest::blocking::Client, path: &str, body: &Value, token: Option<&str>) -> Value {
    let url = format!("{}{}", gateway_base(), path);
    let mut req = client.post(&url).json(body);
    if let Some(t) = token {
        req = req.bearer_auth(t);
    }
    match req.send() {
        Ok(resp) => {
            let status = resp.status().as_u16();
            let text = resp.text().unwrap_or_default();
            serde_json::from_str::<Value>(&text).unwrap_or_else(|e| {
                json!({"_error": true, "_status": status, "_body": text, "_parse_error": e.to_string()})
            })
        }
        Err(e) => json!({"_error": true, "_body": e.to_string()}),
    }
}

// ─── Provider definition ────────────────────────────────────────────────────

struct ProviderTest {
    name: String,
    provider_type: String,
    api_key: String,
    model: String,
    region: String,
    /// Explicit base_url (for relay-proxied providers like OpenAI/Anthropic).
    /// Empty string means "let xgateway resolve via llm_providers".
    base_url: String,
}

// ─── Main ───────────────────────────────────────────────────────────────────

fn main() {
    println!("═══════════════════════════════════════════════════════════");
    println!("  XGateway End-to-End Provider Integration Test");
    println!("═══════════════════════════════════════════════════════════");

    let env = load_env();
    let client = build_http_client();
    let run_id = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);

    // ── Phase 1: Build provider test configs ──

    println!("\n[Phase 1] Reading .env and resolving URLs via llm_providers...\n");

    let mut tests: Vec<ProviderTest> = Vec::new();

    // Zhipu
    let zhipu_region = "global";
    let zhipu_url = resolve_provider_url("zhipu", zhipu_region).unwrap_or_default();
    println!("  Zhipu   region={:8} → {}", zhipu_region, zhipu_url);
    tests.push(ProviderTest {
        name: format!("Zhipu-{}-{}", capitalize(zhipu_region), run_id),
        provider_type: "zhipu".into(),
        api_key: env.get("ZHIPU_API_KEY").cloned().unwrap_or_default(),
        model: "glm-4.5".into(),
        region: zhipu_region.into(),
        base_url: String::new(), // resolved by xgateway via llm_providers
    });

    // Moonshot
    let moon_region = env.get("MOONSHOT_REGION").map(|s| s.as_str()).unwrap_or("global");
    let moon_url = resolve_provider_url("moonshot", moon_region).unwrap_or_default();
    println!("  Moonshot region={:8} → {}", moon_region, moon_url);
    tests.push(ProviderTest {
        name: format!("Moonshot-{}-{}", capitalize(moon_region), run_id),
        provider_type: "moonshot".into(),
        api_key: env.get("MOONSHOT_API_KEY").cloned().unwrap_or_default(),
        model: env.get("MOONSHOT_MODEL").cloned().unwrap_or("kimi-k2.5".into()),
        region: moon_region.into(),
        base_url: String::new(),
    });

    // MiniMax (explicit base_url from .env, or resolved via llm_providers)
    let mm_region = env.get("MINIMAX_REGION").map(|s| s.as_str()).unwrap_or("global");
    let mm_env_url = env.get("MINIMAX_BASE_URL").cloned().unwrap_or_default();
    let mm_resolved = resolve_provider_url("minimax", mm_region).unwrap_or_default();
    let mm_url = if mm_env_url.is_empty() { mm_resolved.clone() } else { mm_env_url.clone() };
    println!("  MiniMax region={:8} → {}", mm_region, mm_url);
    tests.push(ProviderTest {
        name: format!("MiniMax-{}-{}", capitalize(mm_region), run_id),
        provider_type: "minimax".into(),
        api_key: env.get("MINIMAX_API_KEY").cloned().unwrap_or_default(),
        model: "MiniMax-Text-01".into(),
        region: mm_region.into(),
        base_url: mm_env_url,
    });

    // DeepSeek
    let ds_region = env.get("DEEPSEEK_REGION").map(|s| s.as_str()).unwrap_or("global");
    let ds_url = resolve_provider_url("deepseek", ds_region).unwrap_or_default();
    println!("  DeepSeek region={:8} → {}", ds_region, ds_url);
    tests.push(ProviderTest {
        name: format!("DeepSeek-{}-{}", capitalize(ds_region), run_id),
        provider_type: "deepseek".into(),
        api_key: env.get("DEEPSEEK_API_KEY").cloned().unwrap_or_default(),
        model: "deepseek-chat".into(),
        region: ds_region.into(),
        base_url: String::new(),
    });

    // OpenAI (relay proxy from .env)
    let oai_base = env.get("OPENAI_BASE_URL").cloned().unwrap_or_default();
    println!("  OpenAI  relay            → {}", if oai_base.is_empty() { "default" } else { &oai_base });
    tests.push(ProviderTest {
        name: format!("OpenAI-Proxy-{}", run_id),
        provider_type: "openai".into(),
        api_key: env.get("OPENAI_API_KEY").cloned().unwrap_or_default(),
        model: env.get("OPENAI_MODEL").cloned().unwrap_or("gpt-4o".into()),
        region: "global".into(),
        base_url: oai_base.clone(),
    });

    // Anthropic (relay proxy from .env)
    let ant_base = env.get("ANTHROPIC_BASE_URL").cloned().unwrap_or_default();
    println!("  Anthropic relay          → {}", if ant_base.is_empty() { "default" } else { &ant_base });
    tests.push(ProviderTest {
        name: format!("Anthropic-Proxy-{}", run_id),
        provider_type: "anthropic".into(),
        api_key: env.get("ANTHROPIC_API_KEY").cloned().unwrap_or_default(),
        model: env.get("ANTHROPIC_MODEL").cloned().unwrap_or("claude-3-5-sonnet-20240620".into()),
        region: "global".into(),
        base_url: ant_base.clone(),
    });

    // ── Phase 2: Login & Seed providers ──

    println!("\n[Phase 2] Seeding provider instances into xgateway...\n");
    let login_res = gateway_post(&client, "/api/auth/login", &json!({"username": "admin", "password": "admin123"}), None);
    let token = login_res["data"]["token"].as_str().unwrap_or_else(|| {
        panic!(
            "Login failed – cannot get token. Response: {}",
            login_res
        )
    });
    println!("  ✅ Admin login successful");

    let mut seeded: Vec<(usize, i64)> = Vec::new(); // (test_index, provider_id)

    for (i, t) in tests.iter().enumerate() {
        if t.api_key.is_empty() {
            println!("  ⏭️  Skipping {} (no API key)", t.name);
            continue;
        }

        let mut config = json!({
            "api_key": t.api_key,
            "region": t.region,
            "model": t.model,
        });
        if !t.base_url.is_empty() {
            config["base_url"] = json!(t.base_url);
        }

        let req = json!({
            "name": t.name,
            "provider_type": t.provider_type,
            "config": config.to_string(),
            "enabled": true,
            "priority": 100,
        });
        let res = gateway_post(&client, "/api/instances", &req, Some(token));
        let mut provider_id = res["data"]["id"].as_i64();

        // If "data" is not directly the ID, it might be in an object
        if provider_id.is_none() {
            provider_id = res["data"].get("id").and_then(|id| {
                if let Some(n) = id.as_i64() { Some(n) }
                else if let Some(s) = id.as_str() { s.parse::<i64>().ok() }
                else { None }
            });
        }

        if let Some(id) = provider_id {
            println!("  ✅ {} created (id={})", t.name, id);
            seeded.push((i, id));
        } else {
            println!("  ⚠️  {} — {}", t.name, res.get("message").or(res.get("_body")).unwrap_or(&json!("unknown")));
        }
    }

    if seeded.is_empty() {
        eprintln!("\n❌ No providers created. Aborting.");
        std::process::exit(1);
    }

    // ── Phase 3: Create instance-scoped API keys ──

    println!("\n[Phase 3] Creating API keys (one per provider)...\n");
    let mut api_keys: Vec<(usize, String)> = Vec::new(); // (test_index, api_key)

    for &(test_idx, pid) in &seeded {
        let t = &tests[test_idx];
        let req = json!({
            "name": format!("test-{}", t.name),
            "scope": "instance",
            "protocol": "openai",
            "provider_ids": [pid],
            "strategy": "Priority",
            "qps_limit": 100.0,
            "concurrency_limit": 10,
        });
        let res = gateway_post(&client, "/api/api-keys", &req, Some(token));
        if let Some(full_key) = res["data"]["full_key"].as_str() {
            println!("  ✅ {} → {}...", t.name, &full_key[..20.min(full_key.len())]);
            api_keys.push((test_idx, full_key.to_string()));
        } else {
            println!("  ❌ {} — {}", t.name, res.get("message").unwrap_or(&json!("unknown")));
        }
    }

    // Wait for pool initialization
    println!("\n  ⏳ Waiting 5s for provider pool to pick up new instances...");
    std::thread::sleep(std::time::Duration::from_secs(5));

    // ── Phase 4: Chat completion tests ──

    println!("\n[Phase 4] Testing chat completions through xgateway...\n");
    let mut results: Vec<(&str, bool)> = Vec::new();

    for &(test_idx, ref api_key) in &api_keys {
        let t = &tests[test_idx];
        println!("--- {} (model={}, region={}) ---", t.name, t.model, t.region);

        let chat_body = json!({
            "model": t.model,
            "messages": [{"role": "user", "content": "Say hello in exactly 5 words."}],
            "stream": false,
        });

        let resp = client
            .post(format!("{}/v1/chat/completions", gateway_base()))
            .bearer_auth(api_key)
            .json(&chat_body)
            .timeout(std::time::Duration::from_secs(60))
            .send();

        match resp {
            Ok(r) => {
                let status = r.status();
                let body: Value = r.json().unwrap_or(json!({"error": "failed to parse"}));
                if status.is_success() {
                    let content = body["choices"][0]["message"]["content"]
                        .as_str()
                        .or_else(|| {
                            // Handle array-style content from some providers
                            body["choices"][0]["message"]["content"][0]["text"].as_str()
                        })
                        .unwrap_or("<no content>");
                    println!("  ✅ PASS: {}", content);
                    results.push((&t.name, true));
                } else {
                    let err_msg = body["error"]["message"].as_str().unwrap_or("unknown error");
                    println!("  ❌ FAIL (HTTP {}): {}", status.as_u16(), err_msg);
                    println!("  ↳ full response: {}", body);
                    results.push((&t.name, false));
                }
            }
            Err(e) => {
                println!("  ❌ FAIL: {}", e);
                results.push((&t.name, false));
            }
        }
        println!();
    }

    // ── Summary ──

    println!("═══════════════════════════════════════════════════════════");
    println!("  SUMMARY");
    println!("═══════════════════════════════════════════════════════════");
    let passed = results.iter().filter(|(_, ok)| *ok).count();
    for (name, ok) in &results {
        println!("  {} {}", if *ok { "✅" } else { "❌" }, name);
    }
    println!("\n  Result: {}/{} providers passed", passed, results.len());
    println!("═══════════════════════════════════════════════════════════");

    if passed < results.len() {
        std::process::exit(1);
    }
}

