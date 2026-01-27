#!/usr/bin/env python3
import argparse
import json
import os
import random
import sys
import time
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

import requests


@dataclass
class CallResult:
    service_id: str
    api_key_name: str
    api_key_tail: str
    ok: bool
    status_code: int
    latency_ms: int
    error_type: Optional[str]
    error_message: Optional[str]


def _mask_key(k: str) -> str:
    k = k or ""
    if len(k) <= 10:
        return "***"
    return f"{k[:7]}***{k[-4:]}"


def _extract_error(resp_json: Any) -> Tuple[Optional[str], Optional[str]]:
    if not isinstance(resp_json, dict):
        return None, None
    err = resp_json.get("error")
    if not isinstance(err, dict):
        return None, None
    et = err.get("type")
    em = err.get("message")
    return (et if isinstance(et, str) else None, em if isinstance(em, str) else None)


def _load_services(args: argparse.Namespace) -> List[Dict[str, Any]]:
    if args.config_path:
        with open(args.config_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    else:
        raw = sys.stdin.read()
        if not raw.strip():
            raise SystemExit("missing config: provide --config-path or pipe JSON to stdin")
        data = json.loads(raw)

    if not isinstance(data, list):
        raise SystemExit("config must be a JSON array")

    # expected schema (best-effort): [{service_id, service_name, api_keys:[{name, api_key}]}]
    return data


def _load_prompts(args: argparse.Namespace) -> List[str]:
    # Default prompts: short, safe, and varied; avoid long outputs.
    prompts = [
        "用一句话解释什么是负载均衡。",
        "用一句话解释 rate limit（限流）。",
        "把 'hello world' 翻译成中文，并保持简短。",
        "给我一个 10 个字以内的今天心情形容词。",
        "用一句话解释 service_id 的作用。",
        "用一句话解释什么是 SSE（Server-Sent Events）。",
        "请回复一个 JSON：{\"ok\": true}（不要多余文字）。",
        "用一句话解释什么是代理（proxy）。",
    ]

    if args.prompts_path:
        with open(args.prompts_path, "r", encoding="utf-8") as f:
            raw = f.read()
        lines = [ln.strip() for ln in raw.splitlines() if ln.strip()]
        if lines:
            prompts = lines

    return prompts


def call_once(
    base_url: str,
    service_id: str,
    api_key: str,
    api_key_name: str,
    timeout_s: int,
    prompts: List[str],
) -> CallResult:
    url = f"{base_url.rstrip('/')}/v1/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
    }
    body = {
        "service_id": service_id,
        "model": "test",
        "stream": False,
        "messages": [{"role": "user", "content": random.choice(prompts) if prompts else "ping"}],
    }

    t0 = time.time()
    try:
        r = requests.post(url, headers=headers, json=body, timeout=timeout_s)
    except Exception as e:
        latency_ms = int((time.time() - t0) * 1000)
        return CallResult(
            service_id=service_id,
            api_key_name=api_key_name,
            api_key_tail=_mask_key(api_key),
            ok=False,
            status_code=0,
            latency_ms=latency_ms,
            error_type="request_exception",
            error_message=str(e),
        )

    latency_ms = int((time.time() - t0) * 1000)

    et = None
    em = None
    try:
        j = r.json()
        et, em = _extract_error(j)
    except Exception:
        j = None

    ok = r.status_code == 200 and (not isinstance(j, dict) or "error" not in j)
    if not ok and et is None and r.status_code != 200:
        et = f"http_{r.status_code}"
        em = (r.text or "")[:500]

    return CallResult(
        service_id=service_id,
        api_key_name=api_key_name,
        api_key_tail=_mask_key(api_key),
        ok=ok,
        status_code=r.status_code,
        latency_ms=latency_ms,
        error_type=et,
        error_message=em,
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Smoke test xgateway services via /v1/chat/completions")
    parser.add_argument("--base-url", default=os.environ.get("XGATEWAY_BASE_URL", "http://127.0.0.1:3000"))
    parser.add_argument("--config-path", default=os.environ.get("XGATEWAY_SERVICES_JSON"))
    parser.add_argument("--calls", type=int, default=0, help="fixed calls per (service_id, api_key); set >0 to disable random")
    parser.add_argument("--min-calls", type=int, default=2, help="min random calls per (service_id, api_key) when --calls is 0")
    parser.add_argument("--max-calls", type=int, default=6, help="max random calls per (service_id, api_key) when --calls is 0")
    parser.add_argument("--seed", type=int, default=None, help="random seed for reproducible runs")
    parser.add_argument("--prompts-path", default=os.environ.get("XGATEWAY_TEST_PROMPTS"), help="optional text file with one prompt per line")
    parser.add_argument("--timeout", type=int, default=60)
    parser.add_argument("--sleep", type=float, default=0.2)
    args = parser.parse_args()

    services = _load_services(args)

    if args.seed is not None:
        random.seed(args.seed)

    min_calls = max(1, args.min_calls)
    max_calls = max(min_calls, args.max_calls)

    fixed_calls = int(args.calls or 0)
    if fixed_calls > 0:
        calls_for_pair = lambda: fixed_calls
    else:
        calls_for_pair = lambda: random.randint(min_calls, max_calls)

    prompts = _load_prompts(args)

    all_results: List[CallResult] = []

    for svc in services:
        service_id = svc.get("service_id")
        if not isinstance(service_id, str) or not service_id.strip():
            continue

        api_keys = svc.get("api_keys")
        if not isinstance(api_keys, list) or not api_keys:
            continue

        for k in api_keys:
            api_key = k.get("api_key")
            api_key_name = k.get("name") or str(k.get("id") or "")
            if not isinstance(api_key, str) or not api_key.strip():
                continue
            if not isinstance(api_key_name, str) or not api_key_name.strip():
                api_key_name = "(unnamed)"

            n_calls = calls_for_pair()
            for _ in range(n_calls):
                res = call_once(
                    base_url=args.base_url,
                    service_id=service_id,
                    api_key=api_key,
                    api_key_name=api_key_name,
                    timeout_s=args.timeout,
                    prompts=prompts,
                )
                all_results.append(res)
                time.sleep(max(0.0, args.sleep))

    # summary
    by_pair: Dict[Tuple[str, str, str], List[CallResult]] = {}
    for r in all_results:
        key = (r.service_id, r.api_key_name, r.api_key_tail)
        by_pair.setdefault(key, []).append(r)

    print(f"base_url={args.base_url}")
    print(f"total_calls={len(all_results)}")

    overall_ok = 0
    for (service_id, key_name, key_tail), items in sorted(by_pair.items(), key=lambda x: (x[0][0], x[0][1])):
        ok_cnt = sum(1 for x in items if x.ok)
        overall_ok += ok_cnt
        latencies = [x.latency_ms for x in items]
        latencies_sorted = sorted(latencies)
        p50 = latencies_sorted[len(latencies_sorted) // 2] if latencies_sorted else 0
        p95 = latencies_sorted[max(0, int(len(latencies_sorted) * 0.95) - 1)] if latencies_sorted else 0

        err_kinds: Dict[str, int] = {}
        for x in items:
            if not x.ok:
                et = x.error_type or "unknown"
                err_kinds[et] = err_kinds.get(et, 0) + 1

        err_str = "" if not err_kinds else " errors=" + ",".join([f"{k}:{v}" for k, v in sorted(err_kinds.items(), key=lambda kv: (-kv[1], kv[0]))])

        print(
            f"service_id={service_id} api_key={key_name}({key_tail}) calls={len(items)} ok={ok_cnt} "
            f"avg_ms={int(sum(latencies)/len(latencies))} p50_ms={p50} p95_ms={p95}{err_str}"
        )

    print(f"overall_ok={overall_ok}/{len(all_results)}")

    # exit code
    return 0 if overall_ok == len(all_results) else 1


if __name__ == "__main__":
    raise SystemExit(main())
