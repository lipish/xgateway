#!/bin/bash

# Zhipu AI (z.ai) Connectivity Test Script

# 1. DNS Lookup
echo "--- 1. DNS Lookup for api.z.ai ---"
nslookup api.z.ai
echo ""

# 2. TCP Connectivity (Port 443)
echo "--- 2. TCP Port 443 Test (Wait 5s) ---"
nc -vz api.z.ai 443 2>&1
echo ""

# 3. TLS Handshake Test
echo "--- 3. TLS Handshake Test ---"
openssl s_client -connect api.z.ai:443 -servername api.z.ai </dev/null 2>/dev/null | grep -E "Protocol|Cipher|Verification"
if [ $? -ne 0 ]; then
    echo "TLS Handshake Failed or was reset."
else
    echo "TLS Handshake Successful."
fi
echo ""

# 4. Basic HTTP Get (No Auth)
echo "--- 4. HTTP GET (No Auth) ---"
curl -iv --noproxy '*' https://api.z.ai/api/paas/v4/chat/completions 2>&1 | grep -E "Connected to|HTTP/|error|SSL"
echo ""

# 5. Full API Call (Optional - Requires ZHIPU_API_KEY)
if [ -f .env ]; then
    source .env
fi

if [ -n "$ZHIPU_API_KEY" ]; then
    echo "--- 5. Direct API Call with Key ---"
    MODEL=${ZHIPU_MODEL:-"glm-4"}
    curl --noproxy '*' -X POST "https://api.z.ai/api/paas/v4/chat/completions" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ZHIPU_API_KEY" \
        -d "{
            \"model\": \"$MODEL\",
            \"messages\": [{\"role\": \"user\", \"content\": \"hi\"}],
            \"stream\": false
        }" -w "\nHTTP_CODE: %{http_code}\n"
else
    echo "--- 5. Skip API Call (ZHIPU_API_KEY not found in .env) ---"
fi
