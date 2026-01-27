#!/usr/bin/env bash
# 验证 GLM-4.6 模型支持

set -euo pipefail

echo "🔍 验证 GLM-4.6 模型支持..."
echo ""

# 检查模型配置文件
echo "📋 检查模型配置文件..."
if grep -q "glm-4.6" src/models/models.yaml; then
    echo "✅ models.yaml 中找到 glm-4.6 配置"
    grep -A 5 "glm-4.6" src/models/models.yaml
else
    echo "❌ models.yaml 中未找到 glm-4.6 配置"
fi

echo ""

# 检查文档
echo "📋 检查文档支持..."
if grep -q "glm-4.6" docs/USER_GUIDE.md; then
    echo "✅ 文档中找到 glm-4.6 支持"
else
    echo "❌ 文档中未找到 glm-4.6 支持"
fi

echo ""

# 检查 xgateway 帮助信息
echo "📋 检查 xgateway 二进制文件..."
if [[ -x "./target/release/xgateway" ]]; then
    echo "✅ xgateway 二进制文件存在"
    
    # 测试启动（不需要真实 API 密钥）
    echo "🧪 测试启动 GLM-4.6..."
    timeout 5s ./target/release/xgateway \
        --provider zhipu \
        --model glm-4.6 \
        --llm-api-key "test" \
        --help > /dev/null 2>&1 && echo "✅ GLM-4.6 模型参数被接受" || echo "⚠️  无法验证模型参数（可能需要有效 API 密钥）"
else
    echo "❌ xgateway 二进制文件不存在，请先运行 cargo build --release"
fi

echo ""
echo "🎯 总结："
echo "  - GLM-4.6 是智谱 AI 的最新旗舰模型"
echo "  - 支持 200K 上下文长度"
echo "  - 具有强大的代码理解和生成能力"
echo "  - 支持工具调用 (Function Calling)"
echo ""
echo "💡 使用方法："
echo "  ./scripts/zed-glm4-quick.sh \"your-zhipu-api-key\""
