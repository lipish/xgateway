#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"
API_KEY="${API_KEY:-}"
ALLOWED_PROVIDER_IDS="${ALLOWED_PROVIDER_IDS:-1,2}"
DENIED_PROVIDER_ID="${DENIED_PROVIDER_ID:-999999}"

if [[ -z "$API_KEY" ]]; then
  echo "ERROR: API_KEY is required"
  echo "Example: API_KEY=sk-link-xxx ALLOWED_PROVIDER_IDS=1,2 $0"
  exit 1
fi

call_models() {
  local provider_id="$1"
  if [[ -n "$provider_id" ]]; then
    curl -sS -w '\n%{http_code}' \
      -H "Authorization: Bearer $API_KEY" \
      "$BASE_URL/v1/models?provider_id=$provider_id"
  else
    curl -sS -w '\n%{http_code}' \
      -H "Authorization: Bearer $API_KEY" \
      "$BASE_URL/v1/models"
  fi
}

assert_allowed_provider() {
  local provider_id="$1"
  local response body status
  response="$(call_models "$provider_id")"
  body="$(printf '%s\n' "$response" | sed '$d')"
  status="$(printf '%s\n' "$response" | tail -n1)"

  if [[ "$status" != "200" ]]; then
    echo "FAIL: provider_id=$provider_id expected 200, got $status"
    echo "$body"
    exit 1
  fi

  local count
  count="$(printf '%s' "$body" | jq '.data | length')"
  if [[ "$count" -lt 1 ]]; then
    echo "FAIL: provider_id=$provider_id returned empty model list"
    echo "$body"
    exit 1
  fi

  echo "PASS: provider_id=$provider_id allowed, models=$count"
}

assert_denied_provider() {
  local provider_id="$1"
  local response body status err_type
  response="$(call_models "$provider_id")"
  body="$(printf '%s\n' "$response" | sed '$d')"
  status="$(printf '%s\n' "$response" | tail -n1)"

  if [[ "$status" != "403" ]]; then
    echo "FAIL: provider_id=$provider_id expected 403, got $status"
    echo "$body"
    exit 1
  fi

  err_type="$(printf '%s' "$body" | jq -r '.error.type // ""')"
  if [[ "$err_type" != "provider_access_denied" ]]; then
    echo "FAIL: expected error.type=provider_access_denied, got '$err_type'"
    echo "$body"
    exit 1
  fi

  echo "PASS: provider_id=$provider_id denied as expected"
}

echo "=== API key multi-instance binding test ==="
echo "BASE_URL=$BASE_URL"
echo "ALLOWED_PROVIDER_IDS=$ALLOWED_PROVIDER_IDS"
echo "DENIED_PROVIDER_ID=$DENIED_PROVIDER_ID"

echo "1) Validate each allowed provider_id"
IFS=',' read -r -a allowed_ids <<< "$ALLOWED_PROVIDER_IDS"
for id in "${allowed_ids[@]}"; do
  assert_allowed_provider "$id"
done

echo "2) Validate denied provider_id"
assert_denied_provider "$DENIED_PROVIDER_ID"

echo "3) Optional summary call without provider filter"
summary_resp="$(call_models "")"
summary_body="$(printf '%s\n' "$summary_resp" | sed '$d')"
summary_status="$(printf '%s\n' "$summary_resp" | tail -n1)"
summary_count="$(printf '%s' "$summary_body" | jq '.data | length')"
echo "Summary status=$summary_status, model_count=$summary_count"

echo "All checks passed."
