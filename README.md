# XGateway

[![Crates.io](https://img.shields.io/crates/v/xgateway.svg)](https://crates.io/crates/xgateway)
[![Documentation](https://docs.rs/xgateway/badge.svg)](https://docs.rs/xgateway)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Downloads](https://img.shields.io/crates/d/xgateway.svg)](https://crates.io/crates/xgateway)

🚀 **LLM gateway with unified API, service routing, and admin control plane**

XGateway (XGateway) provides a unified OpenAI-compatible API, service-based routing, and an admin UI for managing providers, services, API keys, and observability.

## ✨ Key Features

- **🔌 Unified API**: OpenAI-compatible `/v1/chat/completions` and `/v1/models`
- **🧭 Service Routing**: `service_id` based routing with fallback chains
- **⚖️ Load Balancing**: round-robin, least connections, random, priority, latency, lowest price, quota-aware
- **🚦 Service Limits**: QPS, concurrency, queue size, and wait timeout per service
- **✅ Health Checks**: provider health tracking with automatic failover
- **🔐 Access Control**: API keys scoped to services with org/project boundaries
- **📊 Observability**: request logs, metrics, and admin dashboards
- **🧩 Admin UI**: manage providers, services, API keys, users, and conversations

## 📚 Documentation

- **[XGateway 产品说明（中文）](docs/xgateway.md)**
- **[用户指南（中文）](docs/USER_GUIDE.md)**
- **[开发与运维](docs/DEVELOPMENT.md)**

## 🚀 Quick Start

### Installation

```bash
# Install from crates.io (Recommended)
cargo install xgateway

# Or via Homebrew (macOS)
brew tap lipish/xgateway && brew install xgateway

# Or via pip (macOS / Linux)
pip install pyxgateway
```

📚 **[Documentation Index →](docs/README.md)**

### Basic Usage

```bash
# For Codex CLI
./xgateway --app codex-cli --api-key "your-auth-token"

# For Zed
./xgateway --app zed

# For Aider (using open-source models)
./xgateway --app aider --provider zhipu --model glm-4.6 --api-key "your-zhipu-key"

# For OpenHands
./xgateway --app openhands --provider anthropic --model claude-3-5-sonnet --api-key "your-anthropic-key"
```

📚 **[Detailed Configuration Guide →](https://lipish.github.io/xgateway/docs)**

## 📋 CLI Help

```bash
# List all supported applications
./xgateway --list-apps

# Get detailed setup guide for specific application
./xgateway --app-info aider

# List available models for a provider
./xgateway --provider zhipu --list-models
```

## 🏗️ Architecture

See **[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)** for architecture, scheduling, and operations.

## 🛠️ Development

### Running the Admin Panel

The project includes a React-based admin panel for managing providers and testing the service.

#### Production Mode (Recommended)

The backend serves the frontend static files directly, so you only need to start one service:

```bash
# Build the frontend (first time or after frontend changes)
cd admin && npm install && npx vite build && cd ..

# Local demo (PostgreSQL)
export DATABASE_URL="postgresql://xinference@localhost:5432/xgateway"

# Start the unified service (default port 3000)
cargo run
```

The admin panel will be available at `http://localhost:3000/`

This approach provides:
- **Single port**: Both API and frontend on the same port
- **No port synchronization issues**: Frontend automatically uses the same host
- **Simple deployment**: Just run `cargo run`

#### Development Mode

For frontend development with hot-reload:

```bash
# Terminal 1: Start the backend service
cargo run

# Terminal 2: Start the frontend dev server
cd admin
npm install
npm run dev
```

The frontend dev server will be available at `http://localhost:5173/` with hot-reload enabled.
Note: The dev proxy is configured to only match `/api/` and `/v1/` (trailing slash required) to avoid intercepting frontend routes like `/api-keys`.

📚 **[Development Guide →](https://lipish.github.io/xgateway/docs/development)**

## 🔧 Advanced Usage

### Custom Configuration

```bash
# Custom port and host
./xgateway --app aider --provider zhipu --model glm-4.6 --port 8095 --host 0.0.0.0

# With authentication
./xgateway --app aider --provider zhipu --model glm-4.6 --auth-key "your-secret-token"
```

### Environment Variables

```bash
# Provider API keys
export ZHIPU_API_KEY="your-zhipu-api-key"
export OPENAI_API_KEY="sk-xxx"
export ANTHROPIC_API_KEY="sk-ant-xxx"

# XGateway authentication
export XGATEWAY_API_KEY="your-auth-token"

# XTrace observability (optional)
export XTRACE_ENABLED="true"
export XTRACE_BASE_URL="http://127.0.0.1:8080"
export XTRACE_AUTH_MODE="bearer" # bearer | basic
export XTRACE_API_BEARER_TOKEN="xtrace-token"
# Basic auth (Langfuse compatible)
export LANGFUSE_PUBLIC_KEY="public-key"
export LANGFUSE_SECRET_KEY="secret-key"
# Optional metadata
export XTRACE_PROJECT_ID="project-id"
export XTRACE_ENVIRONMENT="prod"
export XTRACE_TRACE_NAME="xgateway.chat"
# If XTrace is unavailable, xgateway continues using its DB logs without failing requests.
```

📚 **[Advanced Configuration →](https://lipish.github.io/xgateway/docs)**

## 🧪 Testing

```bash
# Test health endpoint
curl http://localhost:8090/health

# Test OpenAI API
curl -X POST http://localhost:8090/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{"model": "glm-4.6", "messages": [{"role": "user", "content": "Hello!"}]}'
```

📚 **[Testing & Troubleshooting →](https://lipish.github.io/xgateway/docs)**

## 📚 Full Documentation

🌐 **[Complete Documentation Site →](https://lipish.github.io/xgateway/)**

- **[Getting Started](https://lipish.github.io/xgateway/docs/quick-start)** - Installation and basic setup
- **[Application Guides](https://lipish.github.io/xgateway/docs/apps)** - Detailed integration for each tool
- **[Configuration](https://lipish.github.io/xgateway/docs)** - Advanced configuration options
- **[Architecture](https://lipish.github.io/xgateway/docs/architecture)** - System design and internals
- **[API Reference](https://lipish.github.io/xgateway/api)** - REST API documentation

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- [Documentation Site](https://lipish.github.io/xgateway/)
- [Crates.io](https://crates.io/crates/xgateway)
- [GitHub Repository](https://github.com/lipish/xgateway)
- [API Reference](https://lipish.github.io/xgateway/api)
