import urllib.request
import urllib.error
import json
import sys
import os

BASE_URL = "http://127.0.0.1:3105"
ADMIN_USER = "admin"
ADMIN_PASS = "admin123"

def post(path, data, token=None):
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    req = urllib.request.Request(url, json.dumps(data).encode(), headers)
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read())
    except urllib.error.HTTPError as e:
        print(f"Error calling {path}: {e.code} - {e.read().decode()}")
        return None

def get(path, token=None):
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read())
    except urllib.error.HTTPError as e:
        print(f"Error calling {path}: {e.code} - {e.read().decode()}")
        return None

def delete(path, token=None):
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    req = urllib.request.Request(url, method="DELETE", headers=headers)
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read())
    except urllib.error.HTTPError as e:
        print(f"Error calling {path}: {e.code} - {e.read().decode()}")
        return None

def put(path, data, token=None):
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, json.dumps(data).encode(), headers, method="PUT")
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read())
    except urllib.error.HTTPError as e:
        print(f"Error calling {path}: {e.code} - {e.read().decode()}")
        return None

def main():
    print(f"Connecting to {BASE_URL}...")

    # 1. 注册 (尝试注册，如果已存在则忽略错误)
    # ... (省略注册部分，保持不变) ...
    print("1. Registering admin user...")
    register_res = post("/api/auth/register", {"username": ADMIN_USER, "password": ADMIN_PASS})
    if register_res and not register_res.get("success"):
        print(f"   Note: {register_res.get('message')}")

    # 2. 登录
    print("2. Logging in...")
    login_res = post("/api/auth/login", {"username": ADMIN_USER, "password": ADMIN_PASS})
    if not login_res or not login_res.get("success"):
        print("Login failed! Please check if the server is running.")
        sys.exit(1)
    
    token = login_res["data"]["token"]
    print("   Login successful. Token obtained.")

    # 2.5 清理旧数据 (Provider 和 API Key)
    print("2.5 Cleaning up old data...")
    
    # 清理 API Key
    api_keys_res = get("/api/api-keys", token)
    if api_keys_res and api_keys_res.get("success") and api_keys_res.get("data"):
        for key in api_keys_res["data"]:
            if key["name"] in ["test-key-prod", "test-key-01"]:
                print(f"   Deleting old API Key: {key['name']} (ID: {key['id']})")
                delete(f"/api/api-keys/{key['id']}", token)

    # 清理 Provider
    providers_res = get("/api/instances", token)
    if providers_res and providers_res.get("success") and providers_res.get("data"):
        for p in providers_res["data"]:
            if "openai-main" in p["name"] or "aliyun-main" in p["name"] or "deepseek-main" in p["name"] or "OpenAI (" in p["name"] or "Aliyun (" in p["name"] or "DeepSeek (" in p["name"]:
                print(f"   Deleting old Provider: {p['name']} (ID: {p['id']})")
                delete(f"/api/instances/{p['id']}", token)

    # 3. 创建 Provider (Aliyun, DeepSeek, OpenAI)
    print("3. Creating providers from environment variables...")
    
    # Load provider models from JSON
    try:
        with open("scripts/provider-models.json", "r") as f:
            provider_models_data = json.load(f)
    except Exception as e:
        print(f"Warning: Could not load scripts/provider-models.json: {e}")
        provider_models_data = {}

    openai_endpoint = os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1")
    
    def get_models_map(provider_key):
        if provider_key in provider_models_data:
            models = provider_models_data[provider_key].get("models", [])
            return {m["id"]: m["id"] for m in models}
        return {}

    providers_config = [
        {
            "env": "OPENAI_API_KEY",
            "name": "OpenAI (gpt-4o)",
            "type": "openai",
            "endpoint": openai_endpoint, # Optional for OpenAI but good to be explicit
            "priority": 10, # Lower priority for generic/fallback
            "default_model": "gpt-4o"
        },
        {
            "env": "ALIYUN_API_KEY",
            "name": "Aliyun (qwen-flash)",
            "type": "aliyun",
            "endpoint": "https://dashscope.aliyuncs.com/compatible-mode/v1",
            "priority": 20, # Higher priority for specific provider
            "default_model": "qwen-flash"
        },
        {
            "env": "DEEPSEEK_API_KEY",
            "name": "DeepSeek (deepseek-chat)",
            "type": "deepseek",
            "endpoint": "https://api.deepseek.com/v1", # Check exact DeepSeek endpoint
            "priority": 20, # Higher priority for specific provider
            "default_model": "deepseek-chat"
        }
    ]

    created_providers = []
    created_provider_ids = []

    for p in providers_config:
        api_key = os.environ.get(p["env"])
        if api_key:
            print(f"   Creating provider '{p['name']}'...")
            # Use default_model in config
            config = {
                "api_key": api_key,
                "model": p.get("default_model", ""),
            }
            
            # DeepSeek might need base_url in config or as endpoint
            req = {
                "name": p["name"],
                "provider_type": p["type"],
                "config": json.dumps(config),
                "endpoint": p["endpoint"],
                "enabled": True,
                "priority": p["priority"]
            }
            
            res = post("/api/instances", req, token)
            if res and res.get("success"):
                print(f"   Provider '{p['name']}' created successfully.")
                created_providers.append(p["type"])
                if res.get("data") and res["data"].get("id"):
                    pid = res["data"]["id"]
                    created_provider_ids.append(pid)
                    # Explicitly enable provider (workaround for potential bug)
                    put(f"/api/instances/{pid}", {"enabled": True}, token)
            else:
                print(f"   Failed to create provider '{p['name']}': {res}")
        else:
            print(f"   Skipping '{p['name']}': {p['env']} not set.")

    if not created_providers:
        print("\nWARNING: No providers created. Please set ALIYUN_API_KEY, DEEPSEEK_API_KEY, or OPENAI_API_KEY in .env")

    # 4. 创建 API Key
    print("4. Creating API Key...")
    create_key_req = {
        "name": "test-key-prod",
        "scope": "instance", # Change to instance to bind specific providers
        "provider_ids": created_provider_ids, # Bind all created providers
        "protocol": "openai",
        "strategy": "Priority", 
        "qps_limit": 1000.0,
        "concurrency_limit": 50
    }
    key_res = post("/api/api-keys", create_key_req, token)
    
    api_key = None
    if key_res and key_res.get("success"):
        api_key_data = key_res["data"]
        api_key = api_key_data.get("full_key")
        print(f"   API Key created successfully: {api_key}")
    else:
        # If creation fails (e.g. duplicate name?), try listing keys
        print(f"   Failed to create API Key (might exist): {key_res}")
        # Try to get existing key for demo? No, we can't retrieve the full key again.
        print("   If the key already exists, please use the one you saved previously.")

    # 5. 输出测试命令
    if api_key:
        print("\n" + "="*50)
        print("SETUP COMPLETE!")
        
        example_model = "gpt-3.5-turbo"
        if "aliyun" in created_providers:
            example_model = "qwen-plus"
        elif "deepseek" in created_providers:
            example_model = "deepseek-chat"
            
        print("You can verify with the following curl command:")
        print(f"""
curl {BASE_URL}/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer {api_key}" \\
  -d '{{
    "model": "{example_model}", 
    "messages": [{{"role": "user", "content": "Hello from XGateway!"}}]
  }}'
""")
        print("="*50)

if __name__ == "__main__":
    main()
