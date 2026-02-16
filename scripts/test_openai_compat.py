#!/usr/bin/env python3
import argparse
import os
import sys
import time
from typing import Any, Dict, Optional

import requests
from requests.exceptions import SSLError


def _mask_key(k: str) -> str:
    k = k or ""
    if len(k) <= 10:
        return "***"
    return f"{k[:7]}***{k[-4:]}"


def _pick_model_id(base_url: str, api_key: str, timeout_s: int) -> Optional[str]:
    url = f"{base_url.rstrip('/')}/v1/models"
    headers = {"Authorization": f"Bearer {api_key}"}
    try:
        s = requests.Session()
        s.trust_env = False
        r = s.get(url, headers=headers, timeout=timeout_s)
        j = r.json()
    except SSLError as e:
        hint = ""
        if isinstance(base_url, str) and base_url.startswith("https://") and ":3000" in base_url:
            hint = (
                " hint=ssl_error;_port_3000_may_be_plain_http. "
                "try_base_url=http://xgateway.xinference.cn:3000 (or use https on 443 if configured)"
            )
        print(
            f"FAIL model_list_exception base_url={base_url} api_key={_mask_key(api_key)} error={e}{hint}"
        )
        return None
    except Exception as e:
        print(f"FAIL model_list_exception base_url={base_url} api_key={_mask_key(api_key)} error={e}")
        return None

    if r.status_code != 200 or not isinstance(j, dict):
        body_preview = (r.text or "")[:300]
        print(
            f"WARN model_list_non_200 base_url={base_url} api_key={_mask_key(api_key)} "
            f"status_code={r.status_code} body_preview={body_preview!r}"
        )
        return None

    data = j.get("data")
    if not isinstance(data, list) or not data:
        return None

    m0 = data[0]
    if not isinstance(m0, dict):
        return None

    mid = m0.get("id")
    return mid if isinstance(mid, str) and mid.strip() else None


def _extract_content(resp_json: Any) -> Optional[str]:
    if not isinstance(resp_json, dict):
        return None
    choices = resp_json.get("choices")
    if not isinstance(choices, list) or not choices:
        return None
    c0 = choices[0]
    if not isinstance(c0, dict):
        return None
    msg = c0.get("message")
    if isinstance(msg, dict):
        content = msg.get("content")
        return content if isinstance(content, str) else None
    return None


def _extract_choice_debug(resp_json: Any) -> str:
    if not isinstance(resp_json, dict):
        return ""
    choices = resp_json.get("choices")
    if not isinstance(choices, list) or not choices:
        return ""
    c0 = choices[0]
    if not isinstance(c0, dict):
        return ""
    finish_reason = c0.get("finish_reason")
    finish_reason_s = finish_reason if isinstance(finish_reason, str) else ""
    msg = c0.get("message")
    if not isinstance(msg, dict):
        return f"finish_reason={finish_reason_s} message=(non_dict)"
    # avoid printing huge payloads
    msg_preview = {k: msg.get(k) for k in ("role", "content", "tool_calls", "name") if k in msg}
    s = str(msg_preview)
    if len(s) > 400:
        s = s[:400] + "..."
    return f"finish_reason={finish_reason_s} message_preview={s}"


def main() -> int:
    parser = argparse.ArgumentParser(description="Test xgateway OpenAI-compatible API via /v1/chat/completions")
    parser.add_argument("--base-url", default=os.environ.get("XGATEWAY_BASE_URL", "http://xgateway.xinference.cn:3000"))
    parser.add_argument("--api-key", default=os.environ.get("XGATEWAY_API_KEY", ""))
    parser.add_argument("--model", default=os.environ.get("XGATEWAY_MODEL", ""), help="optional; if empty, will try /v1/models")
    parser.add_argument("--timeout", type=int, default=int(os.environ.get("XGATEWAY_TIMEOUT", "60")))
    parser.add_argument(
        "--trust-env",
        action="store_true",
        default=False,
        help="honor HTTP_PROXY/HTTPS_PROXY/NO_PROXY from environment (default: disabled)",
    )
    args = parser.parse_args()

    base_url = args.base_url
    api_key = args.api_key
    if not api_key:
        raise SystemExit("missing api key: set XGATEWAY_API_KEY or pass --api-key")

    model = args.model.strip() or _pick_model_id(base_url, api_key, args.timeout) or "gpt-4"

    url = f"{base_url.rstrip('/')}/v1/chat/completions"
    s = requests.Session()
    s.trust_env = bool(args.trust_env)
    headers: Dict[str, str] = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
    }
    body = {
        "model": model,
        "stream": False,
        "messages": [{"role": "user", "content": "ping"}],
    }

    t0 = time.time()
    try:
        r = s.post(url, headers=headers, json=body, timeout=args.timeout)
    except SSLError as e:
        hint = ""
        if isinstance(base_url, str) and base_url.startswith("https://") and ":3000" in base_url:
            hint = (
                " hint=ssl_error;_port_3000_may_be_plain_http. "
                "try_base_url=http://xgateway.xinference.cn:3000 (or use https on 443 if configured)"
            )
        print(
            f"FAIL request_exception base_url={base_url} api_key={_mask_key(api_key)} error={e}{hint}"
        )
        return 2
    except Exception as e:
        print(f"FAIL request_exception base_url={base_url} api_key={_mask_key(api_key)} error={e}")
        return 2

    latency_ms = int((time.time() - t0) * 1000)
    try:
        j = r.json()
    except Exception:
        j = None

    ok = r.status_code == 200 and isinstance(j, dict) and "error" not in j

    if ok:
        content = _extract_content(j)
        content_preview = (content or "")[:200]
        extra = ""
        if not content_preview:
            extra = " " + _extract_choice_debug(j)
        print(
            f"OK status_code={r.status_code} latency_ms={latency_ms} "
            f"base_url={base_url} model={model} api_key={_mask_key(api_key)} content_preview={content_preview!r}{extra}"
        )
        return 0

    err_type = None
    err_msg = None
    if isinstance(j, dict) and isinstance(j.get("error"), dict):
        err = j.get("error")
        err_type = err.get("type") if isinstance(err.get("type"), str) else None
        err_msg = err.get("message") if isinstance(err.get("message"), str) else None

    raw_preview = (r.text or "")[:400]
    headers_preview = ""
    try:
        headers_preview = str(dict(r.headers))
        if len(headers_preview) > 400:
            headers_preview = headers_preview[:400] + "..."
    except Exception:
        headers_preview = ""

    extra = ""
    if r.status_code == 502 and not raw_preview:
        extra = f" resp_headers={headers_preview!r}"

    print(
        "FAIL "
        f"status_code={r.status_code} latency_ms={latency_ms} base_url={base_url} model={model} "
        f"api_key={_mask_key(api_key)} error_type={err_type} error_message={err_msg} raw_preview={raw_preview!r}{extra}"
    )
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
