#!/bin/bash

# Test Volcengine streaming functionality
# This script tests the fix for Volcengine streaming where content field was empty

set -e

echo "🧪 Testing Volcengine Streaming Fix"
echo "===================================="
echo ""

# Volcengine credentials must be provided via environment variables to avoid
# leaking sensitive information in the repository.
#
# Required:
#   VOLCENGINE_API_KEY   - Your Ark API key
#   VOLCENGINE_ENDPOINT  - Your Ark endpoint ID (ep-...)
# Optional:
#   VOLCENGINE_MODEL     - Logical model name used in requests (defaults to endpoint)

API_KEY="${VOLCENGINE_API_KEY:-}"
ENDPOINT="${VOLCENGINE_ENDPOINT:-}"
MODEL="${VOLCENGINE_MODEL:-$ENDPOINT}"

if [ -z "$API_KEY" ] || [ -z "$ENDPOINT" ]; then
  echo "❌ VOLCENGINE_API_KEY and VOLCENGINE_ENDPOINT must be set in the environment before running this test."
  exit 1
fi

echo "📋 Configuration:"
echo "  API Key: ${API_KEY:0:8}..."
echo "  Endpoint: $ENDPOINT"
echo "  Model: $MODEL"
echo ""

# Start xgateway server in background
echo "🚀 Starting xgateway server..."
cargo run -- \
  --protocols ollama \
  --provider volcengine \
  --model "$ENDPOINT" \
  --llm-api-key "$API_KEY" \
  > /tmp/xgateway-volcengine.log 2>&1 &

SERVER_PID=$!
echo "  Server PID: $SERVER_PID"

# Wait for server to start
echo "⏳ Waiting for server to start..."
sleep 3

# Function to cleanup on exit
cleanup() {
  echo ""
  echo "🧹 Cleaning up..."
  kill $SERVER_PID 2>/dev/null || true
  wait $SERVER_PID 2>/dev/null || true
  echo "✅ Cleanup complete"
}
trap cleanup EXIT

# Test streaming
echo ""
echo "📡 Testing streaming chat..."
echo "  Request: '用一句话介绍一下你自己'"
echo ""

RESPONSE=$(curl -s -N http://localhost:11434/api/chat \
  -H "Content-Type: application/json" \
  -d "{
    \"model\": \"$ENDPOINT\",
    \"messages\": [{\"role\": \"user\", \"content\": \"用一句话介绍一下你自己\"}],
    \"stream\": true
  }")

echo "📦 Response:"
echo "$RESPONSE" | head -20
echo ""

# Check if we got chunks with content
CHUNK_COUNT=$(echo "$RESPONSE" | grep -c '"done":false' || true)
CONTENT_COUNT=$(echo "$RESPONSE" | grep -c '"content":"' | grep -v '""' || true)

echo "📊 Results:"
echo "  Total chunks: $CHUNK_COUNT"
echo "  Chunks with content: $CONTENT_COUNT"
echo ""

if [ "$CHUNK_COUNT" -gt 0 ] && [ "$CONTENT_COUNT" -gt 0 ]; then
  echo "✅ SUCCESS: Streaming is working! Got $CONTENT_COUNT chunks with content"
  exit 0
else
  echo "❌ FAILURE: Streaming not working properly"
  echo ""
  echo "📋 Server logs:"
  tail -50 /tmp/xgateway-volcengine.log
  exit 1
fi

