#!/bin/bash

BASE_URL="http://localhost:3000"

echo "=== Strict Provider Access Control Tests ==="
echo ""

# Test 1: No provider_id - should fail
echo "Test 1: Missing provider_id (should fail with 400)"
curl -s -X POST "$BASE_URL/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-link-bdcdf3baeac1460dbd2297394761c99a" \
  -d '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "hello"}],
    "stream": false
  }' | jq .

echo ""
echo "---"
echo ""

# Test 2: API key "two" (allowed: 1,2) with provider_id=1 - should succeed
echo "Test 2: API key 'two' with provider_id=1 (allowed - should succeed)"
curl -s -X POST "$BASE_URL/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-link-242893e9229f4d6e821148704c71f51a" \
  -d '{
    "model": "test",
    "messages": [{"role": "user", "content": "hello"}],
    "stream": false,
    "provider_id": 1
  }' | jq -c '{success: (if .error then false else true end), provider: (.model // "error"), error: .error.type}'

echo ""
echo "---"
echo ""

# Test 3: API key "two" (allowed: 1,2) with provider_id=2 - should succeed
echo "Test 3: API key 'two' with provider_id=2 (allowed - should succeed)"
curl -s -X POST "$BASE_URL/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-link-242893e9229f4d6e821148704c71f51a" \
  -d '{
    "model": "test",
    "messages": [{"role": "user", "content": "hello"}],
    "stream": false,
    "provider_id": 2
  }' | jq -c '{success: (if .error then false else true end), provider: (.model // "error"), error: .error.type}'

echo ""
echo "---"
echo ""

# Test 4: API key "two" (allowed: 1,2) with provider_id=3 - should fail
echo "Test 4: API key 'two' with provider_id=3 (NOT allowed - should fail with 403)"
curl -s -X POST "$BASE_URL/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-link-242893e9229f4d6e821148704c71f51a" \
  -d '{
    "model": "test",
    "messages": [{"role": "user", "content": "hello"}],
    "stream": false,
    "provider_id": 3
  }' | jq .

echo ""
echo "---"
echo ""

# Test 5: API key "two" (allowed: 1,2) with provider_id=4 - should fail
echo "Test 5: API key 'two' with provider_id=4 (NOT allowed - should fail with 403)"
curl -s -X POST "$BASE_URL/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-link-242893e9229f4d6e821148704c71f51a" \
  -d '{
    "model": "test",
    "messages": [{"role": "user", "content": "hello"}],
    "stream": false,
    "provider_id": 4
  }' | jq .

echo ""
echo "---"
echo ""

# Test 6: API key "two" (allowed: 1,2) with provider_id=5 - should fail
echo "Test 6: API key 'two' with provider_id=5 (NOT allowed - should fail with 403)"
curl -s -X POST "$BASE_URL/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-link-242893e9229f4d6e821148704c71f51a" \
  -d '{
    "model": "test",
    "messages": [{"role": "user", "content": "hello"}],
    "stream": false,
    "provider_id": 5
  }' | jq .

echo ""
echo "---"
echo ""

# Test 7: API key "one" (allowed: 4) with provider_id=4 - should succeed
echo "Test 7: API key 'one' with provider_id=4 (allowed - should succeed)"
curl -s -X POST "$BASE_URL/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-link-35892ebbabfb4c38914789d54ec92bf0" \
  -d '{
    "model": "test",
    "messages": [{"role": "user", "content": "hello"}],
    "stream": false,
    "provider_id": 4
  }' | jq -c '{success: (if .error then false else true end), provider: (.model // "error"), error: .error.type}'

echo ""
echo "---"
echo ""

# Test 8: API key "one" (allowed: 4) with provider_id=1 - should fail
echo "Test 8: API key 'one' with provider_id=1 (NOT allowed - should fail with 403)"
curl -s -X POST "$BASE_URL/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-link-35892ebbabfb4c38914789d54ec92bf0" \
  -d '{
    "model": "test",
    "messages": [{"role": "user", "content": "hello"}],
    "stream": false,
    "provider_id": 1
  }' | jq .

echo ""
echo "---"
echo ""

# Test 9: API key "all" (global scope) with any provider - should succeed
echo "Test 9: API key 'all' (global) with provider_id=3 (should succeed)"
curl -s -X POST "$BASE_URL/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-link-bdcdf3baeac1460dbd2297394761c99a" \
  -d '{
    "model": "test",
    "messages": [{"role": "user", "content": "hello"}],
    "stream": false,
    "provider_id": 3
  }' | jq -c '{success: (if .error then false else true end), provider: (.model // "error"), error: .error.type}'

echo ""
echo "---"
echo ""

# Test 10: Invalid API key - should fail
echo "Test 10: Invalid API key (should fail with 401)"
curl -s -X POST "$BASE_URL/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-link-invalid" \
  -d '{
    "model": "test",
    "messages": [{"role": "user", "content": "hello"}],
    "stream": false,
    "provider_id": 1
  }' | jq .

echo ""
echo "---"
echo ""

# Test 11: No API key with provider_id - should succeed (backward compatibility)
echo "Test 11: No API key with provider_id=1 (should succeed)"
curl -s -X POST "$BASE_URL/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "test",
    "messages": [{"role": "user", "content": "hello"}],
    "stream": false,
    "provider_id": 1
  }' | jq -c '{success: (if .error then false else true end), provider: (.model // "error"), error: .error.type}'

echo ""
echo "=== Test Summary ==="
echo "Expected results:"
echo "  Test 1: FAIL (400 - missing_provider_id)"
echo "  Test 2: SUCCESS (provider 1 allowed)"
echo "  Test 3: SUCCESS (provider 2 allowed)"
echo "  Test 4: FAIL (403 - provider_access_denied)"
echo "  Test 5: FAIL (403 - provider_access_denied)"
echo "  Test 6: FAIL (403 - provider_access_denied)"
echo "  Test 7: SUCCESS (provider 4 allowed)"
echo "  Test 8: FAIL (403 - provider_access_denied)"
echo "  Test 9: SUCCESS (global access)"
echo "  Test 10: FAIL (401 - invalid_api_key)"
echo "  Test 11: SUCCESS (no auth required when no key)"
echo ""
