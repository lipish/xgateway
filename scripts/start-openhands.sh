#!/bin/bash

# OpenHands 启动脚本
# 使用方法: ./scripts/start-openhands.sh [provider] [model] [api_key]

set -e

# 默认配置
DEFAULT_PROVIDER="openai"
DEFAULT_MODEL="gpt-4"
DEFAULT_PORT="8091"

# 解析参数
PROVIDER=${1:-$DEFAULT_PROVIDER}
MODEL=${2:-$DEFAULT_MODEL}
API_KEY=${3:-""}

# 检查是否提供了 API key
if [ -z "$API_KEY" ]; then
    echo "❌ 错误: 必须提供 API key"
    echo "使用方法: $0 <provider> <model> <api_key>"
    echo ""
    echo "示例:"
    echo "  $0 openai gpt-4 sk-..."
    echo "  $0 anthropic claude-3-sonnet sk-ant-..."
    echo "  $0 zhipu glm-4 xxx..."
    echo "  $0 ollama qwen2.5-coder dummy"
    echo ""
    exit 1
fi

# 构建项目（如果需要）
if [ ! -f "target/release/xgateway" ]; then
    echo "🔨 构建 xgateway..."
    cargo build --release
fi

echo "🚀 启动 xgateway for OpenHands..."
echo "   Provider: $PROVIDER"
echo "   Model: $MODEL"
echo "   Port: $DEFAULT_PORT"
echo ""

# 启动 xgateway
./target/release/xgateway \
    --app openhands \
    --provider "$PROVIDER" \
    --model "$MODEL" \
    --api-key "$API_KEY" \
    --host 0.0.0.0 \
    --port "$DEFAULT_PORT"

echo ""
echo "✅ OpenHands 代理已启动!"
echo ""
echo "📋 配置 OpenHands:"
echo "   Custom Model: openai/$MODEL"
echo "   Base URL: http://host.docker.internal:$DEFAULT_PORT/v1"
echo "   API Key: $API_KEY"
echo ""
echo "🎯 在 OpenHands 界面中:"
echo "   1. 点击 'see advanced settings'"
echo "   2. 启用 Advanced toggle"
echo "   3. 设置上述参数"
echo ""
echo "💡 提示:"
echo "   - OpenHands 使用 Docker 网络，需要 host.docker.internal"
echo "   - 支持所有 xgateway 的 LLM 提供商"
echo "   - 查看 https://docs.openhands.dev/ 获取更多信息"
echo "   - 对于本地模型，可以使用 'dummy' 作为 API key"
