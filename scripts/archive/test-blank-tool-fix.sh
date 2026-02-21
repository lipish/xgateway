#!/usr/bin/env bash
# 测试空白工具问题的修复

set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "用法：$0 <ALIYUN_API_KEY>"
  exit 1
fi

ALIYUN_API_KEY="$1"

echo "🧪 测试空白工具问题修复"
echo "====================="
echo ""

# 启动服务
echo "🚀 启动服务..."
RUST_LOG=debug ./target/release/xgateway \
  --protocols ollama \
  --provider aliyun \
  --model qwen3-coder-plus \
  --llm-api-key "${ALIYUN_API_KEY}" \
  --port 11438 > /tmp/blank-tool-fix-test.log 2>&1 &

server_pid=$!
echo "📝 服务 PID: $server_pid"
sleep 5

echo ""
echo "📡 发送工具调用请求..."

# 发送一个简单的工具调用请求
response=$(curl -s -X POST http://localhost:11438/api/chat \
  -H "Content-Type: application/json" \
  -H "User-Agent: Zed/0.212.6 (macos; aarch64)" \
  -d '{
    "model": "qwen3-coder-plus",
    "messages": [
      {
        "role": "user",
        "content": "请帮我查看当前目录的文件列表"
      }
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
  }' 2>/dev/null)

echo "✅ 请求完成"

# 分析响应
echo ""
echo "🔍 响应分析:"
echo "============"

if echo "$response" | jq . >/dev/null 2>&1; then
  echo "✅ 响应是有效的 JSON"
  
  # 检查工具调用
  if echo "$response" | jq -e '.message.tool_calls' >/dev/null 2>&1; then
    echo "✅ 响应包含工具调用"
    
    # 检查工具调用格式
    tool_calls=$(echo "$response" | jq '.message.tool_calls')
    echo "📋 工具调用内容:"
    echo "$tool_calls" | jq '.'
    
    # 验证关键字段
    echo ""
    echo "🔍 格式验证:"
    
    # 检查 ID
    id=$(echo "$tool_calls" | jq -r '.[0].id // "无ID"')
    echo "   ID: $id"
    if [[ "$id" != "无ID" && "$id" != "null" ]]; then
      echo "   ✅ 工具调用 ID 存在"
    else
      echo "   ❌ 工具调用 ID 缺失"
    fi
    
    # 检查类型
    type=$(echo "$tool_calls" | jq -r '.[0].type // "无类型"')
    echo "   类型: $type"
    if [[ "$type" == "function" ]]; then
      echo "   ✅ 类型正确"
    else
      echo "   ❌ 类型错误或缺失"
    fi
    
    # 检查函数名
    name=$(echo "$tool_calls" | jq -r '.[0].function.name // "无名称"')
    echo "   函数名: $name"
    if [[ "$name" != "无名称" && "$name" != "null" ]]; then
      echo "   ✅ 函数名存在"
    else
      echo "   ❌ 函数名缺失"
    fi
    
    # 检查参数格式
    args_type=$(echo "$tool_calls" | jq -r '.[0].function.arguments | type')
    echo "   参数类型: $args_type"
    if [[ "$args_type" == "object" ]]; then
      echo "   ✅ 参数格式正确（对象）"
    elif [[ "$args_type" == "string" ]]; then
      echo "   ❌ 参数格式错误（字符串）"
    else
      echo "   ⚠️  参数格式未知"
    fi
    
  else
    echo "📝 响应不包含工具调用（可能是纯文本响应）"
  fi
  
else
  echo "❌ 响应不是有效的 JSON"
  echo "原始响应: ${response:0:500}..."
fi

# 检查日志
echo ""
echo "📊 日志分析:"
echo "============"

echo ""
echo "🔧 工具处理日志:"
grep -E "(Tool call ID|Generated tool call ID|Converted tool call)" /tmp/blank-tool-fix-test.log | tail -5 || echo "未找到工具处理日志"

echo ""
echo "⚠️  警告和错误:"
grep -E "(warn|error|❌|⚠️)" /tmp/blank-tool-fix-test.log | tail -5 || echo "未找到警告或错误"

# 清理
echo ""
echo "🧹 清理..."
kill $server_pid 2>/dev/null || true
wait $server_pid 2>/dev/null || true

echo ""
echo "📋 测试总结:"
echo "============"
echo "如果看到以下结果，说明修复成功："
echo "✅ 响应是有效的 JSON"
echo "✅ 响应包含工具调用"
echo "✅ 工具调用 ID 存在"
echo "✅ 类型正确"
echo "✅ 函数名存在"
echo "✅ 参数格式正确（对象）"
echo ""
echo "如果仍有问题，请查看详细日志: /tmp/blank-tool-fix-test.log"
