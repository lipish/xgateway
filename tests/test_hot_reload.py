#!/usr/bin/env python3
"""
测试 xgateway 热更新功能的脚本
"""

import requests
import json
import time
import sys

BASE_URL = "http://127.0.0.1:8080"

def test_get_current_config():
    """测试获取当前配置"""
    print("🔍 Testing GET /api/config/current...")
    try:
        response = requests.get(f"{BASE_URL}/api/config/current")
        if response.status_code == 200:
            config = response.json()
            print(f"✅ Current config: {json.dumps(config, indent=2)}")
            return config
        else:
            print(f"❌ Failed to get current config: {response.status_code}")
            return None
    except Exception as e:
        print(f"❌ Error getting current config: {e}")
        return None

def test_validate_key(provider, api_key, base_url=None):
    """测试验证 API Key"""
    print(f"🔍 Testing POST /api/config/validate-key for {provider}...")
    payload = {
        "provider": provider,
        "api_key": api_key
    }
    if base_url:
        payload["base_url"] = base_url
    
    try:
        response = requests.post(f"{BASE_URL}/api/config/validate-key", json=payload)
        result = response.json()
        print(f"✅ Validation result: {json.dumps(result, indent=2)}")
        return result.get("status") == "valid"
    except Exception as e:
        print(f"❌ Error validating key: {e}")
        return False

def test_update_key(provider, api_key, base_url=None):
    """测试更新 API Key"""
    print(f"🔧 Testing POST /api/config/update-key for {provider}...")
    payload = {
        "provider": provider,
        "api_key": api_key
    }
    if base_url:
        payload["base_url"] = base_url
    
    try:
        response = requests.post(f"{BASE_URL}/api/config/update-key", json=payload)
        result = response.json()
        print(f"✅ Update result: {json.dumps(result, indent=2)}")
        return result.get("status") == "success"
    except Exception as e:
        print(f"❌ Error updating key: {e}")
        return False

def test_switch_provider(provider, model=None, api_key=None, base_url=None):
    """测试切换 Provider"""
    print(f"🔄 Testing POST /api/config/switch-provider to {provider}...")
    payload = {
        "provider": provider
    }
    if model:
        payload["model"] = model
    if api_key:
        payload["api_key"] = api_key
    if base_url:
        payload["base_url"] = base_url
    
    try:
        response = requests.post(f"{BASE_URL}/api/config/switch-provider", json=payload)
        result = response.json()
        print(f"✅ Switch result: {json.dumps(result, indent=2)}")
        return result.get("status") == "success"
    except Exception as e:
        print(f"❌ Error switching provider: {e}")
        return False

def test_health():
    """测试健康检查"""
    print("🏥 Testing GET /api/health...")
    try:
        response = requests.get(f"{BASE_URL}/api/health")
        if response.status_code == 200:
            health = response.json()
            print(f"✅ Health check: {json.dumps(health, indent=2)}")
            return True
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error in health check: {e}")
        return False

def main():
    """主测试函数"""
    print("🚀 Starting xgateway hot reload tests...")
    print("=" * 50)
    
    # 测试健康检查
    if not test_health():
        print("❌ Service is not running. Please start xgateway first.")
        sys.exit(1)
    
    print("\n" + "=" * 50)
    
    # 测试获取当前配置
    current_config = test_get_current_config()
    if not current_config:
        print("❌ Cannot get current config")
        sys.exit(1)
    
    print(f"\n📋 Current provider: {current_config.get('provider')}")
    print(f"📋 Current model: {current_config.get('model')}")
    print(f"📋 Supports hot reload: {current_config.get('supports_hot_reload')}")
    
    print("\n" + "=" * 50)
    
    # 测试验证 API Key（使用假的 key 进行测试）
    test_validate_key("ollama", "fake-key")  # Ollama 不需要真实 key
    
    print("\n" + "=" * 50)
    
    # 测试切换到 Ollama（不需要 API key）
    if test_switch_provider("ollama", model="llama2", base_url="http://localhost:11434"):
        print("✅ Successfully switched to Ollama")
        
        # 验证配置是否更新
        time.sleep(1)
        new_config = test_get_current_config()
        if new_config and new_config.get('provider') == 'ollama':
            print("✅ Configuration updated successfully")
        else:
            print("❌ Configuration not updated")
    
    print("\n" + "=" * 50)
    print("🎉 Hot reload tests completed!")

if __name__ == "__main__":
    main()
