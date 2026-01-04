#!/usr/bin/env python3
import requests
import threading
import time
import json
import sys

BASE_URL = "http://127.0.0.1:3000"
ENDPOINT = f"{BASE_URL}/v1/chat/completions"
# Using the test API key
API_KEY = ""

# Providers found in the database
PROVIDERS = [
    {"id": 1, "name": "deepseek"},
    {"id": 2, "name": "seed-1.6"},
    {"id": 3, "name": "kimi-k2"},
    {"id": 4, "name": "longcat-flash"},
    {"id": 5, "name": "M2.1"},
]

results = []
results_lock = threading.Lock()

def user_chat_task(user_id, provider):
    print(f"👤 User {user_id} starting chat with provider: {provider['name']} (ID: {provider['id']})")
    
    payload = {
        "provider_id": provider["id"],
        "messages": [
            {"role": "user", "content": f"Hi, I am user {user_id}. Tell me something quick about multi-agent systems."}
        ],
        "stream": False
    }
    
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    
    start_time = time.time()
    try:
        response = requests.post(ENDPOINT, json=payload, headers=headers, timeout=30)
        latency = (time.time() - start_time) * 1000
        
        with results_lock:
            if response.status_code == 200:
                print(f"✅ User {user_id} (@{provider['name']}) received response in {latency:.2f}ms")
                results.append({
                    "user_id": user_id,
                    "provider": provider["name"],
                    "status": "success",
                    "latency": latency
                })
            elif response.status_code == 429:
                print(f"⚠️ User {user_id} (@{provider['name']}) rate limited: {response.status_code}")
                results.append({
                    "user_id": user_id,
                    "provider": provider["name"],
                    "status": "limited",
                    "code": 429,
                    "latency": latency
                })
            else:
                print(f"❌ User {user_id} (@{provider['name']}) failed: {response.status_code}")
                results.append({
                    "user_id": user_id,
                    "provider": provider["name"],
                    "status": "failed",
                    "code": response.status_code,
                    "latency": latency
                })
    except Exception as e:
        latency = (time.time() - start_time) * 1000
        print(f"❌ User {user_id} (@{provider['name']}) exception: {e}")
        with results_lock:
            results.append({
                "user_id": user_id,
                "provider": provider["name"],
                "status": "exception",
                "error": str(e),
                "latency": latency
            })

def main():
    print("🚀 Starting Multi-User Concurrency Test...")
    print(f"Targeting: {ENDPOINT}")
    print(f"API Key: {API_KEY[:8]}...")
    print("=" * 60)
    
    threads = []
    
    # Simulate 5 concurrent users
    # Since concurrency limit is 2, we expect 2 successes and 3 "limited"
    for i in range(5):
        provider = PROVIDERS[i % len(PROVIDERS)]
        t = threading.Thread(target=user_chat_task, args=(i+1, provider))
        threads.append(t)
        t.start()
    
    # Wait for all users to finish
    for t in threads:
        t.join()
    
    print("\n" + "=" * 60)
    print("📊 CONCURRENCY TEST SUMMARY")
    print("=" * 60)
    
    total_success = sum(1 for r in results if r["status"] == "success")
    total_limited = sum(1 for r in results if r["status"] == "limited")
    total_failed = len(results) - total_success - total_limited
    
    for r in results:
        status_str = f"[{r['status'].upper()}]"
        print(f"User {r['user_id']} | Provider: {r['provider']:<15} | Status: {status_str:<10} | Latency: {r['latency']:>8.2f}ms")
    
    print("-" * 60)
    print(f"TOTAL USERS: {len(results)}")
    print(f"SUCCESSFUL:  {total_success}")
    print(f"LIMITED:     {total_limited} (Expected if concurrency limit < users)")
    print(f"FAILED:      {total_failed}")
    
    if total_success >= 2 and total_limited > 0:
        print("\n✅ Concurrency limit (2) enforcement verified!")
    else:
        print("\n❌ Concurrency limit was NOT enforced correctly.")

if __name__ == "__main__":
    main()
