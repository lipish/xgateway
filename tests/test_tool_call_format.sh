#!/bin/bash
# 测试工具调用响应格式是否符合 Zed 期望

set -e

echo "🧪 测试工具调用响应格式"
echo ""

if [ -z "$ZHIPU_API_KEY" ]; then
    echo "❌ 请设置 ZHIPU_API_KEY 环境变量"
    exit 1
fi

echo "🚀 启动 xgateway 服务..."
./target/release/xgateway \
  --protocols ollama \
  --provider zhipu \
  --model glm-4.6 \
  --llm-api-key "$ZHIPU_API_KEY" \
  > /tmp/xgateway-tool-format-test.log 2>&1 &

PID=$!
echo "📝 PID: $PID"
sleep 3

echo ""
echo "📡 发送工具调用请求..."

# 使用流式请求测试
curl -X POST http://localhost:11434/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "model": "glm-4.6",
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
  }' 2>&1 | tee /tmp/tool-call-response.txt

echo ""
echo ""
echo "📊 分析响应格式..."

# 检查是否包含 tool_calls
if grep -q "tool_calls" /tmp/tool-call-response.txt; then
  echo "✅ 找到 tool_calls"
  
  # 提取包含 tool_calls 的行
  echo ""
  echo "🔍 tool_calls 内容:"
  grep "tool_calls" /tmp/tool-call-response.txt | head -1 | jq '.message.tool_calls' 2>/dev/null || echo "⚠️ 无法解析为 JSON"
  
  # 检查 arguments 格式
  echo ""
  echo "🔍 检查 arguments 格式:"
  ARGS=$(grep "tool_calls" /tmp/tool-call-response.txt | head -1 | jq '.message.tool_calls[0].function.arguments' 2>/dev/null)
  
  if [ $? -eq 0 ]; then
    echo "✅ arguments 字段可以被解析"
    echo "   类型: $(echo $ARGS | jq 'type' 2>/dev/null)"
    echo "   内容: $ARGS"
    
    # 检查是否是对象而不是字符串
    ARG_TYPE=$(echo $ARGS | jq 'type' 2>/dev/null)
    if [ "$ARG_TYPE" = '"object"' ]; then
      echo "✅ arguments 是 JSON 对象 (符合 Zed 期望)"
    elif [ "$ARG_TYPE" = '"string"' ]; then
      echo "❌ arguments 是字符串 (Zed 期望对象)"
    else
      echo "⚠️ arguments 类型未知: $ARG_TYPE"
    fi
  else
    echo "❌ 无法解析 arguments 字段"
  fi
else
  echo "⚠️ 未找到 tool_calls (可能模型选择不调用工具)"
fi

echo ""
echo "📋 服务日志 (最后 20 行):"
tail -20 /tmp/xgateway-tool-format-test.log | grep -E "(tool|Tool|🔧)"

# 清理
echo ""
echo "🧹 清理..."
kill $PID 2>/dev/null || true

echo ""
echo "✅ 测试完成!"

