# Zed IDE Integration

Zed IDE is fully compatible with llm-link via the Ollama protocol, supporting Function Calling and all major LLM providers.

## 🚀 Quick Start

### 1. Build & Start llm-link

```bash
# Build release binary
cargo build --release

# Start with your preferred provider (formatted for readability)
./target/release/llm-link \
  --app zed \
  --provider zhipu \
  --model glm-4.6 \
  --llm-api-key "$ZHIPU_API_KEY"
```

Common examples for other providers:

```bash
# OpenAI
./target/release/llm-link --app zed --provider openai --model gpt-4o

# Anthropic
./target/release/llm-link --app zed --provider anthropic --model claude-3-5-sonnet-20241022

# Volcengine (Doubao)
./target/release/llm-link --app zed --provider volcengine --model doubao-pro-32k
```

### 2. Configure Zed

Edit your Zed settings file (`~/.config/zed/settings.json`):

```json
{
  "language_models": {
    "ollama": {
      "api_url": "http://localhost:11434"
    }
  }
}
```

### 3. Use in Zed

1. Open the AI Assistant panel (Cmd+R or via menu).
2. Click the model selector dropdown.
3. You should see the model you started llm-link with (e.g., `glm-4.6`).
4. Select it and start chatting!

---

## 🔄 Switching Providers

Zed automatically detects available models from the `http://localhost:11434` endpoint. To switch providers:

1. **Stop** the currently running `llm-link` process (Ctrl+C).
2. **Start** `llm-link` with a different `--provider` and `--model`.
   
   ```bash
   # Switch to Aliyun Qwen
   ./target/release/llm-link --app zed --provider aliyun --model qwen-max
   ```
   
3. **Refresh Zed**: Usually, simply clicking the model selector again will show the new model. If not, restart Zed.

**Note**: You don't need to change `settings.json` as long as llm-link listens on port 11434.

---

## 🛠️ Features & Tools

### Function Calling (Tools)
llm-link supports Zed's tool use (Function Calling) for:
- Code completion & refactoring
- Repository search
- File operations

**Supported Models**:
- **Zhipu**: `glm-4.6`, `glm-4.5`
- **OpenAI**: `gpt-4o`, `gpt-4`
- **Volcengine**: `doubao-seed-code-preview-latest`
- **Anthropic**: `claude-3-5-sonnet`

### Streaming
Real-time streaming response is supported for all providers.

---

## ❓ Troubleshooting

### "Tools Unsupported" Message
If Zed shows "tools unsupported" for a model that should support it:
1. Ensure you are using the latest version of `llm-link`.
2. Check `http://localhost:11434/api/show` response:
   ```bash
   curl -X POST http://localhost:11434/api/show -d '{"name": "glm-4.6"}'
   ```
   It must contain `"capabilities": ["tools"]`. If not, update llm-link.

### Model List Empty
1. Verify llm-link is running: `curl http://localhost:11434/api/tags`
2. Check Zed settings (`api_url` must match).
3. Restart Zed.

### Provider Not Changing
If you switched provider in terminal but Zed still shows the old one:
1. Close the AI Assistant panel and reopen it.
2. Restart Zed completely.
