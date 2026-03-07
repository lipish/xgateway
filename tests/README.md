# XGateway Tests

This directory will contain tests for XGateway.

## 🚧 Status

Tests are being redesigned and reimplemented. Old test scripts have been removed.

## 📋 Planned Tests

### Unit Tests
- Configuration loading
- Provider override logic
- Client adapter detection
- Format conversion utilities

### Integration Tests
- End-to-end API tests
- Provider integration tests
- Application mode tests

### Test Framework

Tests will be implemented using:
- Rust's built-in test framework (`cargo test`)
- Integration tests in `tests/` directory
- Unit tests in source files

## 🚀 Running Tests

```bash
# Run all tests
cargo test

# Run specific test
cargo test test_name

# Run with output
cargo test -- --nocapture

# Run integration tests only
cargo test --test integration_test_name
```

## New Test Samples

### 1) API key binding multiple provider instances (E2E)

This script validates that one instance-scoped API key can access multiple bound provider IDs,
and rejects a non-bound provider ID.

```bash
API_KEY=sk-link-xxx \
ALLOWED_PROVIDER_IDS=1,2 \
DENIED_PROVIDER_ID=999999 \
BASE_URL=http://127.0.0.1:3000 \
./tests/test_api_key_multi_instance_models.sh
```

### 2) API key priority + candidate routing (Rust automated tests)

This script runs deterministic tests for:
- candidate set selection under instance-scoped key binding,
- priority retry behavior (exclude failed provider),
- round-robin distribution within candidate set.

```bash
./tests/test_api_key_priority_and_lb.sh
```

## Load Balancing Test Plan (Practical)

Load balancing is hard to verify end-to-end because real upstream latency, quotas, and failures are noisy.
Use a layered approach:

1. Deterministic unit tests (already added)
- Verify exact selection behavior with controlled priorities and candidate sets.
- Verify retry with `exclude` picks the next best provider.

2. Controlled integration tests (recommended next)
- Use 2-3 local mock upstream servers with fixed response delays and fixed status codes.
- Route providers to those mocks and run concurrent requests.
- Assert observed distribution ratio and fallback path from request logs.

3. Real-provider smoke tests
- Keep only as confidence checks (not strict assertions), because network and provider behavior are unstable.
- Track metrics trend: success rate, p95 latency, failover count.

## 🔐 E2E（真实 API Key）预留用例

以下步骤用于后续联调，默认不在 CI 中执行。建议使用最小权限、短时有效的测试 key，并通过环境变量注入。

### 1) 启动本地网关（双库分离）

```bash
export DATABASE_URL="postgresql://xinference@localhost:5432/xgateway_new"
export XTRACE_DATABASE_URL="postgresql://xinference@localhost:5432/xtrace_new"
export XTRACE_BIND_ADDR="127.0.0.1:18745"

cargo run --bin xgateway -- --host 127.0.0.1 --port 3105
```

### 2) 流式链路验证（SSE）

```bash
curl -N "http://127.0.0.1:3105/v1/chat/completions" \
	-H "Content-Type: application/json" \
	-H "Authorization: Bearer ${XG_TEST_GATEWAY_KEY}" \
	-d '{
		"service_id": "demo-service",
		"model": "gpt-4o-mini",
		"stream": true,
		"messages": [{"role": "user", "content": "请返回一句话"}]
	}'
```

预期：持续收到 `data: {...}` 分片，最后收到 `[DONE]`。

### 3) 错误映射验证（401 / 429）

```bash
# 401: 使用错误 key
curl -i "http://127.0.0.1:3105/v1/chat/completions" \
	-H "Content-Type: application/json" \
	-H "Authorization: Bearer BAD_KEY" \
	-d '{"service_id":"demo-service","model":"gpt-4o-mini","messages":[{"role":"user","content":"hi"}]}'

# 429: 使用限流场景（按你的测试 key 配额触发）
curl -i "http://127.0.0.1:3105/v1/chat/completions" \
	-H "Content-Type: application/json" \
	-H "Authorization: Bearer ${XG_TEST_GATEWAY_KEY}" \
	-d '{"service_id":"demo-service","model":"gpt-4o-mini","messages":[{"role":"user","content":"压力测试"}]}'
```

### 4) 流式 usage 落库检查（P1 回归）

```bash
psql "$DATABASE_URL" -c "
	SELECT id, provider_name, status, tokens_used, created_at
	FROM request_logs
	WHERE request_type='chat'
	ORDER BY id DESC
	LIMIT 10;
"
```

预期：流式成功请求在 `tokens_used` 字段可见非零值（取决于上游是否返回 usage）。

## 📚 Documentation

For more information, see:
- [Main README](../README.md)
- [Quick Start Guide](../docs/QUICK_START.md)
- [Changelog](../CHANGELOG.md)

