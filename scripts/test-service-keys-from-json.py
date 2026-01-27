#!/usr/bin/env python3
"""Run a simple smoke test using service keys exported from the Admin UI.

Input schema is the same as the admin export file (services-api-keys.json):
[
  {
    "service_id": "...",
    "service_name": "...",
    "api_keys": [{"id": 1, "name": "...", "api_key": "sk-..."}]
  }
]

This script intentionally avoids printing full API keys.
"""

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
    if args.keys_json:
        with open(args.keys_json, "r", encoding="utf-8") as f:
            data = json.load(f)
    else:
        raw = sys.stdin.read()
        if not raw.strip():
            raise SystemExit("missing keys: provide --keys-json or pipe JSON to stdin")
        data = json.loads(raw)

    if not isinstance(data, list):
        raise SystemExit("keys config must be a JSON array")

    return data


def _get_first_model_id(base_url: str, service_id: str, api_key: str, timeout_s: int) -> Optional[str]:
    url = f"{base_url.rstrip('/')}/v1/models"
    headers = {"Authorization": f"Bearer {api_key}"}
    try:
        r = requests.get(url, headers=headers, params={"service_id": service_id}, timeout=timeout_s)
        j = r.json()
    except Exception:
        return None

    if r.status_code != 200 or not isinstance(j, dict):
        return None

    data = j.get("data")
    if not isinstance(data, list) or not data:
        return None

    m0 = data[0]
    if not isinstance(m0, dict):
        return None

    mid = m0.get("id")
    return mid if isinstance(mid, str) and mid.strip() else None


def call_once(
    base_url: str,
    service_id: str,
    api_key: str,
    api_key_name: str,
    timeout_s: int,
) -> CallResult:
    model_id = _get_first_model_id(base_url, service_id, api_key, timeout_s) or "test"

    url = f"{base_url.rstrip('/')}/v1/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
    }
    body = {
        "service_id": service_id,
        "model": model_id,
        "stream": False,
        "messages": [{"role": "user", "content": "ping"}],
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

    # In XGateway, service_id is an external-facing service name; actual provider bindings may be absent.
    # Treat `no_available_model_service` as a successful auth/service lookup (but not an end-to-end provider success).
    ok = (r.status_code == 200 and (not isinstance(j, dict) or "error" not in j)) or (
        r.status_code == 503 and et == "no_available_model_service"
    )

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
    parser = argparse.ArgumentParser(description="Smoke test xgateway services using exported service API keys JSON")
    parser.add_argument("--base-url", default=os.environ.get("XGATEWAY_BASE_URL", "http://127.0.0.1:3000"))
    parser.add_argument("--keys-json", dest="keys_json", default=os.environ.get("XGATEWAY_KEYS_JSON"))
    parser.add_argument("--timeout", type=int, default=60)
    parser.add_argument("--sleep", type=float, default=0.2)
    parser.add_argument("--max-keys-per-service", type=int, default=1, help="limit keys to test per service")
    parser.add_argument("--seed", type=int, default=1)
    args = parser.parse_args()

    random.seed(args.seed)
    services = _load_services(args)

    results: List[CallResult] = []

    for svc in services:
        service_id = svc.get("service_id")
        if not isinstance(service_id, str) or not service_id.strip():
            continue

        api_keys = svc.get("api_keys")
        if not isinstance(api_keys, list) or not api_keys:
            continue

        # deterministically pick keys (stable ordering by name/id)
        api_keys_sorted = sorted(
            api_keys,
            key=lambda k: (
                str(k.get("name") or ""),
                int(k.get("id") or 0) if str(k.get("id") or "").isdigit() else 0,
            ),
        )

        for k in api_keys_sorted[: max(0, int(args.max_keys_per_service))]:
            api_key = k.get("api_key")
            api_key_name = k.get("name") or str(k.get("id") or "") or "(unnamed)"
            if not isinstance(api_key, str) or not api_key.strip():
                continue

            res = call_once(
                base_url=args.base_url,
                service_id=service_id,
                api_key=api_key,
                api_key_name=str(api_key_name),
                timeout_s=args.timeout,
            )
            results.append(res)
            time.sleep(max(0.0, args.sleep))

    print(f"base_url={args.base_url}")
    print(f"total_calls={len(results)}")

    ok_cnt = 0
    for r in results:
        ok_cnt += 1 if r.ok else 0
        status = "OK" if r.ok else "FAIL"
        err = "" if r.ok else f" error={r.error_type}:{(r.error_message or '')}"
        hint = ""
        if r.error_type == "no_available_model_service":
            hint = " hint=service_has_no_available_bound_provider"
        print(
            f"{status} service_id={r.service_id} api_key={r.api_key_name}({r.api_key_tail}) "
            f"status_code={r.status_code} latency_ms={r.latency_ms}{err}{hint}"
        )

    print(f"overall_ok={ok_cnt}/{len(results)}")
    return 0 if ok_cnt == len(results) else 1


if __name__ == "__main__":
    raise SystemExit(main())
