# Provider E2E Debug Report (2026-03-05)

## Scope
- Test script: `examples/test_providers.rs`
- Target chain: `.env -> llm_providers URL resolve -> /api/instances -> /api/api-keys -> /v1/chat/completions`
- Focus providers:
  - `zhipu`
  - `moonshot`
  - `minimax`
  - `anthropic`

## Test Environment
- Gateway URL: `http://127.0.0.1:3001` (configurable via `XGATEWAY_URL`)
- Database: `postgresql://localhost/xgateway`
- Gateway startup (debug mode):

```bash
env -u http_proxy -u https_proxy -u HTTP_PROXY -u HTTPS_PROXY \
  NO_PROXY='*' \
  RUST_LOG='xgateway::upstream=debug,xgateway=info' \
  DATABASE_URL='postgresql://localhost/xgateway' \
  cargo run --bin xgateway
```

- E2E execution:

```bash
cargo run --example test_providers
```

## Summary (Latest Run)
- Provider instances created: `6/6`
- API keys created: `6/6`
- Chat pass: `2/6`
  - PASS: `deepseek`, `openai-proxy`
  - FAIL: `zhipu`, `moonshot`, `minimax`, `anthropic-proxy`

## Detailed Findings

### 1) Zhipu (HTTP 502)
- Gateway resolved URL:
  - `https://api.z.ai/api/paas/v4`
- Gateway error:
  - `Connection error: POST connection failed`
- Health check error:
  - `... https://api.z.ai/api/paas/v4/models ... connection closed via error`
- Direct probe (`curl --noproxy "*"`) result:
  - TLS handshake fails: `LibreSSL SSL_connect: SSL_ERROR_SYSCALL`

Conclusion:
- Not a route/payload mismatch.
- Strongly indicates network/TLS reachability issue to `api.z.ai` in current host/network.

### 2) Moonshot (HTTP 400, HTML cloudflare)
- Gateway resolved URL:
  - `https://api.moonshot.ai/v1`
- llm-connector final URL:
  - `https://api.moonshot.ai/v1/chat/completions`
- llm-connector payload:

```json
{"model":"kimi-k2.5","messages":[{"content":"Say hello in exactly 5 words.","role":"user"}],"stream":false}
```

- Gateway receives upstream response:
  - `400 Bad Request` with HTML body from cloudflare.
- Direct probe with the same URL/model/payload via curl:
  - `HTTP 200`.

Conclusion:
- URL and model are valid.
- Failure is likely in HTTP client behavior/path (reqwest/connector request characteristics), not config URL itself.

### 3) MiniMax (HTTP 400, HTML alb)
- Gateway resolved URL:
  - `https://api.minimax.io/v1`
- llm-connector final URL:
  - `https://api.minimax.io/v1/chat/completions`
- llm-connector payload:

```json
{"model":"MiniMax-Text-01","messages":[{"content":"Say hello in exactly 5 words.","role":"user"}],"stream":false}
```

- Gateway receives upstream response:
  - `400 Bad Request` with HTML body from alb.
- Direct probe with the same URL/model/payload via curl:
  - `HTTP 200`.

Conclusion:
- URL/model/payload are valid.
- Same pattern as Moonshot: likely transport/client behavior difference, not URL misconfiguration.

### 4) Anthropic Proxy (HTTP 400, parse error)
- Gateway resolved URL:
  - `http://123.129.219.111:3000/v1`
- llm-connector final URL:
  - `http://123.129.219.111:3000/v1/messages`
- llm-connector payload:

```json
{"model":"claude-opus-4-5-20251101-thinking","max_tokens":1024,"messages":[{"role":"user","content":[{"text":"Say hello in exactly 5 words.","type":"text"}]}],"stream":false}
```

- Gateway error:
  - `Parse error: Failed to parse Anthropic response: missing field text`
- Direct probe to relay `/v1/messages` shows content blocks include:
  - `{"type":"thinking", ...}`
  - `{"type":"text", "text":"..."}`

Conclusion:
- Not URL issue.
- Parser compatibility issue for thinking content blocks (current parse path expects strict text block shape).

## Added Diagnostic Logging (for this investigation)
- `examples/test_providers.rs`
  - Print full upstream error response body (not truncated).
- `src/adapter/generic.rs`
  - Log `provider_type`, resolved URL, request model, outbound payload, and mapped error type.
- `llm-connector/src/core/traits.rs`
  - Log final connector URL + serialized request payload + raw non-2xx response body.

## Optimization Plan

### P0 (High Priority)
1. Anthropic parser compatibility
- Accept mixed content blocks (`thinking`, `text`) and extract visible text safely.
- Keep raw block array in debug logs for future schema changes.

2. Provider-targeted connector diagnostics switch
- Add feature/env switch for verbose transport diagnostics (`XG_DEBUG_UPSTREAM=1`).
- Include response headers and selected TLS/HTTP metadata for 4xx/5xx.

### P1 (Likely fix for Moonshot/MiniMax)
1. Compare reqwest vs curl request signatures
- Capture and compare:
  - `Accept`, `Accept-Encoding`, `Connection`, `User-Agent`, HTTP version.
- Add provider-specific overrides if needed in llm-connector.

2. Add provider-specific compatibility mode
- For `moonshot` and `minimax`, support optional tuned profile:
  - conservative headers
  - optional HTTP/1.1 preference
  - optional compression settings

### P2 (Resilience)
1. Zhipu network fallback controls
- Support configurable fallback endpoint/region if current endpoint is unreachable.
- Add startup connectivity probe result to admin diagnostics.

2. E2E cleanup and reproducibility
- Add optional teardown for created providers/api keys in `test_providers`.
- Add deterministic test run id + exportable report JSON.

## Proposed Next Execution Steps
1. Implement Anthropic thinking-block parser fix and re-run E2E.
2. Add temporary transport override profile for Moonshot/MiniMax, run A/B.
3. If Moonshot/MiniMax recover, upstream-guard this behavior by provider type.
4. Keep Zhipu as environment/network prerequisite and expose clearer health diagnostics.

## Quick Reproduce Commands
```bash
# 1) Start gateway (no proxy)
env -u http_proxy -u https_proxy -u HTTP_PROXY -u HTTPS_PROXY \
  NO_PROXY='*' \
  RUST_LOG='xgateway::upstream=debug,xgateway=info' \
  DATABASE_URL='postgresql://localhost/xgateway' \
  cargo run --bin xgateway

# 2) Run e2e provider script
cargo run --example test_providers
```
