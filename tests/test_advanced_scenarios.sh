#!/bin/bash
set -e

# --- Configuration ---
DB_NAME=${DB_NAME:-"xgateway_new"}
BASE_URL=${BASE_URL:-"http://127.0.0.1:3010"}
PG_CMD="/opt/homebrew/opt/postgresql@18/bin/psql -X $DB_NAME"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "--------------------------------------------------------"
echo "XGateway Advanced E2E Scenarios (RoundRobin & Fallback)"
echo "--------------------------------------------------------"

# 1. Setup Data for Scenario A: RoundRobin
# We use two real providers (5 and 11) but put them in a RoundRobin key
echo "Setting up RoundRobin Key (Providers 5 & 11)..."
$PG_CMD -c "
BEGIN;
DELETE FROM api_keys WHERE name = 'e2e-roundrobin-key';
INSERT INTO api_keys (project_id, key_hash, name, scope, protocol, provider_ids, strategy, status)
VALUES (1, 'sk-rr-20260307', 'e2e-roundrobin-key', 'instance', 'openai', '[5,11]', 'RoundRobin', 'active');
COMMIT;
" > /dev/null

# 2. Setup Data for Scenario B: Fallback
# We create a dummy invalid provider (777) and a real one (5) as fallback.
# Note: provider_ids = [777], strategy = 'Priority', fallback_chain = '5'
echo "Setting up Fallback Key (Invalid 777 -> Valid 5)..."
$PG_CMD -c "
BEGIN;
DELETE FROM api_keys WHERE name = 'e2e-fallback-key';
DELETE FROM providers WHERE id = 777;
INSERT INTO providers (id, name, type, config, enabled, priority, version)
VALUES (777, 'invalid-provider', 'openai_compatible', '{\"model\":\"gpt-fake\",\"api_key\":\"wrong-key\",\"base_url\":\"https://api.openai.com/v1\"}', true, 100, 0);
INSERT INTO api_keys (project_id, key_hash, name, scope, protocol, provider_ids, strategy, status)
VALUES (1, 'sk-fb-20260307', 'e2e-fallback-key', 'instance', 'openai', '[777,5]', 'Priority', 'active');
COMMIT;
" > /dev/null

# --- TEST CASE 1: RoundRobin Verification ---
echo -e "\n[TEST 1] Verifying RoundRobin (Expect alternating providers)..."
# We'll make 3 requests and check logs or response signatures
for i in 1 2 3; do
    resp=$(curl -s -X POST "$BASE_URL/v1/chat/completions" \
        -H "Authorization: Bearer sk-rr-20260307" \
        -H "Content-Type: application/json" \
        -d "{
            \"model\": \"gpt-5.2\",
            \"messages\": [{\"role\": \"user\", \"content\": \"RR test $i\"}]
        }")
    echo "Request $i: Received Response"
done

# Check request_logs for the last 3 requests of this key
echo "Last 3 Providers used for sk-rr-20260307 (checking via api_key_id):"
AK_ID=$($PG_CMD -Aqt -c "SELECT id FROM api_keys WHERE name = 'e2e-roundrobin-key' LIMIT 1")
$PG_CMD -Aqt -c "
SELECT provider_id FROM request_logs 
WHERE api_key_id = $AK_ID 
ORDER BY created_at DESC LIMIT 3;"

# --- TEST CASE 2: Fallback Verification ---
echo -e "\n[TEST 2] Verifying Fallback (777 fails -> 5 succeeds)..."
# Request should succeed even though the first provider is invalid
resp_fb=$(curl -s -i -X POST "$BASE_URL/v1/chat/completions" \
    -H "Authorization: Bearer sk-fb-20260307" \
    -H "Content-Type: application/json" \
    -d '{
        "model": "gpt-5.2",
        "messages": [{"role": "user", "content": "Fallback test."}]
    }')

http_code=$(echo "$resp_fb" | head -n 1 | awk '{print $2}')
if [ "$http_code" == "200" ]; then
    echo -e "${GREEN}SUCCESS${NC}: Request succeeded via fallback."
    echo "Logs for this request (expecting failure on 777 and success on 5):"
    AK_FB_ID=$($PG_CMD -Aqt -c "SELECT id FROM api_keys WHERE name = 'e2e-fallback-key' LIMIT 1")
    $PG_CMD -c "
    SELECT provider_id, status, error_message FROM request_logs 
    WHERE api_key_id = $AK_FB_ID 
    ORDER BY created_at DESC LIMIT 2;"
else
    echo -e "${RED}FAILED${NC}: HTTP $http_code"
    echo "$resp_fb" | tail -n 5
fi

# --- TEST CASE 3: Error Propagation (401) ---
echo -e "\n[TEST 3] Verifying Error Propagation (Single invalid provider -> 401)..."
# Key with only invalid provider, no fallback
$PG_CMD -c "
BEGIN;
DELETE FROM api_keys WHERE name = 'e2e-error-key';
INSERT INTO api_keys (project_id, key_hash, name, scope, protocol, provider_ids, strategy, status)
VALUES (1, 'sk-err-20260307', 'e2e-error-key', 'instance', 'openai', '[777]', 'Priority', 'active');
COMMIT;
" > /dev/null

resp_err=$(curl -s -X POST "$BASE_URL/v1/chat/completions" \
    -H "Authorization: Bearer sk-err-20260307" \
    -H "Content-Type: application/json" \
    -d '{
        "model": "gpt-5.2",
        "messages": [{"role": "user", "content": "Error test."}]
    }')

echo "Response Body (Expect OpenAI error format):"
echo "$resp_err" | grep -o '\"message\":[^,]*' || echo "$resp_err"

echo -e "\nDone."
