# LLM Link Architecture & Multi-Provider Expansion

## Overview

LLM Link is designed as a multi-provider gateway that unifies various LLM APIs (OpenAI, Anthropic, Zhipu, etc.) into standard interfaces like OpenAI and Ollama. This architecture enables clients like Zed, VS Code, and Aider to work with *any* provider transparently.

## Core Architecture Design

LLM Link adopts a tiered architecture to decouple protocol emulation from provider-specific drivers, ensuring high flexibility and maintainability.

### High-Level Design

```mermaid
graph TD
    Client[Clients (Zed, Aider, CLI)] -->|OpenAI/Ollama Protocol| Emulators
    
    subgraph "LLM Link Core Architecture"
        subgraph "1. Protocol Emulator Layer (Emulators)"
            Emulators[Protocol Dispatcher]
            Emulators --> E1[OpenAI Emulator]
            Emulators --> E2[Ollama Emulator]
            Emulators --> E3[Anthropic Emulator]
        end
        
        subgraph "2. Unified Endpoint Layer (Endpoints)"
            E1 & E2 & E3 --> ProxyState[Unified State Management / ProxyState]
            ProxyState --> Basic[Basic Services: Health/Info]
        end

        subgraph "3. Core Orchestration Layer (Engine)"
            ProxyState --> Engine[Client Orchestrator]
            Engine --> Mapping[Model Mapping & Unified Response]
            Engine --> Instance[Instance ID Management]
        end

        subgraph "4. Adapter & Driver Layer (Adapter/Drivers)"
            Engine --> Generic[Generic Sender]
            Generic --> Drivers{Driver Registry}
            Drivers --> D1[OpenAI Compatible]
            Drivers --> D2[Specialized: Minimax]
            Drivers --> D3[Native: Aliyun/Tencent]
        end
    end
    
    D1 & D2 & D3 -->|HTTPS| Cloud[Cloud LLM Providers]
```

### 1. Protocol Emulator Layer
**Location**: `src/endpoints/emulators/`

The outermost layer responsible for "camouflaging" as standard protocols.
*   **OpenAI Emulator (`openai.rs`)**: Provides standard `/v1/chat/completions` and `/v1/models` endpoints.
*   **Ollama Emulator (`ollama.rs`)**: Provides `/api/chat`, `/api/tags`, and specialized `/api/show` endpoints.
*   **Anthropic Emulator (`anthropic.rs`)**: Supports the Anthropic Messages protocol.

**Core Responsibility**: Handles input/output format conversion, manages differences between streaming (SSE/NDJSON) and non-streaming responses, and hides backend provider specificities.

### 2. Unified Endpoint Layer
**Location**: `src/endpoints/`

Serves as the boundary for API entry and core logic.
*   **State Management (`types.rs`)**: Defines the unified `ProxyState` containing database pools, service handles, and system settings. It acts as the "Single Source of Truth."
*   **Basic Services (`basic.rs`)**: Provides non-business interfaces like health checks and system information queries.

### 3. Core Orchestration Layer
**Location**: `src/engine/`

The execution hub (formerly `normalizer`).
*   **Client Orchestrator (`mod.rs`)**: Dynamically creates and manages unified clients for different providers based on request parameters.
*   **Model Mapping (`types.rs`)**: Defines system-wide common `Model` and `Response` objects, eliminating terminology differences between providers.
*   **Instance Management (`instance.rs`)**: Manages unique instance IDs to ensure traceability in multi-node deployments.

### 4. Adapter & Driver Layer
**Location**: `src/adapter/`

Handles the final mile of communication with specific provider APIs.
*   **Abstract Driver (`driver.rs`)**: Defines `DriverType` and `AuthStrategy`, supporting Ak/Sk, API Key, and other authentication methods.
*   **Specialized Drivers (`drivers/`)**: Provides customized client implementations for providers requiring special handling (e.g., MiniMax's thinking tag cleanup).
*   **Generic Sender (`generic.rs`)**: Automatically selects the appropriate connector via the driver registry to execute actual HTTP communication.

---

### Data Flow Example (e.g., Ollama Request)

1.  **Ingress**: Client sends a request to `/api/chat`.
2.  **Emulation**: The `ollama` emulator intercepts the request and extracts parameters.
3.  **Orchestration**: The emulator calls the `engine` to retrieve the corresponding provider client.
4.  **Adaptation**: The `adapter` selects the appropriate driver based on provider type (e.g., `MinimaxClient`).
5.  **Conversion**: The `convert` module transforms internal objects into the provider's raw JSON format.
6.  **Execution**: The driver layer sends the HTTPS request and handles the response (including real-time streaming data conversion).
7.  **Egress**: The emulator wraps the final result into the `Ollama` format and returns it to the client.

### Module Structure

```
src/
├── adapter/        # Provider Adapters & Drivers
│   ├── drivers/    # Specialized Drivers (e.g., Minimax)
│   ├── driver.rs   # Driver Abstraction & Config
│   └── generic.rs  # Unified Request Dispatching
├── endpoints/      # API Endpoints & Emulators
│   ├── emulators/  # OpenAI/Ollama/Anthropic Emulation
│   ├── basic.rs    # Health Checks & System Info
│   └── types.rs    # Unified ProxyState
├── engine/         # Core Execution Engine
│   ├── mod.rs      # Client Orchestration
│   ├── instance.rs # Instance ID Management
│   └── types.rs    # Common Model & Response Definitions
├── db/             # Database Access Layer
├── pool/           # Provider Resource Pool Management
└── router/         # Routing & Dispatch Logic
```

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

- **Cloud Provider Support**: AWS Bedrock, GCP Vertex AI, Azure OpenAI via driver abstraction.
- **Smart Routing**: Route requests based on cost, latency, or model capability.
- **Cost Tracking**: Real-time token usage and cost calculation per tenant/provider.
- **Web UI**: Admin dashboard for managing providers and viewing analytics (SvelteKit + Rust).