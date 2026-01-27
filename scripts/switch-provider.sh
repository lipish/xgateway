#!/usr/bin/env bash
# 通用的 LLM 提供商切换脚本

set -euo pipefail

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_usage() {
  cat <<EOF
🔄 LLM 提供商切换脚本

用法：
  $0 <PROVIDER> <API_KEY> [MODEL] [PORT]

参数：
  PROVIDER - 提供商名称
  API_KEY  - API 密钥
  MODEL    - 模型名称 (可选，使用默认推荐模型)
  PORT     - 服务端口 (默认: 11434)

支持的提供商：
  openai     - OpenAI GPT 模型
  anthropic  - Anthropic Claude 模型
  zhipu      - 智谱 GLM 模型
  aliyun     - 阿里云通义千问模型
  volcengine - 火山引擎豆包模型
  tencent    - 腾讯混元模型
  moonshot   - 月之暗面 Kimi 模型

示例：
  $0 openai "sk-xxx"                                    # OpenAI GPT-4o
  $0 anthropic "sk-ant-xxx"                             # Claude 3.5 Sonnet
  $0 zhipu "your-key" glm-4.6                           # 智谱 GLM-4.6
  $0 aliyun "your-key" qwen3-max 18000                  # 阿里云，自定义端口

环境变量：
  RUST_LOG=debug  # 启用调试日志
EOF
}

if [[ $# -lt 2 ]]; then
  print_usage
  exit 1
fi

PROVIDER="$1"
API_KEY="$2"
MODEL="${3:-}"
PORT="${4:-11434}"

# 获取默认模型
get_default_model() {
    case $1 in
        "openai") echo "gpt-4o" ;;
        "anthropic") echo "claude-3-5-sonnet-20241022" ;;
        "zhipu") echo "glm-4.6" ;;
        "aliyun") echo "qwen3-coder-plus" ;;
        "volcengine") echo "doubao-seed-1.6" ;;
        "tencent") echo "hunyuan-turbos-latest" ;;
        "moonshot") echo "kimi-k2-turbo-preview" ;;
        "minimax") echo "MiniMax-M2" ;;
        "longcat") echo "LongCat-Flash-Chat" ;;
        *) echo "unknown" ;;
    esac
}

# 如果没有指定模型，使用默认模型
if [[ -z "$MODEL" ]]; then
    MODEL=$(get_default_model "$PROVIDER")
    if [[ "$MODEL" == "unknown" ]]; then
        echo -e "${RED}❌ 不支持的提供商: $PROVIDER${NC}"
        print_usage
        exit 1
    fi
fi

# 验证提供商
case $PROVIDER in
    openai|anthropic|zhipu|aliyun|volcengine|tencent|moonshot|minimax|longcat)
        ;;
    *)
        echo -e "${RED}❌ 不支持的提供商: $PROVIDER${NC}"
        print_usage
        exit 1
        ;;
esac

# 检查端口是否被占用
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo -e "${YELLOW}⚠️  警告：端口 $PORT 已被占用${NC}"
  echo "请停止占用该端口的服务或使用其他端口"
  exit 1
fi

XGATEWAY_BIN="./target/release/xgateway"

# 检查并构建 xgateway
if [[ ! -x "$XGATEWAY_BIN" ]]; then
  echo -e "${BLUE}🔧 构建 xgateway...${NC}"
  cargo build --release
fi

# 显示启动信息
echo -e "${GREEN}🚀 启动 $PROVIDER + Zed 服务${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "📋 提供商: ${GREEN}$PROVIDER${NC}"
echo -e "🤖 模型:   ${GREEN}$MODEL${NC}"
echo -e "🌐 端口:   ${GREEN}$PORT${NC}"
echo -e "🔗 协议:   ${GREEN}Ollama (兼容 Zed)${NC}"
echo -e "🔑 API:    ${GREEN}${API_KEY:0:12}...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}💡 在 Zed 中配置：${NC}"
echo -e "   1. 打开 Zed 设置"
echo -e "   2. 配置 LLM 服务器: http://localhost:$PORT"
echo -e "   3. 模型名称: $MODEL"
echo ""
echo -e "${YELLOW}🛑 停止服务: Ctrl+C${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# 启动服务
exec "$XGATEWAY_BIN" \
  --app zed \
  --protocols ollama \
  --provider "$PROVIDER" \
  --model "$MODEL" \
  --llm-api-key "$API_KEY" \
  --port "$PORT"
