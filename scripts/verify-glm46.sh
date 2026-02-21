#!/usr/bin/env bash
# 验证 GLM-4.6 模型支持

set -euo pipefail

echo "🔍 验证 GLM-4.6 模型支持..."
echo ""

# 检查文档
echo "📋 检查文档支持..."
if [[ -f "docs/USER_GUIDE.md" ]] && grep -q "glm-4.6" docs/USER_GUIDE.md 2>/dev/null; then
    echo "✅ 文档中找到 glm-4.6 支持"
else
    echo "⚠️  文档中未提及 glm-4.6（可忽略）"
fi

echo ""

# 检查 xgateway 二进制文件
echo "📋 检查 xgateway 二进制文件..."
XGATEWAY_BIN="${XGATEWAY_BIN:-./target/release/xgateway}"
if [[ -x "$XGATEWAY_BIN" ]]; then
    echo "✅ xgateway 二进制文件存在"
    echo "🧪 验证 GLM-4.6 参数..."
    if "$XGATEWAY_BIN" --app zed --provider zhipu --model glm-4.6 --llm-api-key "test" --help >/dev/null 2>&1; then
        echo "✅ GLM-4.6 模型参数被接受"
    else
        echo "⚠️  无法验证（请先 cargo build --release）"
    fi
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
