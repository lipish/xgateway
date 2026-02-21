# 🚀 xgateway 多提供商测试脚本

这个目录包含了测试 xgateway 与各种 LLM 提供商集成的脚本。

**详细文档**：智谱 GLM-4 见 [README-GLM4.md](README-GLM4.md)，阿里云 Qwen3-Coder 见 [ZED-QWEN3-CODER-SETUP.md](ZED-QWEN3-CODER-SETUP.md)。

## 📁 脚本概览

### 🎯 主要脚本

| 脚本名称 | 用途 | 推荐度 |
|---------|------|--------|
| `switch-provider.sh` | 通用提供商切换脚本 | ⭐⭐⭐ |
| `zed-glm4-quick.sh` | GLM-4.6 快速启动 | ⭐⭐⭐ |
| `test-other-providers.sh` | 查看所有支持的提供商 | ⭐⭐ |

### 📊 测试脚本

| 脚本名称 | 用途 |
|---------|------|
| `test-glm4-models.sh` | 测试所有 GLM-4 模型 |
| `verify-glm46.sh` | 验证 GLM-4.6 支持 |

### 其他

| 脚本/目录 | 用途 |
|----------|------|
| `start-aider.sh` | Aider 启动 |
| `start-openhands.sh` | OpenHands 启动 |
| `start-codex.sh` | Codex CLI 启动 |
| `archive/` | 调试用脚本归档 |

## 🚀 快速开始

### 1. 通用切换脚本（推荐）

```bash
# OpenAI GPT-4o
./scripts/switch-provider.sh openai "sk-xxx"

# Anthropic Claude 3.5 Sonnet
./scripts/switch-provider.sh anthropic "sk-ant-xxx"

# 智谱 GLM-4.6
./scripts/switch-provider.sh zhipu "your-key"

# 阿里云通义千问
./scripts/switch-provider.sh aliyun "your-key"

# 火山引擎豆包
./scripts/switch-provider.sh volcengine "your-key"
```

### 2. 按提供商启动

```bash
# OpenAI / Claude / 智谱 / 阿里云 等
./scripts/switch-provider.sh openai "sk-xxx"
./scripts/switch-provider.sh anthropic "sk-ant-xxx"
./scripts/switch-provider.sh zhipu "your-key"
./scripts/switch-provider.sh aliyun "your-key"

# 智谱 GLM-4 快捷脚本
./scripts/zed-glm4-quick.sh "your-zhipu-key"
```

## 📋 支持的提供商

| 提供商 | 模型数量 | 推荐模型 | API 密钥格式 |
|--------|----------|----------|-------------|
| **OpenAI** | 7 | gpt-4o | sk-xxx |
| **Anthropic** | 5 | claude-3-5-sonnet-20241022 | sk-ant-xxx |
| **智谱 AI** | 6 | glm-4.6 | 字母数字组合 |
| **阿里云** | 8 | qwen3-max | 字母数字组合 |
| **火山引擎** | 6 | doubao-seed-1.6 | 字母数字组合 |
| **腾讯云** | 10 | hunyuan-turbos-latest | 字母数字组合 |
| **月之暗面** | 3 | kimi-k2-turbo-preview | 字母数字组合 |
| **MiniMax** | 1 | MiniMax-M2 | 字母数字组合 |
| **LongCat** | 2 | LongCat-Flash-Chat | 字母数字组合 |
| **Ollama** | 动态 | llama3.2 | 无需密钥 |

## 🔑 获取 API 密钥

| 提供商 | 官网链接 |
|--------|----------|
| OpenAI | https://platform.openai.com/api-keys |
| Anthropic | https://console.anthropic.com/ |
| 智谱 AI | https://open.bigmodel.cn/ |
| 阿里云 | https://dashscope.aliyun.com/ |
| 火山引擎 | https://console.volcengine.com/ |
| 腾讯云 | https://cloud.tencent.com/product/hunyuan |
| 月之暗面 | https://platform.moonshot.cn/ |

## 💡 使用技巧

### 1. 查看所有支持的提供商
```bash
./scripts/test-other-providers.sh
```

### 2. 启用调试日志
```bash
RUST_LOG=debug ./scripts/switch-provider.sh openai "sk-xxx"
```

### 3. 使用自定义端口
```bash
./scripts/switch-provider.sh openai "sk-xxx" gpt-4o 18000
```

### 4. 在 Zed 中切换提供商
1. 停止当前服务 (Ctrl+C)
2. 启动新的提供商服务
3. 重启 Zed 或重新打开 AI 助手面板

## 🧪 测试流程

### 1. 基本连接测试
```bash
# 启动服务后
curl http://localhost:11434/api/tags
```

### 2. 模型列表验证
```bash
curl http://localhost:11434/api/info | jq '.supported_providers'
```

### 3. 简单对话测试
```bash
curl -X POST http://localhost:11434/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "Hello!"}],
    "stream": false
  }'
```

## 🔧 故障排除

### 常见问题

1. **端口被占用**
   ```bash
   lsof -i :11434  # 查看占用进程
   ```

2. **API 密钥错误**
   - 检查密钥格式
   - 验证密钥权限
   - 确认账户余额

3. **模型不可用**
   ```bash
   curl http://localhost:11434/api/info | jq '.supported_providers[] | select(.name == "openai")'
   ```

### 日志分析
```bash
# 启用详细日志
RUST_LOG=debug ./scripts/switch-provider.sh openai "sk-xxx" 2>&1 | tee debug.log

# 查看错误
grep -i error debug.log
```

## 📈 性能对比

| 提供商 | 响应速度 | 代码能力 | 工具调用 | 上下文长度 |
|--------|----------|----------|----------|------------|
| OpenAI | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | 128K |
| Anthropic | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | 200K |
| 智谱 GLM-4.6 | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | 200K |
| 阿里云 | ⭐⭐ | ⭐⭐ | ⭐⭐ | 262K |
| 火山引擎 | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | 未知 |

## 🎯 推荐配置

### 代码开发
1. **智谱 GLM-4.6** - 200K 上下文，强大代码能力
2. **OpenAI GPT-4o** - 全能模型，工具调用优秀
3. **Anthropic Claude 3.5** - 推理能力强，适合复杂任务

### 快速响应
1. **GLM-4.5-flash** - 智谱快速版本
2. **GPT-3.5-turbo** - OpenAI 经济版本
3. **Claude 3 Haiku** - Anthropic 快速版本
