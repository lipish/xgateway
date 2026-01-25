# LLM Link

[![Crates.io](https://img.shields.io/crates/v/llm-link.svg)](https://crates.io/crates/llm-link)
[![Documentation](https://docs.rs/llm-link/badge.svg)](https://docs.rs/llm-link)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Downloads](https://img.shields.io/crates/d/llm-link.svg)](https://crates.io/crates/llm-link)

🚀 **LLM gateway with unified API, service routing, and admin control plane**

LLM Link (XGateway) provides a unified OpenAI-compatible API, service-based routing, and an admin UI for managing providers, services, API keys, and observability.

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
cargo install llm-link

# Or via Homebrew (macOS)
brew tap lipish/llm-link && brew install llm-link

# Or via pip (macOS / Linux)
pip install pyllmlink
```

📚 **[Documentation Index →](docs/README.md)**

### Basic Usage

```bash
# For Codex CLI
./llm-link --app codex-cli --api-key "your-auth-token"

# For Zed
./llm-link --app zed

# For Aider (using open-source models)
./llm-link --app aider --provider zhipu --model glm-4.6 --api-key "your-zhipu-key"

# For OpenHands
./llm-link --app openhands --provider anthropic --model claude-3-5-sonnet --api-key "your-anthropic-key"
```

📚 **[Detailed Configuration Guide →](https://lipish.github.io/llm-link/docs)**

## 📋 CLI Help

```bash
# List all supported applications
./llm-link --list-apps

# Get detailed setup guide for specific application
./llm-link --app-info aider

# List available models for a provider
./llm-link --provider zhipu --list-models
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
export DATABASE_URL="postgresql://xinference@localhost:5432/llm_link"

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

📚 **[Development Guide →](https://lipish.github.io/llm-link/docs/development)**

## 🔧 Advanced Usage

### Custom Configuration

```bash
# Custom port and host
./llm-link --app aider --provider zhipu --model glm-4.6 --port 8095 --host 0.0.0.0

# With authentication
./llm-link --app aider --provider zhipu --model glm-4.6 --auth-key "your-secret-token"
```

### Environment Variables

```bash
# Provider API keys
export ZHIPU_API_KEY="your-zhipu-api-key"
export OPENAI_API_KEY="sk-xxx"
export ANTHROPIC_API_KEY="sk-ant-xxx"

# LLM Link authentication
export LLM_LINK_API_KEY="your-auth-token"
```

📚 **[Advanced Configuration →](https://lipish.github.io/llm-link/docs)**

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

📚 **[Testing & Troubleshooting →](https://lipish.github.io/llm-link/docs)**

## 📚 Full Documentation

🌐 **[Complete Documentation Site →](https://lipish.github.io/llm-link/)**

- **[Getting Started](https://lipish.github.io/llm-link/docs/quick-start)** - Installation and basic setup
- **[Application Guides](https://lipish.github.io/llm-link/docs/apps)** - Detailed integration for each tool
- **[Configuration](https://lipish.github.io/llm-link/docs)** - Advanced configuration options
- **[Architecture](https://lipish.github.io/llm-link/docs/architecture)** - System design and internals
- **[API Reference](https://lipish.github.io/llm-link/api)** - REST API documentation

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- [Documentation Site](https://lipish.github.io/llm-link/)
- [Crates.io](https://crates.io/crates/llm-link)
- [GitHub Repository](https://github.com/lipish/llm-link)
- [API Reference](https://lipish.github.io/llm-link/api)
