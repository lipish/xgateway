#!/bin/bash

# XGateway Codex CLI Startup Script
# This script starts xgateway with proper configuration for Codex CLI integration
# 
# Usage: ./scripts/start-codex.sh
#
# Prerequisites:
# 1. Build xgateway: cargo build --release
# 2. Set your Aliyun API key as environment variable
# 3. Configure ~/.codex/config.toml (see documentation)

set -e

# Configuration - Modify these values as needed
ALIYUN_API_KEY="${ALIYUN_API_KEY}"
AUTH_TOKEN="${XGATEWAY_AUTH_TOKEN:-123456}"
MODEL="${MODEL:-qwen3-coder-plus}"
PROVIDER="${PROVIDER:-aliyun}"
PORT="${PORT:-8088}"
LOG_LEVEL="${LOG_LEVEL:-info}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting XGateway for Codex CLI...${NC}"
echo -e "${BLUE}========================================${NC}"

# Check if API key is provided
if [ -z "$ALIYUN_API_KEY" ]; then
    echo -e "${RED}❌ Error: ALIYUN_API_KEY environment variable is not set${NC}"
    echo -e "${YELLOW}💡 Please set your Aliyun API key:${NC}"
    echo -e "   export ALIYUN_API_KEY=\"your-aliyun-api-key\""
    echo -e "   ./scripts/start-codex.sh"
    exit 1
fi

# Check if binary exists
BINARY_PATH="./target/release/xgateway"
if [ ! -f "$BINARY_PATH" ]; then
    echo -e "${RED}❌ Error: xgateway binary not found at $BINARY_PATH${NC}"
    echo -e "${YELLOW}💡 Please build first: cargo build --release${NC}"
    exit 1
fi

# Display configuration
echo -e "${GREEN}📋 Configuration:${NC}"
echo -e "   Provider: ${YELLOW}$PROVIDER${NC}"
echo -e "   Model: ${YELLOW}$MODEL${NC}"
echo -e "   Port: ${YELLOW}$PORT${NC}"
echo -e "   Auth Token: ${YELLOW}$AUTH_TOKEN${NC}"
echo -e "   Log Level: ${YELLOW}$LOG_LEVEL${NC}"
echo -e "   API Key: ${YELLOW}***${ALIYUN_API_KEY: -8}${NC}"
echo ""

# Set NO_PROXY to avoid macOS system proxy issues
export NO_PROXY='*'

# Start xgateway
echo -e "${GREEN}🔧 Starting xgateway...${NC}"
echo ""

exec "$BINARY_PATH" \
    --app codex \
    --provider "$PROVIDER" \
    --api-key "$ALIYUN_API_KEY" \
    --model "$MODEL" \
    --auth-key "$AUTH_TOKEN" \
    --port "$PORT" \
    --log-level "$LOG_LEVEL"
