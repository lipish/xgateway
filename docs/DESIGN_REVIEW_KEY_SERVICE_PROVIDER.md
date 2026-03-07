# Design Review: API Key -> Service -> Provider

## Background

Current discussions indicate a need to balance two goals:

1. Keep user experience simple: "create API key and use immediately".
2. Keep backend architecture scalable: decouple external access from upstream providers.

This review proposes and validates a three-layer model that satisfies both goals.

## Proposed Architecture

### Layer 1: API Key (user-facing entry point)

- Primary object users interact with.
- Used for authentication, authorization, quota, and auditing.
- Product promise remains: creating a key enables immediate usage.

### Layer 2: Service (capability and policy boundary)

- Stable external capability contract (e.g., `chat-general`, `chat-low-latency`).
- Binds one or more providers with routing strategy.
- Owns policy decisions:
  - model allowlist / defaults
  - load-balancing strategy (weighted, priority, fallback)
  - rate limit / concurrency / queue controls
  - timeout and reliability profile

### Layer 3: Provider (upstream resources)

- Operational infrastructure object (OpenAI, Anthropic, MiniMax, Moonshot, etc.).
- Contains upstream endpoint + credentials + health state.
- May change frequently without changing external client integration.

## Why This Is Better Than Key -> Provider

1. **Decoupling**: clients and keys stay stable while providers evolve.
2. **Reliability**: service-level fallback and failover can happen transparently.
3. **Governance**: policy and quotas are enforced consistently at service boundary.
4. **Operational agility**: provider replacement, regional shifts, and cost routing become internal changes.

## UX Strategy: "Create Key and Use"

To preserve user mental model:

- When user creates a key, system auto-binds it to a default service.
- Default path requires no extra configuration.
- Advanced users can later edit key-to-service scopes and limits.

Result:
- Beginner experience stays one-step.
- Platform retains robust internal architecture.

## Recommended Data Model (Conceptual)

- `providers`: upstream definitions and health metadata.
- `services`: external capability definitions and routing policies.
- `service_providers`: many-to-many mapping with weight/priority/enabled flags.
- `api_keys`: key metadata, owner, status, expiry.
- `api_key_services`: many-to-many authorization mapping (optionally per-service overrides).

## Request Flow (Target)

1. Authenticate key.
2. Resolve target service (explicit or key default).
3. Authorize key against service scope.
4. Apply key/service limits and policy checks.
5. Select provider(s) per service routing strategy and health state.
6. Execute request and fallback within service policy.
7. Emit observability and billing dimensions: `key + service + provider`.

## Guardrails

- Do not allow direct key-to-provider bypass in normal data plane flow.
- Keep service as the mandatory policy boundary.
- Validate requested model against service-level model policy before provider routing.
- Keep degraded providers available only if policy allows (graceful degradation).

## Rollout Plan

1. **Compatibility phase**: key auto-bound to one default service (equivalent behavior to today for most users).
2. **Policy phase**: enable multi-provider service routing and fallback controls.
3. **Advanced phase**: expose optional service scoping and per-service quotas in admin UI.
4. **Observability phase**: dashboards and alerts keyed by service as primary operational dimension.

## Risks and Mitigations

- **Risk: Increased conceptual complexity**
  - Mitigation: hide service details behind default mode; surface advanced options progressively.
- **Risk: Misconfiguration of service/provider mappings**
  - Mitigation: validate mappings at save time + preflight checks in admin UI.
- **Risk: Policy inconsistency during migration**
  - Mitigation: enforce a single request path where key authorization always resolves service first.

## Final Recommendation

Adopt **API Key -> Service -> Provider** as the canonical model, while preserving user-facing simplicity through default service auto-binding on key creation. This provides immediate usability, clean mental model, and long-term scalability for routing, reliability, governance, and cost optimization.

