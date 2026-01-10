import argparse
import json
import os
import sys
import time

import requests


def _to_text(v):
    if isinstance(v, str):
        return v
    if isinstance(v, list):
        parts = []
        for item in v:
            if isinstance(item, dict) and isinstance(item.get("text"), str):
                parts.append(item["text"])
            elif isinstance(item, str):
                parts.append(item)
        return "\n".join([p for p in parts if p.strip()])
    if isinstance(v, dict) and isinstance(v.get("text"), str):
        return v["text"]
    return json.dumps(v, ensure_ascii=False)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default=os.environ.get("LLM_LINK_BASE_URL", "http://127.0.0.1:3000"))
    parser.add_argument("--api-key", default=os.environ.get("LLM_LINK_API_KEY"))
    parser.add_argument("--provider-id", type=int, default=int(os.environ.get("LLM_LINK_PROVIDER_ID", "1")))
    parser.add_argument("--sleep", type=float, default=0.4)
    args = parser.parse_args()

    if not args.api_key:
        print("missing api key: set --api-key or env LLM_LINK_API_KEY", file=sys.stderr)
        return 2

    headers = {"Authorization": f"Bearer {args.api_key}", "Content-Type": "application/json"}

    messages1 = [{"role": "user", "content": "我们来做一个多轮对话：先用一句话解释 multi-agent system。"}]
    r1 = requests.post(
        f"{args.base_url}/v1/chat/completions",
        json={"provider_id": args.provider_id, "messages": messages1, "stream": False},
        headers=headers,
        timeout=60,
    )
    if r1.status_code != 200:
        print(f"turn1_http {r1.status_code} body={r1.text[:500]}", file=sys.stderr)
        return 1

    j1 = r1.json()
    a1 = _to_text(j1.get("choices", [{}])[0].get("message", {}).get("content", ""))
    if not a1.strip():
        print("turn1 assistant empty", file=sys.stderr)
        return 1

    messages2 = [
        {"role": "user", "content": "我们来做一个多轮对话：先用一句话解释 multi-agent system。"},
        {"role": "assistant", "content": a1},
        {"role": "user", "content": "再给一个具体应用场景例子（不超过2句话）。"},
    ]

    r2 = requests.post(
        f"{args.base_url}/v1/chat/completions",
        json={"provider_id": args.provider_id, "messages": messages2, "stream": False},
        headers=headers,
        timeout=60,
    )
    if r2.status_code != 200:
        print(f"turn2_http {r2.status_code} body={r2.text[:500]}", file=sys.stderr)
        return 1

    j2 = r2.json()
    a2 = _to_text(j2.get("choices", [{}])[0].get("message", {}).get("content", ""))
    if not a2.strip():
        print("turn2 assistant empty", file=sys.stderr)
        return 1

    time.sleep(args.sleep)

    rlogs = requests.get(
        f"{args.base_url}/api/logs",
        params={"limit": 10, "offset": 0},
        timeout=30,
    )
    if rlogs.status_code != 200:
        print(f"logs_http {rlogs.status_code} body={rlogs.text[:500]}", file=sys.stderr)
        return 1

    jlogs = rlogs.json()
    if not (isinstance(jlogs, dict) and jlogs.get("success") and isinstance(jlogs.get("data"), list)):
        print(f"invalid logs response: {jlogs}", file=sys.stderr)
        return 1

    items = [x for x in jlogs["data"] if isinstance(x, dict) and x.get("provider_id") == args.provider_id]
    if len(items) < 2:
        print(f"expected >=2 logs for provider_id={args.provider_id}, got {len(items)}", file=sys.stderr)
        return 1

    bad = [x for x in items[:2] if not (isinstance(x.get("response_content"), str) and x.get("response_content").strip())]
    if bad:
        print(f"response_content empty in logs: {bad}", file=sys.stderr)
        return 1

    print("ok")
    for x in items[:2]:
        preview = (x.get("response_content") or "")[:120]
        print(f"log_id={x.get('id')} provider_id={x.get('provider_id')} resp_len={len(x.get('response_content') or '')} resp_preview={preview}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
