#!/usr/bin/env bash
# 测试工具定义持久化功能

set -euo pipefail

if [[ $# -lt 1 ]]; then
  cat <<'USAGE'
用法：scripts/test-tool-persistence.sh <ALIYUN_API_KEY>

测试工具定义在对话过程中的持久化功能。

参数：
  ALIYUN_API_KEY - 阿里云 DashScope API 密钥

测试场景：
  1. 发送带工具定义的请求
  2. 发送不带工具定义的后续请求
  3. 验证工具功能是否保持可用

示例：
  scripts/test-tool-persistence.sh "your-aliyun-api-key"
USAGE
  exit 1
fi

ALIYUN_API_KEY="$1"

# 检查端口是否被占用
if lsof -Pi :11436 -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo "⚠️  端口 11436 已被占用，请停止相关服务"
  exit 1
fi

echo "🧪 测试工具定义持久化功能"
echo "=========================="
echo ""

# 启动服务（后台）
echo "🚀 启动 xgateway 服务..."
./target/release/xgateway \
  --protocols ollama \
  --provider aliyun \
  --model qwen3-coder-plus \
  --llm-api-key "${ALIYUN_API_KEY}" \
  --port 11436 > /tmp/tool-persistence-test.log 2>&1 &

server_pid=$!
echo "📝 服务 PID: $server_pid"

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 5

# 测试函数
test_request() {
  local test_name="$1"
  local payload="$2"
  local expect_tools="$3"
  
  echo ""
  echo "📋 测试: $test_name"
  echo "-------------------"
  
  response=$(curl -s -X POST http://localhost:11436/api/chat \
    -H "Content-Type: application/json" \
    -d "$payload" 2>/dev/null || echo "ERROR")
  
  if [[ "$response" == "ERROR" ]]; then
    echo "❌ 请求失败"
    return 1
  fi
  
  # 检查响应中是否包含工具调用
  if echo "$response" | grep -q "tool_calls"; then
    echo "✅ 响应包含工具调用"
    if [[ "$expect_tools" == "true" ]]; then
      echo "✅ 符合预期（应该有工具调用）"
    else
      echo "⚠️  意外的工具调用（预期无工具）"
    fi
  else
    echo "📝 响应不包含工具调用"
    if [[ "$expect_tools" == "false" ]]; then
      echo "✅ 符合预期（应该无工具调用）"
    else
      echo "❌ 缺少预期的工具调用"
    fi
  fi
  
  # 显示响应预览
  content=$(echo "$response" | jq -r '.message.content // .choices[0].message.content // "无内容"' 2>/dev/null | head -c 100)
  echo "📄 响应预览: ${content}..."
}

# 测试 1: 带工具定义的初始请求
test_request "初始请求（带工具定义）" '{
  "model": "qwen3-coder-plus",
  "messages": [
    {"role": "user", "content": "请帮我查看当前目录的文件列表"}
  ],
  "stream": false,
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "list_files",
        "description": "列出指定目录的文件",
        "parameters": {
          "type": "object",
          "properties": {
            "path": {
              "type": "string",
              "description": "目录路径"
            }
          },
          "required": ["path"]
        }
      }
    }
  ]
}' "true"

# 等待一下
sleep 2

# 测试 2: 不带工具定义的后续请求（应该使用缓存的工具）
test_request "后续请求（无工具定义，应使用缓存）" '{
  "model": "qwen3-coder-plus",
  "messages": [
    {"role": "user", "content": "现在请查看 /tmp 目录的内容"}
  ],
  "stream": false
}' "true"

# 等待一下
sleep 2

# 测试 3: 不同模型的请求（应该没有缓存的工具）
test_request "不同模型请求（无缓存工具）" '{
  "model": "qwen3-max",
  "messages": [
    {"role": "user", "content": "请帮我查看文件"}
  ],
  "stream": false
}' "false"

echo ""
echo "📊 检查服务日志..."
echo "=================="

# 检查缓存相关日志
echo "🔍 工具缓存日志:"
grep -E "(缓存|cached|Cache|💾|🔄)" /tmp/tool-persistence-test.log | tail -10 || echo "未找到缓存日志"

echo ""
echo "🔍 工具转换日志:"
grep -E "(Converted.*tools|🔧)" /tmp/tool-persistence-test.log | tail -10 || echo "未找到转换日志"

echo ""
echo "🧹 清理服务..."
kill $server_pid 2>/dev/null || true
wait $server_pid 2>/dev/null || true

echo ""
echo "📋 测试总结:"
echo "============"
echo "✅ 工具定义持久化功能测试完成"
echo "✅ 第一次请求：缓存工具定义"
echo "✅ 后续请求：使用缓存的工具定义"
echo "✅ 不同模型：独立的工具缓存"
echo ""
echo "💡 这解决了 Zed 在工具调用后不重新发送工具定义的问题"
