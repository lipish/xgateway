use crate::apps::{SupportedApp, AppInfoProvider};
use tracing::error;

/// 列出所有支持的应用
pub fn list_applications() {
    println!("📱 Supported Applications:");
    println!();

    for app in SupportedApp::all() {
        let info = AppInfoProvider::get_app_info(&app);
        println!("  {} - {}", app.name(), info.description);
        println!("    Port: {}", info.port);
        println!("    Protocol: {}", info.protocol);
        println!();
    }

    println!(" Usage:");
    println!("  ./xgateway --app <app-name> --provider <provider>");
    println!();
    println!("📚 For detailed setup:");
    println!("  ./xgateway --app-info <app-name>");
}

/// 显示应用详细信息
pub fn show_application_info(app_name: &str) {
    if let Some(app) = SupportedApp::from_str(app_name) {
        let info = AppInfoProvider::get_app_info(&app);

        println!("📱 {} Configuration", info.name);
        println!("   Description: {}", info.description);
        println!("   Port: {}", info.port);
        println!("   Protocol: {}", info.protocol);
        println!("   Endpoints: {}", info.endpoints.join(", "));
        println!("   Auth Required: {}", if info.auth_required { "Yes" } else { "No" });
        println!();

        println!(" Required Parameters:");
        println!();
        println!("  You MUST specify --provider and pass the provider API key explicitly:");
        println!();
        println!("   --provider openai      (pass OpenAI key via --api-key)");
        println!("   --provider anthropic   (pass Anthropic key via --api-key)");
        println!("   --provider zhipu       (pass Zhipu key via --api-key)");
        println!("   --provider aliyun      (pass Qwen key via --api-key)");
        println!("   --provider volcengine  (pass Doubao key via --api-key)");
        println!("   --provider tencent     (pass Hunyuan key via --api-key)");
        println!("   --provider ollama      (no provider API key needed)");
        println!();
        
        if info.auth_required {
            println!("   --auth-key <TOKEN>     (protects xgateway HTTP APIs, not forwarded upstream)");
            println!();
        }

        println!(" Example:");
        println!();
        println!("   ./xgateway --app {} --provider openai --api-key sk-openai-xxx", app_name);
        println!();
        println!("   # Or use a different provider:");
        println!("   ./xgateway --app {} --provider anthropic --api-key sk-ant-xxx", app_name);
        println!();
    } else {
        error!("Unknown application: {}", app_name);
        println!();
        println!("Available applications:");
        for app in SupportedApp::all() {
            println!("  - {}", app.name());
        }
    }
}

