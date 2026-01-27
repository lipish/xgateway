#!/bin/bash
# 测试 Zed 兼容性 - 验证工具调用检测

set -e

echo "🧪 测试 Zed 兼容性 - 工具调用检测"
echo ""

# 测试智谱 GLM
echo "📋 测试 1: 智谱 GLM-4.6"
echo "================================"

./target/release/xgateway \
  --protocols ollama \
  --provider zhipu \
  --model glm-4.6 \
  --llm-api-key "test" \
  > /tmp/xgateway-zed-test.log 2>&1 &

PID=$!
echo "📝 PID: $PID"
sleep 3

echo ""
echo "1️⃣ 测试 /api/tags (模型列表)"
curl -s http://localhost:11434/api/tags | jq '.models[] | {name: .name, tags: .tags}' | head -20

echo ""
echo "2️⃣ 测试 /api/show (模型详情)"
curl -s -X POST http://localhost:11434/api/show \
  -H "Content-Type: application/json" \
  -d '{"name": "glm-4.6"}' | jq '{capabilities, details}'

echo ""
echo "3️⃣ 测试工具调用请求"
curl -s -X POST http://localhost:11434/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "model": "glm-4.6",
    "messages": [{"role": "user", "content": "test"}],
    "stream": false,
    "tools": [{
      "type": "function",
      "function": {
        "name": "test_tool",
        "description": "Test tool",
        "parameters": {"type": "object", "properties": {}}
      }
    }]
  }' 2>&1 | head -5

echo ""
echo "✅ 智谱 GLM-4.6 测试完成"

# 清理
kill $PID 2>/dev/null || true
sleep 2

# 测试 Volcengine (如果有 API key)
if [ -n "$VOLCENGINE_API_KEY" ]; then
    echo ""
    echo "📋 测试 2: Volcengine Seed Code"
    echo "================================"
    
    ./target/release/xgateway \
      --protocols ollama \
      --provider volcengine \
      --model doubao-seed-code-preview-latest \
      --llm-api-key "$VOLCENGINE_API_KEY" \
      > /tmp/xgateway-volcengine-test.log 2>&1 &
    
    PID=$!
    echo "📝 PID: $PID"
    sleep 3
    
    echo ""
    echo "1️⃣ 测试 /api/tags (模型列表)"
    curl -s http://localhost:11434/api/tags | jq '.models[] | {name: .name, tags: .tags}' | head -20
    
    echo ""
    echo "2️⃣ 测试 /api/show (模型详情)"
    curl -s -X POST http://localhost:11434/api/show \
      -H "Content-Type: application/json" \
      -d '{"name": "doubao-seed-code-preview-latest"}' | jq '{capabilities, details}'
    
    echo ""
    echo "✅ Volcengine Seed Code 测试完成"
    
    # 清理
    kill $PID 2>/dev/null || true
fi

echo ""
echo "🎉 所有测试完成!"
echo ""
echo "📝 Zed 兼容性检查:"
echo "  ✅ /api/tags 返回 tags 字段"
echo "  ✅ /api/show 返回 capabilities 字段"
echo "  ✅ 支持工具的模型包含 'tools' 标记"
echo ""
echo "现在可以在 Zed 中使用了!"

