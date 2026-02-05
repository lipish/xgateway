#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${XGATEWAY_BASE_URL:-http://xgateway.xinference.cn:3000}"
API_KEY="${XGATEWAY_API_KEY:-sk-link-6f71cf12c593454eb09bd659440bdd95}"
MODEL_CHAT="${XGATEWAY_CHAT_MODEL:-doubao-seed-1-6-lite-251015}"
STREAM_MODE="${XGATEWAY_STREAM_MODE:-false}"

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required" >&2
  exit 2
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required" >&2
  exit 2
fi

echo "Base URL: ${BASE_URL}"

echo "\n[1/2] GET /v1/models"
MODELS_JSON="$(curl -sS -H "Authorization: Bearer ${API_KEY}" "${BASE_URL}/v1/models")"
if ! echo "${MODELS_JSON}" | jq -e '.data | length > 0' >/dev/null; then
  echo "Models response missing data" >&2
  echo "${MODELS_JSON}" | jq -c '.' || true
  exit 1
fi

echo "OK: models listed"

echo "\n[2/2] POST /v1/chat/completions"
if [[ "${STREAM_MODE}" == "true" ]]; then
  echo "Streaming mode enabled"
  curl -sS --no-buffer -H "Authorization: Bearer ${API_KEY}" -H "Content-Type: application/json" \
    -d '{"model":"'"${MODEL_CHAT}"'","messages":[{"role":"user","content":"ping"}],"max_tokens":16,"stream":true}' \
    "${BASE_URL}/v1/chat/completions"
  echo "\nOK: stream completed"
else
  CHAT_JSON="$(curl -sS -H "Authorization: Bearer ${API_KEY}" -H "Content-Type: application/json" \
    -d '{"model":"'"${MODEL_CHAT}"'","messages":[{"role":"user","content":"ping"}],"max_tokens":16,"stream":false}' \
    "${BASE_URL}/v1/chat/completions")"

  echo "Chat response (raw):"
  echo "${CHAT_JSON}" | jq -c '.' || true

  echo "Chat response (content):"
  echo "${CHAT_JSON}" | jq -r '.choices[0].message.content // empty' || true

  if ! echo "${CHAT_JSON}" | jq -e '.choices[0].message.content' >/dev/null; then
    echo "Chat response missing message content" >&2
    echo "${CHAT_JSON}" | jq -c '.' || true
    exit 1
  fi
fi

echo "OK: chat completion returned"

echo "\nAll connectivity checks passed."
