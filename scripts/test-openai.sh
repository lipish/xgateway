#!/usr/bin/env bash
# 测试 OpenAI 模型的脚本

set -euo pipefail

if [[ $# -lt 1 ]]; then
  cat <<'USAGE'
用法：scripts/test-openai.sh <OPENAI_API_KEY> [MODEL]

测试 OpenAI 模型与 Zed 的集成。

参数：
  OPENAI_API_KEY - OpenAI API 密钥
  MODEL          - 模型名称 (默认: gpt-4o)

可用模型：
  gpt-4o         - 最新的 GPT-4 Omni 模型 ⭐
  gpt-4          - 标准 GPT-4 模型
  gpt-3.5-turbo  - 快速且经济的模型

示例：
  scripts/test-openai.sh "sk-xxx" 
  scripts/test-openai.sh "sk-xxx" gpt-4
  scripts/test-openai.sh "sk-xxx" gpt-3.5-turbo

环境变量：
  RUST_LOG=debug  # 启用调试日志
USAGE
  exit 1
fi

OPENAI_API_KEY="$1"
MODEL="${2:-gpt-4o}"

# 验证 API 密钥格式
if [[ ! "${OPENAI_API_KEY}" =~ ^sk-[a-zA-Z0-9_-]+$ ]]; then
  echo "⚠️  警告：API 密钥格式可能不正确"
  echo "   OpenAI API 密钥通常以 'sk-' 开头"
fi

XGATEWAY_BIN="./target/release/xgateway"

# 检查并构建 xgateway
if [[ ! -x "${XGATEWAY_BIN}" ]]; then
  echo "🔧 构建 xgateway..."
  cargo build --release
fi

# 检查端口是否被占用
if lsof -Pi :11434 -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo "⚠️  警告：端口 11434 已被占用"
  echo "请停止占用该端口的服务或使用其他端口"
  exit 1
fi

echo "🚀 启动 OpenAI + Zed 服务"
echo "========================="
echo "📋 提供商: OpenAI"
echo "🤖 模型:   $MODEL"
echo "🌐 端口:   11434"
echo "🔗 协议:   Ollama (兼容 Zed)"
echo "🔑 API:    ${OPENAI_API_KEY:0:8}..."
echo "========================="
echo ""
echo "💡 在 Zed 中配置："
echo "   1. 打开 Zed 设置"
echo "   2. 配置 LLM 服务器: http://localhost:11434"
echo "   3. 模型名称: $MODEL"
echo ""
echo "🛑 停止服务: Ctrl+C"
echo "========================="

# 启动服务
exec "${XGATEWAY_BIN}" \
  --app zed \
  --protocols ollama \
  --provider openai \
  --model "$MODEL" \
  --llm-api-key "${OPENAI_API_KEY}"
