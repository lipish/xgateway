# Copilot instructions for XGateway

## Build, test, lint
- Rust backend build: `cargo build`
- Rust backend tests: `cargo test`
- Run a single Rust test: `cargo test test_name`
- Run a single integration test: `cargo test --test integration_test_name`
- Rust lint/format: `cargo clippy` and `cargo fmt`
- Admin UI build: `cd admin && npm install && npm run build`
- Admin UI dev server: `cd admin && npm run dev`
- Admin UI lint: `cd admin && npm run lint`

## High-level architecture
- XGateway exposes a data plane compatible with OpenAI (`POST /v1/chat/completions`) and a management plane under `/api/*`.
- Requests are routed by `service_id` to provider pools; services define routing strategy and fallback chains across providers.
- Load-balancing strategies live in `src/pool/load_balancer.rs` and are selected via each service’s `strategy` field.
- Service and API-key limits (QPS, concurrency, queueing) are enforced by `PoolManager`/`RateLimiter` before routing.
- Key code areas: `src/router/*` (route wiring), `src/endpoints/*` (data plane), `src/admin/*` (management plane), `src/pool/*` (pool/health/limits), `src/adapter/*` (provider adapters), `src/db/*` (persistence).

## Key conventions
- API keys authorize access to services (many-to-many); service-to-provider is one-to-many and is the main routing pool.
- Fallback behavior first tries other providers within a service, then uses a service’s fallback chain.
- Docs are kept flat in `docs/` (max ~5 files); product-facing copy lives in `docs/xgateway.md`.
