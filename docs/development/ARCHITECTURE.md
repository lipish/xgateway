# LLM Link Architecture & Multi-Provider Expansion

## Overview

LLM Link is designed as a multi-provider gateway that unifies various LLM APIs (OpenAI, Anthropic, Zhipu, etc.) into standard interfaces like OpenAI and Ollama. This architecture enables clients like Zed, VS Code, and Aider to work with *any* provider transparently.

## Core Architecture

### High-Level Design

```mermaid
graph TD
    Client[Client Clients (Zed, Aider, CLI)] -->|Ollama/OpenAI API| Router
    subgraph "LLM Link Service"
        Router[Request Router]
        Auth[Auth & Rate Limiting]
        ProviderMgr[Provider Manager]
        
        Router --> Auth
        Auth --> ProviderMgr
        
        ProviderMgr -->|Adapter| P1[OpenAI Adapter]
        ProviderMgr -->|Adapter| P2[Anthropic Adapter]
        ProviderMgr -->|Adapter| P3[Zhipu Adapter]
        ProviderMgr -->|Adapter| P4[Local Adapter]
    end
    
    P1 -->|HTTP| OpenAI[OpenAI API]
    P2 -->|HTTP| Anthropic[Anthropic API]
    P3 -->|HTTP| Zhipu[Zhipu GLM]
    P4 -->|HTTP| Ollama[Local Ollama]
```

### Key Components

1.  **Router Service**: Handles incoming HTTP requests, determines the target provider based on headers or configuration.
2.  **Provider Adapters**: Standardizes request/response bodies between the client's expected format (e.g., Ollama) and the upstream provider (e.g., Anthropic).
3.  **Thread Pool Architecture**: Uses Rust's standard async runtime (Tokio) for high concurrency with low memory footprint (~50MB).

## Multi-Provider Strategy

The system is designed to support multiple active providers simultaneously using a **Single Process, Multi-Provider** model.

### Provider Management
- **Configuration**: Providers are configured via YAML/JSON or database.
- **Hot Reloading**: Supports updating provider configs without restarting the service.
- **Failover**: (Planned) Circuit breakers and automatic failover to backup providers.

### Database Schema (SQLite/PostgreSQL)

Core tables for provider persistence:

```sql
CREATE TABLE providers (
    id INTEGER PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    type VARCHAR(20) NOT NULL,
    config JSON NOT NULL, -- Encrypted creds
    enabled BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0
);

CREATE TABLE metrics (
    provider_id INTEGER,
    request_count INTEGER,
    success_count INTEGER,
    avg_latency FLOAT
);
```

## Operational Considerations

### Security
- **API Keys**: Stored encrypted in the database or passed via environment variables (`*_API_KEY`).
- **Isolation**: Tenant-level isolation for multi-user deployments.

### Observability
- **Metrics**: Prometheus-compatible metrics for request counts, latency, and error rates.
- **Audit Logs**: Full request/response logging (configurable) for debugging.

### Deployment
- **Docker**: Lightweight container image based on `debian:bookworm-slim`.
- **K8s**: Support for deployment strategies like Canary rollouts.

## Future Roadmap

- **Smart Routing**: Route requests based on cost, latency, or model capability.
- **Cost Tracking**: Real-time token usage and cost calculation per tenant/provider.
- **Web UI**: Admin dashboard for managing providers and viewing analytics (SvelteKit + Rust).
