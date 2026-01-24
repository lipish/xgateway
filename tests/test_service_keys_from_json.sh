#!/bin/bash
set -euo pipefail

BASE_URL="${LLM_LINK_BASE_URL:-http://127.0.0.1:3000}"
KEYS_JSON="${LLM_LINK_KEYS_JSON:-}"

if [[ -z "${KEYS_JSON}" || ! -f "${KEYS_JSON}" ]]; then
  echo "SKIP: set LLM_LINK_KEYS_JSON to exported service keys JSON (e.g. /Users/xinference/Downloads/keys.json)"
  exit 0
fi

if ! python3 -c "import requests" >/dev/null 2>&1; then
  echo "SKIP: python dependency 'requests' is not installed"
  exit 0
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

OUT=$(python3 "${ROOT_DIR}/scripts/test-service-keys-from-json.py" \
  --base-url "${BASE_URL}" \
  --keys-json "${KEYS_JSON}" \
  --max-keys-per-service 1 \
  --timeout 30 \
  --sleep 0 || true)

echo "${OUT}"

SUMMARY_LINE=$(echo "${OUT}" | tail -n 1)
if [[ "${SUMMARY_LINE}" =~ ^overall_ok=([0-9]+)/([0-9]+)$ ]]; then
  OK_CNT="${BASH_REMATCH[1]}"
  TOTAL_CNT="${BASH_REMATCH[2]}"
  if [[ "${OK_CNT}" == "${TOTAL_CNT}" ]]; then
    exit 0
  fi
fi

exit 1
