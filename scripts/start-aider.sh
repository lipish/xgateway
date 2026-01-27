#!/bin/bash

# Aider 启动脚本
# 使用方法: ./scripts/start-aider.sh [provider] [model] [api_key]

set -e

# 默认配置
DEFAULT_PROVIDER="zhipu"
DEFAULT_MODEL="glm-4.6"
DEFAULT_PORT="8090"

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
    echo "  $0 zhipu glm-4.6 your-zhipu-key"
    echo "  $0 aliyun qwen3-coder-plus your-aliyun-key"
    echo "  $0 minimax m2 your-minimax-key"
    echo "  $0 moonshot k2 your-moonshot-key"
    echo ""
    exit 1
fi

# 构建项目（如果需要）
if [ ! -f "target/release/xgateway" ]; then
    echo "🔨 构建 xgateway..."
    cargo build --release
fi

echo "🚀 启动 xgateway for Aider..."
echo "   Provider: $PROVIDER"
echo "   Model: $MODEL"
echo "   Port: $DEFAULT_PORT"
echo ""

# 启动 xgateway
./target/release/xgateway \
    --app aider \
    --provider "$PROVIDER" \
    --model "$MODEL" \
    --api-key "$API_KEY" \
    --host 0.0.0.0 \
    --port "$DEFAULT_PORT"

echo ""
echo "✅ Aider 代理已启动!"
echo ""
echo "📋 配置 Aider:"
echo "export OPENAI_API_BASE=http://localhost:$DEFAULT_PORT/v1"
echo "export OPENAI_API_KEY=$API_KEY"
echo ""
echo "🎯 开始使用 Aider:"
echo "aider --model openai/$MODEL"
echo ""
echo "💡 提示:"
echo "   - Aider 使用 'openai/' 前缀的模型名"
echo "   - 支持所有 xgateway 的 LLM 提供商"
echo "   - 查看 https://aider.chat/docs/ 获取更多信息"
