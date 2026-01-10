#!/usr/bin/env python3
import requests
import threading
import time
import json
import sys
import argparse
import statistics
from typing import Any, Dict, List, Optional
import os
import sqlite3

BASE_URL = "http://127.0.0.1:3000"
ENDPOINT = f"{BASE_URL}/v1/chat/completions"
# Using the test API key
API_KEY = ""

# Fallback providers list (only used when DB cannot be read)
PROVIDERS = [
    {"id": 1, "name": "deepseek"},
    {"id": 2, "name": "seed-1.6"},
    {"id": 3, "name": "kimi-k2"},
    {"id": 4, "name": "longcat-flash"},
    {"id": 5, "name": "M2.1"},
]

results = []
results_lock = threading.Lock()


def percentile(values: List[float], pct: float) -> Optional[float]:
    if not values:
        return None
    values_sorted = sorted(values)
    if len(values_sorted) == 1:
        return values_sorted[0]
    k = (len(values_sorted) - 1) * (pct / 100.0)
    f = int(k)
    c = min(f + 1, len(values_sorted) - 1)
    if f == c:
        return values_sorted[f]
    d0 = values_sorted[f] * (c - k)
    d1 = values_sorted[c] * (k - f)
    return d0 + d1


def extract_usage(resp_json: Any) -> Dict[str, Optional[int]]:
    usage = {}
    if isinstance(resp_json, dict):
        u = resp_json.get("usage")
        if isinstance(u, dict):
            usage = {
                "prompt_tokens": u.get("prompt_tokens"),
                "completion_tokens": u.get("completion_tokens"),
                "total_tokens": u.get("total_tokens"),
            }
    return usage


def build_payload(provider_id: int, messages: List[Dict[str, str]]) -> Dict[str, Any]:
    return {
        "provider_id": provider_id,
        "messages": messages,
        "stream": False,
    }


def do_request(provider: Dict[str, Any], headers: Dict[str, str], messages: List[Dict[str, str]], timeout_s: int) -> Dict[str, Any]:
    payload = build_payload(provider["id"], messages)
    start_time = time.time()
    try:
        response = requests.post(ENDPOINT, json=payload, headers=headers, timeout=timeout_s)
        latency = (time.time() - start_time) * 1000
        try:
            resp_json = response.json()
        except Exception:
            resp_json = None

        row: Dict[str, Any] = {
            "provider": provider["name"],
            "provider_id": provider["id"],
            "http_status": response.status_code,
            "latency": latency,
            "usage": extract_usage(resp_json),
        }

        if response.status_code == 200:
            row["status"] = "success"
        elif response.status_code == 429:
            row["status"] = "limited"
            row["code"] = 429
        else:
            row["status"] = "failed"
            row["code"] = response.status_code
            if isinstance(resp_json, dict):
                row["error"] = resp_json.get("error")
        return row
    except Exception as e:
        latency = (time.time() - start_time) * 1000
        return {
            "provider": provider["name"],
            "provider_id": provider["id"],
            "status": "exception",
            "error": str(e),
            "latency": latency,
        }

def user_chat_task(user_id, provider, requests_per_provider, multi_turn_ratio, timeout_s):
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }

    for idx in range(requests_per_provider):
        is_multi_turn = (multi_turn_ratio > 0) and ((idx % int(1 / multi_turn_ratio)) == 0) if multi_turn_ratio < 1 else True

        if is_multi_turn:
            messages = [
                {"role": "user", "content": f"Hi, I am user {user_id}. Please answer briefly: what is a multi-agent system?"},
                {"role": "user", "content": "Give 3 key points, each under 15 words."},
            ]
        else:
            messages = [
                {"role": "user", "content": f"Hi, I am user {user_id}. Tell me something quick about multi-agent systems."}
            ]

        row = do_request(provider, headers, messages, timeout_s)
        row["user_id"] = user_id
        row["turn"] = 2 if is_multi_turn else 1
        with results_lock:
            results.append(row)

def main():
    global BASE_URL, ENDPOINT, API_KEY, PROVIDERS

    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default=BASE_URL)
    parser.add_argument("--api-key", default=API_KEY)
    parser.add_argument("--provider-ids", default="")
    parser.add_argument("--db-path", default="data/llm_link.db")
    parser.add_argument("--requests-per-provider", type=int, default=10)
    parser.add_argument("--users", type=int, default=3)
    parser.add_argument("--timeout", type=int, default=30)
    parser.add_argument("--multi-turn-ratio", type=float, default=0.3)
    args = parser.parse_args()

    BASE_URL = args.base_url
    ENDPOINT = f"{BASE_URL}/v1/chat/completions"
    API_KEY = args.api_key

    # Try to load providers from sqlite DB for accurate names
    try:
        db_path = args.db_path
        if db_path and os.path.exists(db_path):
            conn = sqlite3.connect(db_path)
            cur = conn.cursor()
            cur.execute("select id, name from providers order by id")
            rows = cur.fetchall()
            conn.close()
            if rows:
                PROVIDERS = [{"id": int(r[0]), "name": str(r[1])} for r in rows]
    except Exception:
        # Fallback to static PROVIDERS
        pass

    if args.provider_ids.strip():
        ids = [int(x.strip()) for x in args.provider_ids.split(",") if x.strip()]
        PROVIDERS = [p for p in PROVIDERS if p["id"] in ids]

    print("🚀 Starting Multi-User Concurrency Test...")
    print(f"Targeting: {ENDPOINT}")
    print(f"API Key: {API_KEY[:8]}...")
    print("=" * 60)
    
    threads = []
    
    if not API_KEY:
        print("❌ API_KEY is empty. Please provide --api-key")
        sys.exit(2)

    if len(PROVIDERS) == 0:
        print("❌ No providers selected. Please provide --provider-ids or check PROVIDERS list")
        sys.exit(2)

    # Spread users across providers
    for i in range(args.users):
        provider = PROVIDERS[i % len(PROVIDERS)]
        t = threading.Thread(
            target=user_chat_task,
            args=(i + 1, provider, args.requests_per_provider, args.multi_turn_ratio, args.timeout),
        )
        threads.append(t)
        t.start()
    
    # Wait for all users to finish
    for t in threads:
        t.join()
    
    print("\n" + "=" * 60)
    print("📊 CONCURRENCY TEST SUMMARY")
    print("=" * 60)
    
    by_provider: Dict[str, List[Dict[str, Any]]] = {}
    for r in results:
        by_provider.setdefault(r.get("provider", "unknown"), []).append(r)

    def summarize(rows: List[Dict[str, Any]]) -> Dict[str, Any]:
        lat = [float(r.get("latency", 0.0)) for r in rows if isinstance(r.get("latency"), (int, float))]
        success = [r for r in rows if r.get("status") == "success"]
        limited = [r for r in rows if r.get("status") == "limited"]
        failed = [r for r in rows if r.get("status") in ("failed", "exception")]

        total_tokens = []
        for r in success:
            u = r.get("usage")
            if isinstance(u, dict) and isinstance(u.get("total_tokens"), int):
                total_tokens.append(u.get("total_tokens"))

        return {
            "count": len(rows),
            "success": len(success),
            "limited": len(limited),
            "failed": len(failed),
            "avg_ms": statistics.mean(lat) if lat else None,
            "p50_ms": percentile(lat, 50) if lat else None,
            "p95_ms": percentile(lat, 95) if lat else None,
            "tokens_total_sum": sum(total_tokens) if total_tokens else None,
        }

    total_success = sum(1 for r in results if r.get("status") == "success")
    total_limited = sum(1 for r in results if r.get("status") == "limited")
    total_failed = len(results) - total_success - total_limited

    for provider_name, rows in by_provider.items():
        s = summarize(rows)
        print(f"Provider: {provider_name} | Count: {s['count']} | OK: {s['success']} | 429: {s['limited']} | Fail: {s['failed']} | Avg: {s['avg_ms'] and round(s['avg_ms'],2)}ms | P50: {s['p50_ms'] and round(s['p50_ms'],2)}ms | P95: {s['p95_ms'] and round(s['p95_ms'],2)}ms")

    print("-" * 60)
    print(f"TOTAL REQUESTS: {len(results)}")
    print(f"SUCCESSFUL:     {total_success}")
    print(f"LIMITED(429):   {total_limited}")
    print(f"FAILED:         {total_failed}")

if __name__ == "__main__":
    main()
