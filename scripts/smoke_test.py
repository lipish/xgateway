import urllib.request
import json
import sys
import time

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
        print(f"Error POST {path}: {e.code} - {e.read().decode()}")
        return None
    except Exception as e:
        print(f"Error POST {path}: {e}")
        return None

def get(path, token):
    url = f"{BASE_URL}{path}"
    headers = {"Authorization": f"Bearer {token}"}
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read())
    except Exception as e:
        print(f"Error GET {path}: {e}")
        return None

def chat_completion(api_key, provider_id, model, stream=False):
    url = f"{BASE_URL}/v1/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }
    data = {
        "model": model,
        "messages": [{"role": "user", "content": "Say hello in one word."}],
        "provider_id": provider_id,
        "stream": stream
    }
    
    print(f"   Sending request to model='{model}' (provider_id={provider_id})...")
    req = urllib.request.Request(url, json.dumps(data).encode(), headers)
    try:
        with urllib.request.urlopen(req) as response:
            if stream:
                # Just read first chunk for smoke test
                content = response.read().decode()
                return {"stream_content": content[:100] + "..."}
            return json.loads(response.read())
    except urllib.error.HTTPError as e:
        return {"error": f"HTTP {e.code}: {e.read().decode()}"}
    except Exception as e:
        return {"error": str(e)}

def main():
    print("=== Starting Smoke Test ===")
    
    # 1. Login
    print("1. Logging in...")
    login_res = post("/api/auth/login", {"username": ADMIN_USER, "password": ADMIN_PASS})
    if not login_res or not login_res.get("success"):
        print("   Login failed.")
        sys.exit(1)
    token = login_res["data"]["token"]
    print("   Success.")

    # 2. Get Enabled Providers (Moved up to bind them to key)
    print("2. Fetching Enabled Providers...")
    providers_res = get("/api/instances", token)
    if not providers_res or not providers_res.get("success"):
        print("   Failed to list providers.")
        sys.exit(1)
    
    providers = [p for p in providers_res["data"] if p["enabled"]]
    print(f"   Found {len(providers)} enabled providers.")
    provider_ids = [p["id"] for p in providers]

    # 3. Create Test API Key
    print("3. Creating Test API Key...")
    create_key_res = post("/api/api-keys", {
        "name": f"smoke-test-{int(time.time())}",
        "type": "sk-",
        "scope": "instance", # Bind to specific instances for better visibility
        "provider_ids": provider_ids
    }, token)
    
    api_key = None
    if create_key_res and create_key_res.get("success"):
        data = create_key_res["data"]
        # Try different fields for the key
        if "key" in data:
            api_key = data["key"]
        elif "full_key" in data:
            api_key = data["full_key"]
        elif "token" in data:
            api_key = data["token"]
        else:
            print(f"   Error: Could not find key in response: {data}")
            sys.exit(1)
            
        print(f"   Created temporary test key: {api_key[:10]}...")
    else:
        print(f"   Failed to create test key: {create_key_res}")
        sys.exit(1)

    # 4. Test Each Provider
    print("4. Testing Providers...")
    results = []
    for p in providers:
        if "ollama" in p['name'].lower():
            print(f"\n--- Skipping {p['name']} (as requested, no local instance) ---")
            continue
            
        print(f"\n--- Testing {p['name']} (ID: {p['id']}, Type: {p['provider_type']}) ---")
        
        # Parse config to get default model if needed, or use a generic one
        try:
            config = json.loads(p['config'])
            model = p.get('endpoint') # Sometimes endpoint is used as model name in old logic, but we fixed it.
            # We should use the model defined in init_test_data.py for these providers
            if "gpt-4o" in p['name']: model = "gpt-4o"
            elif "qwen" in p['name']: model = "qwen-flash"
            elif "deepseek" in p['name']: model = "deepseek-chat"
            elif "ollama" in p['name']: model = "llama3" # Assumption
            else: model = config.get("model", "gpt-3.5-turbo")
        except:
            model = "gpt-3.5-turbo"
            
        res = chat_completion(api_key, p['id'], model)
        
        status = "❌ Failed"
        details = ""
        if "choices" in res:
            content = res["choices"][0]["message"]["content"]
            status = "✅ Success"
            details = f"Response: {content}"
        else:
            details = f"Error: {res}"
            
        print(f"   {status}")
        print(f"   {details}")
        results.append({"name": p['name'], "status": status, "details": details})

    print("\n=== Test Summary ===")
    for r in results:
        print(f"{r['name']}: {r['status']}")

if __name__ == "__main__":
    main()
