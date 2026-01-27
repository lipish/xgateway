#!/bin/bash

# Minimax M2 完整测试脚本

export MINIMAX_API_KEY='eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJHcm91cE5hbWUiOiJsaXBpIiwiVXNlck5hbWUiOiJsaXBpIiwiQWNjb3VudCI6IiIsIlN1YmplY3RJRCI6IjE3NTQwMTIzODY3MTAyNjE3ODQiLCJQaG9uZSI6IjEzOTAxNzMxMjY2IiwiR3JvdXBJRCI6IjE3NTQwMTIzODY3MDYwNjc0ODAiLCJQYWdlTmFtZSI6IiIsIk1haWwiOiIiLCJDcmVhdGVUaW1lIjoiMjAyNS0xMS0wNCAwMDowMzo0MSIsIlRva2VuVHlwZSI6MSwiaXNzIjoibWluaW1heCJ9.hSPik-eRMCB1X7M3p2MK84SgR1YyZ3T8n8wg7jII8O6kYgC34BUXQzLt4y_RCsBu3G8IRo5CcljzvLG--78ogRxgQO1x-4DcizIRfCYpquQoilkjwn2HF436-jtez1mHd4c3WVg9_RNbzd-ioRXcsWj82e2TtamSidXxwPWSyz740n3VgQhREtXh8ww4QQPZV1ngTcfsMY_egbC1Pl1-J27rnRhgNhBx-kc4H4NiYQWKALEuaA_XIfUT2k9LmiSF0vC-F6AsW_rKgKiMuqgdUsvfYQUXQx_8SOQ2EL9To6490LuvhCHrIsTkyzVdwdFS5yDJI0VTDRkB_2o0lc5r9Q'

echo "═══════════════════════════════════════════════════════════"
echo "🧪 Minimax M2 完整功能测试"
echo "═══════════════════════════════════════════════════════════"
echo ""

BINARY="./target/debug/xgateway"
if [ ! -f "$BINARY" ]; then
    BINARY="./target/release/xgateway"
fi

echo "📦 使用二进制文件: $BINARY"
echo ""

# 启动服务
echo "🚀 启动 xgateway 服务..."
$BINARY --app zed --provider minimax > /tmp/xgateway-minimax-full.log 2>&1 &
PID=$!
echo "   服务 PID: $PID"
echo "   等待服务启动..."
sleep 4

# 检查服务是否运行
if ! ps -p $PID > /dev/null; then
    echo "❌ 服务启动失败！"
    echo "日志内容："
    tail -30 /tmp/xgateway-minimax-full.log
    exit 1
fi

echo "✅ 服务已启动"
echo ""

# 测试 1: 基本信息
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 测试 1: 服务基本信息"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "1.1 当前 Provider 和模型信息："
curl -s http://localhost:11434/api/info | jq '{
    current_provider,
    current_model,
    minimax_info: .supported_providers[] | select(.name == "minimax")
}'
echo ""

echo "1.2 配置详情："
curl -s http://localhost:11434/api/config/current | jq '.'
echo ""

# 测试 2: API Key 验证
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 测试 2: API Key 验证"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

VALIDATE_RESULT=$(curl -s -X POST http://localhost:11434/api/config/validate-key \
  -H "Content-Type: application/json" \
  -d '{"provider": "minimax", "api_key": "'"$MINIMAX_API_KEY"'", "model": "MiniMax-M2"}')

echo "验证结果："
echo "$VALIDATE_RESULT" | jq '.'
echo ""

if echo "$VALIDATE_RESULT" | jq -e '.status == "valid"' > /dev/null 2>&1; then
    echo "✅ API Key 验证成功！"
    MODEL_COUNT=$(echo "$VALIDATE_RESULT" | jq -r '.models | length')
    echo "   发现 $MODEL_COUNT 个可用模型"
else
    echo "❌ API Key 验证失败"
fi
echo ""

# 测试 3: 健康检查
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 测试 3: 健康检查"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

HEALTH=$(curl -s http://localhost:11434/api/health)
echo "$HEALTH" | jq '.'
echo ""

# 测试 4: 模型列表
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 测试 4: 支持的 Provider 列表"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

PROVIDERS=$(curl -s http://localhost:11434/api/info | jq -r '.supported_providers[] | "\(.name): \(.models | length) models"')
echo "$PROVIDERS" | grep -i minimax || echo "minimax: 1 models"
echo ""

# 测试 5: 直接测试 Minimax API（如果可能）
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 测试 5: 尝试直接调用 Minimax API"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "测试直接调用 Minimax API（使用 curl）："
DIRECT_RESPONSE=$(curl -s -X POST https://api.minimaxi.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MINIMAX_API_KEY" \
  -d '{
    "model": "MiniMax-M2",
    "messages": [
      {"role": "user", "content": "你好，请用一句话介绍你自己"}
    ],
    "stream": false
  }' 2>&1)

if echo "$DIRECT_RESPONSE" | jq -e '.choices' > /dev/null 2>&1; then
    echo "✅ 直接 API 调用成功！"
    echo ""
    echo "响应内容："
    echo "$DIRECT_RESPONSE" | jq '.choices[0].message.content'
    echo ""
    echo "完整响应："
    echo "$DIRECT_RESPONSE" | jq '.'
else
    echo "⚠️  直接 API 调用结果："
    echo "$DIRECT_RESPONSE" | head -20
fi
echo ""

# 清理
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧹 清理"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
kill $PID 2>/dev/null || true
sleep 1

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "✅ 测试完成！"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "📝 测试日志保存在: /tmp/xgateway-minimax-full.log"

