#!/bin/bash
# 验证所有修复是否生效

set -e

echo "🧪 验证 Zed 兼容性修复"
echo ""

if [ -z "$ZHIPU_API_KEY" ]; then
    echo "❌ 请设置 ZHIPU_API_KEY 环境变量"
    exit 1
fi

# 停止旧服务
echo "🛑 停止旧服务..."
pkill -f "xgateway.*ollama" || true
sleep 2

# 启动新服务
echo "🚀 启动新服务..."
./target/release/xgateway \
  --protocols ollama \
  --provider zhipu \
  --model glm-4.6 \
  --llm-api-key "$ZHIPU_API_KEY" \
  > /tmp/xgateway-verify.log 2>&1 &

PID=$!
echo "📝 PID: $PID"
sleep 3

echo ""
echo "=" | tr '=' '=' | head -c 60; echo ""
echo "1️⃣ 验证上下文长度"
echo "=" | tr '=' '=' | head -c 60; echo ""

RESPONSE=$(curl -s -X POST http://localhost:11434/api/show \
  -H "Content-Type: application/json" \
  -d '{"name": "glm-4.6"}')

echo "📊 /api/show 响应:"
echo "$RESPONSE" | jq '{parameters, capabilities, model_info: {context_length: .model_info."llama.context_length"}}'

CONTEXT_LENGTH=$(echo "$RESPONSE" | jq -r '.model_info."llama.context_length"')
echo ""
if [ "$CONTEXT_LENGTH" = "200000" ]; then
    echo "✅ 上下文长度正确: $CONTEXT_LENGTH"
else
    echo "❌ 上下文长度错误: $CONTEXT_LENGTH (期望: 200000)"
fi

echo ""
echo "=" | tr '=' '=' | head -c 60; echo ""
echo "2️⃣ 验证推理内容过滤"
echo "=" | tr '=' '=' | head -c 60; echo ""

echo "📡 发送测试请求..."
curl -s -X POST http://localhost:11434/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "model": "glm-4.6",
    "messages": [{"role": "user", "content": "分析一下 Rust 语言的优势"}],
    "stream": true
  }' > /tmp/chat-response.txt 2>&1

echo ""
echo "📋 检查响应内容..."

# 检查是否包含 <think> 标签
if grep -q "<think>" /tmp/chat-response.txt; then
    echo "❌ 响应中仍然包含 <think> 标签"
    echo "   示例:"
    grep "<think>" /tmp/chat-response.txt | head -3
else
    echo "✅ 响应中没有 <think> 标签"
fi

# 检查日志中是否有过滤记录
echo ""
echo "📋 检查过滤日志..."
if grep -q "🧠 Filtered reasoning_content" /tmp/xgateway-verify.log; then
    echo "✅ 检测到推理内容过滤日志:"
    grep "🧠 Filtered reasoning_content" /tmp/xgateway-verify.log | head -3
else
    echo "⚠️ 未检测到推理内容过滤日志"
    echo "   可能原因:"
    echo "   1. 模型没有返回 reasoning_content"
    echo "   2. 过滤逻辑未生效"
fi

echo ""
echo "=" | tr '=' '=' | head -c 60; echo ""
echo "3️⃣ 验证工具调用格式"
echo "=" | tr '=' '=' | head -c 60; echo ""

echo "📡 发送工具调用请求..."
curl -s -X POST http://localhost:11434/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "model": "glm-4.6",
    "messages": [{"role": "user", "content": "北京天气如何?"}],
    "stream": false,
    "tools": [{
      "type": "function",
      "function": {
        "name": "get_weather",
        "description": "获取天气",
        "parameters": {
          "type": "object",
          "properties": {
            "location": {"type": "string"}
          }
        }
      }
    }]
  }' > /tmp/tool-response.json 2>&1

echo ""
if grep -q "tool_calls" /tmp/tool-response.json; then
    echo "✅ 检测到工具调用"
    echo "📊 arguments 格式:"
    cat /tmp/tool-response.json | jq '.message.tool_calls[0].function.arguments | type' 2>/dev/null || echo "⚠️ 无法解析"
else
    echo "⚠️ 未检测到工具调用 (可能模型选择不调用)"
fi

# 清理
echo ""
echo "🧹 清理..."
kill $PID 2>/dev/null || true

echo ""
echo "=" | tr '=' '=' | head -c 60; echo ""
echo "✅ 验证完成!"
echo "=" | tr '=' '=' | head -c 60; echo ""
echo ""
echo "📝 完整日志: /tmp/xgateway-verify.log"
echo "📝 聊天响应: /tmp/chat-response.txt"
echo "📝 工具响应: /tmp/tool-response.json"

