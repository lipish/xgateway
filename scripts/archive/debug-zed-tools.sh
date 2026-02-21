#!/usr/bin/env bash
# 调试 Zed 工具调用问题的脚本

set -euo pipefail

if [[ $# -lt 1 ]]; then
  cat <<'USAGE'
用法：scripts/debug-zed-tools.sh <ALIYUN_API_KEY>

调试 Zed 工具调用的详细流程，包括：
1. 原始请求格式
2. 工具转换过程
3. 响应格式
4. 工具调用 ID 处理

参数：
  ALIYUN_API_KEY - 阿里云 DashScope API 密钥

示例：
  scripts/debug-zed-tools.sh "your-aliyun-api-key"
USAGE
  exit 1
fi

ALIYUN_API_KEY="$1"

# 检查端口是否被占用
if lsof -Pi :11437 -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo "⚠️  端口 11437 已被占用，请停止相关服务"
  exit 1
fi

echo "🔍 调试 Zed 工具调用问题"
echo "======================="
echo ""

# 启动服务（后台，启用详细日志）
echo "🚀 启动 xgateway 服务（详细日志模式）..."
RUST_LOG=debug ./target/release/xgateway \
  --protocols ollama \
  --provider aliyun \
  --model qwen3-coder-plus \
  --llm-api-key "${ALIYUN_API_KEY}" \
  --port 11437 > /tmp/zed-tools-debug.log 2>&1 &

server_pid=$!
echo "📝 服务 PID: $server_pid"

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 5

# 测试函数
debug_request() {
  local test_name="$1"
  local payload="$2"
  
  echo ""
  echo "🔍 测试: $test_name"
  echo "==================="
  
  echo "📤 发送请求..."
  response=$(curl -s -X POST http://localhost:11437/api/chat \
    -H "Content-Type: application/json" \
    -H "User-Agent: Zed/0.212.6 (macos; aarch64)" \
    -d "$payload" 2>/dev/null || echo "ERROR")
  
  if [[ "$response" == "ERROR" ]]; then
    echo "❌ 请求失败"
    return 1
  fi
  
  echo "📥 响应接收完成"
  
  # 分析响应中的工具调用
  echo ""
  echo "🔧 工具调用分析:"
  echo "---------------"
  
  # 检查是否有工具调用
  if echo "$response" | grep -q "tool_calls"; then
    echo "✅ 响应包含工具调用"
    
    # 提取工具调用详情
    tool_calls=$(echo "$response" | jq -r '.message.tool_calls // empty' 2>/dev/null || echo "[]")
    if [[ "$tool_calls" != "[]" && "$tool_calls" != "null" ]]; then
      echo "📋 工具调用详情:"
      echo "$tool_calls" | jq '.' 2>/dev/null || echo "无法解析工具调用"
      
      # 检查每个工具调用的格式
      echo ""
      echo "🔍 格式验证:"
      tool_count=$(echo "$tool_calls" | jq 'length' 2>/dev/null || echo "0")
      echo "   工具调用数量: $tool_count"
      
      for i in $(seq 0 $((tool_count-1))); do
        echo "   工具 $i:"
        id=$(echo "$tool_calls" | jq -r ".[$i].id // \"无ID\"" 2>/dev/null)
        type=$(echo "$tool_calls" | jq -r ".[$i].type // \"无类型\"" 2>/dev/null)
        name=$(echo "$tool_calls" | jq -r ".[$i].function.name // \"无名称\"" 2>/dev/null)
        args_type=$(echo "$tool_calls" | jq -r ".[$i].function.arguments | type" 2>/dev/null)
        
        echo "     ID: $id"
        echo "     类型: $type"
        echo "     函数名: $name"
        echo "     参数类型: $args_type"
        
        if [[ "$args_type" == "object" ]]; then
          echo "     ✅ 参数格式正确（对象）"
        elif [[ "$args_type" == "string" ]]; then
          echo "     ❌ 参数格式错误（字符串，Zed 期望对象）"
        else
          echo "     ⚠️  参数格式未知: $args_type"
        fi
      done
    else
      echo "⚠️  工具调用为空或无效"
    fi
  else
    echo "📝 响应不包含工具调用"
  fi
  
  # 显示响应预览
  echo ""
  echo "📄 响应预览 (前200字符):"
  echo "${response:0:200}..."
}

# 测试 1: 模拟 Zed 的工具调用请求
debug_request "Zed 风格的工具调用请求" '{
  "model": "qwen3-coder-plus",
  "messages": [
    {
      "role": "user",
      "content": "请帮我列出当前目录的文件"
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
}'

# 等待一下
sleep 3

# 测试 2: 流式请求
debug_request "流式工具调用请求" '{
  "model": "qwen3-coder-plus",
  "messages": [
    {
      "role": "user",
      "content": "请查看 /tmp 目录的内容"
    }
  ],
  "stream": true,
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "list_directory",
        "description": "列出目录内容",
        "parameters": {
          "type": "object",
          "properties": {
            "directory": {
              "type": "string",
              "description": "要列出的目录路径"
            }
          },
          "required": ["directory"]
        }
      }
    }
  ]
}'

echo ""
echo "📊 服务日志分析"
echo "==============="

echo ""
echo "🔍 工具相关日志:"
grep -E "(tool|Tool|🔧|🔍)" /tmp/zed-tools-debug.log | tail -20 || echo "未找到工具相关日志"

echo ""
echo "🔍 错误日志:"
grep -E "(error|Error|❌|⚠️)" /tmp/zed-tools-debug.log | tail -10 || echo "未找到错误日志"

echo ""
echo "🔍 工具调用转换日志:"
grep -E "(Converted tool call|Generated tool call ID|Tool call ID)" /tmp/zed-tools-debug.log | tail -10 || echo "未找到转换日志"

echo ""
echo "🧹 清理服务..."
kill $server_pid 2>/dev/null || true
wait $server_pid 2>/dev/null || true

echo ""
echo "📋 调试总结:"
echo "============"
echo "✅ 检查了工具调用的完整流程"
echo "✅ 验证了响应格式是否符合 Zed 期望"
echo "✅ 分析了工具调用 ID 和参数格式"
echo ""
echo "💡 如果仍有问题，请检查："
echo "   1. 工具调用 ID 是否正确生成"
echo "   2. 参数是否为 JSON 对象而非字符串"
echo "   3. 响应格式是否符合 Ollama 规范"
echo ""
echo "📄 详细日志文件: /tmp/zed-tools-debug.log"
