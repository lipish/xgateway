#!/bin/bash
# 测试 Ollama 协议的工具调用支持

set -e

echo "🧪 测试 Ollama 协议工具调用支持"
echo ""

# 使用智谱 GLM-4.6 测试（已知支持工具调用）
ZHIPU_API_KEY="4a46b712c9514759a1926fe96c6bd54b.6h9F0vQnlRF9SQgC"

echo "🚀 启动 xgateway 服务 (Ollama 协议 + Zhipu GLM-4.6)..."
cargo build --release 2>&1 | grep -v "Compiling\|Finished" || true

./target/release/xgateway \
  --app zed \
  --protocols ollama \
  --provider zhipu \
  --model glm-4-flash \
  --llm-api-key "$ZHIPU_API_KEY" \
  > /tmp/xgateway-ollama-tools.log 2>&1 &

PID=$!
echo "📝 PID: $PID"

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 3

# 测试工具调用
echo ""
echo "📡 测试 Ollama 协议工具调用 (流式)..."
echo ""

curl -X POST http://localhost:11434/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "model": "glm-4-flash",
    "messages": [
      {
        "role": "user",
        "content": "What is the weather in Beijing?"
      }
    ],
    "stream": true,
    "tools": [
      {
        "type": "function",
        "function": {
          "name": "get_weather",
          "description": "Get the current weather in a location",
          "parameters": {
            "type": "object",
            "properties": {
              "location": {
                "type": "string",
                "description": "The city name"
              }
            },
            "required": ["location"]
          }
        }
      }
    ]
  }' 2>&1 | tee /tmp/ollama-tools-response.txt

echo ""
echo ""
echo "📊 检查响应中是否包含 tool_calls..."
if grep -q "tool_calls" /tmp/ollama-tools-response.txt; then
  echo "✅ 找到 tool_calls!"
  grep "tool_calls" /tmp/ollama-tools-response.txt | head -5
else
  echo "❌ 未找到 tool_calls"
  echo ""
  echo "📋 完整响应:"
  cat /tmp/ollama-tools-response.txt
fi

echo ""
echo "📋 服务日志:"
tail -20 /tmp/xgateway-ollama-tools.log

# 清理
echo ""
echo "🧹 清理..."
kill $PID 2>/dev/null || true
sleep 1

echo ""
echo "✅ 测试完成!"

