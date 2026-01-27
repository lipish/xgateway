#!/usr/bin/env bash
# 快速启动 Zed + GLM-4 服务的简化脚本

set -euo pipefail

# 默认配置
DEFAULT_MODEL="glm-4.6"
DEFAULT_PORT="11434"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_usage() {
  cat <<EOF
🚀 Zed + GLM-4 快速启动脚本

用法：
  $0 <API_KEY>                    # 使用默认配置启动
  $0 <API_KEY> <MODEL>            # 指定模型启动
  $0 <API_KEY> <MODEL> <PORT>     # 指定模型和端口启动

参数：
  API_KEY  - 智谱 AI API 密钥
  MODEL    - GLM 模型名称 (默认: $DEFAULT_MODEL)
  PORT     - 服务端口 (默认: $DEFAULT_PORT)

常用模型：
  glm-4.6      - 最新旗舰，200K上下文，推荐用于代码任务 ⭐
  glm-4.5      - 强大推理，128K上下文
  glm-4.5-flash - 快速响应，适合简单对话
  glm-4.5-air  - 平衡性能与速度

示例：
  $0 "your-api-key"                           # 默认配置
  $0 "your-api-key" glm-4.5-flash             # 使用快速模型
  $0 "your-api-key" glm-4.6 18000             # 自定义端口

环境变量：
  RUST_LOG=debug  # 启用调试日志
EOF
}

if [[ $# -lt 1 ]]; then
  print_usage
  exit 1
fi

API_KEY="$1"
MODEL="${2:-$DEFAULT_MODEL}"
PORT="${3:-$DEFAULT_PORT}"

# 验证 API 密钥
if [[ -z "$API_KEY" || ${#API_KEY} -lt 10 ]]; then
  echo -e "${RED}❌ 错误：API 密钥无效${NC}"
  exit 1
fi

# 检查端口是否被占用
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo -e "${YELLOW}⚠️  警告：端口 $PORT 已被占用${NC}"
  echo "请使用其他端口或停止占用该端口的服务"
  exit 1
fi

XGATEWAY_BIN="./target/release/xgateway"

# 构建项目（如果需要）
if [[ ! -x "$XGATEWAY_BIN" ]]; then
  echo -e "${BLUE}🔧 构建 xgateway...${NC}"
  cargo build --release
fi

# 显示启动信息
echo -e "${GREEN}🚀 启动 Zed + GLM-4 服务${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "📋 提供商: ${GREEN}智谱 AI (ZhipuAI)${NC}"
echo -e "🤖 模型:   ${GREEN}$MODEL${NC}"
echo -e "🌐 端口:   ${GREEN}$PORT${NC}"
echo -e "🔗 协议:   ${GREEN}Ollama (兼容 Zed)${NC}"
echo -e "🔑 API:    ${GREEN}${API_KEY:0:8}...${NC}"
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
  --provider zhipu \
  --model "$MODEL" \
  --llm-api-key "$API_KEY" \
  --port "$PORT"
