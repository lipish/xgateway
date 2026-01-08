#!/bin/bash

BASE_URL="http://localhost:3000"

echo "=== Testing API Key Access Control ==="
echo ""

# Test 1: API Key "all" - should access all models
echo "Test 1: API Key 'all' - Testing with gpt-4"
curl -s -X POST "$BASE_URL/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-link-bdcdf3baeac1460dbd2297394761c99a" \
  -d '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Say hello"}],
    "stream": false
  }' | jq .

echo ""
echo "---"
echo ""

# Test 2: API Key "two" - should access glm-4-flash and deepseek
echo "Test 2: API Key 'two' - Testing with glm-4-flash"
curl -s -X POST "$BASE_URL/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-link-242893e9229f4d6e821148704c71f51a" \
  -d '{
    "model": "glm-4-flash",
    "messages": [{"role": "user", "content": "Say hello"}],
    "stream": false
  }' | jq .

echo ""
echo "---"
echo ""

# Test 3: API Key "two" - should access deepseek
echo "Test 3: API Key 'two' - Testing with deepseek-chat"
curl -s -X POST "$BASE_URL/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-link-242893e9229f4d6e821148704c71f51a" \
  -d '{
    "model": "deepseek-chat",
    "messages": [{"role": "user", "content": "Say hello"}],
    "stream": false
  }' | jq .

echo ""
echo "---"
echo ""

# Test 4: API Key "two" - should NOT access gpt-4 (restricted)
echo "Test 4: API Key 'two' - Testing with gpt-4 (should fail)"
curl -s -X POST "$BASE_URL/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-link-242893e9229f4d6e821148704c71f51a" \
  -d '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Say hello"}],
    "stream": false
  }' | jq .

echo ""
echo "---"
echo ""

# Test 5: API Key "one" - should access deepseek-r1
echo "Test 5: API Key 'one' - Testing with deepseek-r1"
curl -s -X POST "$BASE_URL/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-link-35892ebbabfb4c38914789d54ec92bf0" \
  -d '{
    "model": "deepseek-r1",
    "messages": [{"role": "user", "content": "Say hello"}],
    "stream": false
  }' | jq .

echo ""
echo "---"
echo ""

# Test 6: API Key "one" - should NOT access gpt-4 (restricted)
echo "Test 6: API Key 'one' - Testing with gpt-4 (should fail)"
curl -s -X POST "$BASE_URL/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-link-35892ebbabfb4c38914789d54ec92bf0" \
  -d '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Say hello"}],
    "stream": false
  }' | jq .

echo ""
echo "---"
echo ""

# Test 7: Invalid API Key - should fail
echo "Test 7: Invalid API Key (should fail)"
curl -s -X POST "$BASE_URL/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-link-invalid-key" \
  -d '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Say hello"}],
    "stream": false
  }' | jq .

echo ""
echo "---"
echo ""

# Test 8: No API Key - should fail or use default behavior
echo "Test 8: No API Key"
curl -s -X POST "$BASE_URL/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Say hello"}],
    "stream": false
  }' | jq .

echo ""
echo "=== Tests Complete ==="
