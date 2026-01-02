# Supported Models & Providers

This document serves as the **Single Source of Truth** for supported LLM providers, their model marketplaces, and configuration details.

## 🔗 Quick Reference

| Provider | Marketplace / Docs | API Key Env Var | Migration File |
|----------|-------------------|-----------------|----------------|
| **OpenAI** | [Models](https://platform.openai.com/docs/models) | `OPENAI_API_KEY` | N/A (Config) |
| **Anthropic** | [Models](https://docs.anthropic.com/en/docs/about-claude/models) | `ANTHROPIC_API_KEY` | N/A (Config) |
| **Zhipu AI** | [Pricing & Models](https://docs.z.ai/guides/overview/pricing) | `ZHIPU_API_KEY` | `014_seed_zhipu.sql` |
| **Aliyun** | [Model Gallery](https://help.aliyun.com/zh/dashscope/developer-reference/model-square) | `ALIYUN_API_KEY` | `002_provider_types.sql` |
| **Volcengine** | [Model Square](https://www.volcengine.com/docs/82379/1330310) | `VOLCENGINE_API_KEY` | `008_seed_volcengine.sql` |
| **Tencent** | [Hunyuan Models](https://cloud.tencent.com/document/product/1729/104753) | `TENCENT_API_KEY` | `013_seed_tencent.sql` |
| **DeepSeek** | [Pricing](https://api-docs.deepseek.com/zh-cn/quick_start/pricing) | `DEEPSEEK_API_KEY` | `007_seed_deepseek.sql` |
| **Moonshot** | [Docs](https://platform.moonshot.cn/docs) | `MOONSHOT_API_KEY` | `010_seed_moonshot.sql` |
| **MiniMax** | [Models Intro](https://platform.minimax.io/docs/guides/models-intro) | `MINIMAX_API_KEY` | `012_seed_minimax.sql` |
| **LongCat** | [Docs](https://longcat.chat/platform/docs/zh/) | `LONGCAT_API_KEY` | `011_seed_longcat.sql` |
| **Ollama** | [Library](https://ollama.com/library) | N/A | N/A (Local) |

---

## 📋 Detailed Provider Information

### 1. OpenAI
- **Provider ID**: `openai`
- **Popular Models**: `gpt-4o`, `gpt-4-turbo`, `gpt-3.5-turbo`
- **Example**:
  ```bash
  export OPENAI_API_KEY="sk-xxx"
  ./llm-link --app zed --provider openai --model gpt-4o
  ```

### 2. Anthropic Claude
- **Provider ID**: `anthropic`
- **Popular Models**: `claude-3-5-sonnet-20241022`, `claude-3-opus-20240229`, `claude-3-haiku-20240307`
- **Example**:
  ```bash
  export ANTHROPIC_API_KEY="sk-ant-xxx"
  ./llm-link --app zed --provider anthropic --model claude-3-5-sonnet-20241022
  ```

### 3. Zhipu AI (智谱 AI)
- **Provider ID**: `zhipu`
- **Popular Models**: `glm-4-flash` (Free), `glm-4-plus`, `glm-4-air`
- **Example**:
  ```bash
  export ZHIPU_API_KEY="xxx.yyy"
  ./llm-link --app zed --provider zhipu --model glm-4-flash
  ```

### 4. Aliyun Qwen (阿里云通义千问)
- **Provider ID**: `aliyun`
- **Popular Models**: `qwen-max`, `qwen-plus`, `qwen-turbo`, `qwen-long`
- **Streaming**: Fixed in v0.4.20
- **Example**:
  ```bash
  export ALIYUN_API_KEY="sk-xxx"
  ./llm-link --app zed --provider aliyun --model qwen-max
  ```

### 5. Volcengine (火山引擎 / 豆包)
- **Provider ID**: `volcengine`
- **Popular Models**: `doubao-pro-32k`, `doubao-lite-32k`, `doubao-pro-4k`
- **Example**:
  ```bash
  export VOLCENGINE_API_KEY="xxx"
  ./llm-link --app zed --provider volcengine --model doubao-pro-32k
  ```

### 6. Tencent Hunyuan (腾讯混元)
- **Provider ID**: `tencent`
- **Popular Models**: `hunyuan-lite`, `hunyuan-standard`, `hunyuan-pro`
- **Example**:
  ```bash
  export TENCENT_API_KEY="xxx"
  ./llm-link --app zed --provider tencent --model hunyuan-lite
  ```

### 7. Ollama (Local)
- **Provider ID**: `ollama`
- **Popular Models**: `llama3`, `mistral`, `codellama`, `qwen`
- **Note**: Requires Ollama running at `http://localhost:11434`
- **Example**:
  ```bash
  ./llm-link --app zed --provider ollama --model llama3
  ```

---

## 🔄 Update Process for Developers

When updating provider models:

1. **Verify Source**: Check the "Marketplace / Docs" link in the table above.
2. **Update Database**: creating a new migration file in `migrations/sqlite/` and `migrations/postgres/`.
   - Naming format: `NNN_seed_<provider_name>.sql`
3. **Template**:
   ```sql
   INSERT OR REPLACE INTO provider_types (...) VALUES (...);
   ```
4. **Docs**: Update this file if new providers are added.

*(Last Updated: Jan 2026)*
