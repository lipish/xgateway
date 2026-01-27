#!/usr/bin/env bash
# Zed + 阿里云 Qwen3-Coder-Plus 快速启动脚本

set -euo pipefail

# 默认配置
DEFAULT_MODEL="qwen3-coder-plus"
DEFAULT_PORT="11434"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_usage() {
  cat <<EOF
🚀 Zed + 阿里云 Qwen3-Coder-Plus 快速启动脚本

用法：
  $0 <API_KEY>                    # 使用默认配置启动
  $0 <API_KEY> <MODEL>            # 指定模型启动
  $0 <API_KEY> <MODEL> <PORT>     # 指定模型和端口启动

参数：
  API_KEY  - 阿里云 DashScope API 密钥
  MODEL    - Qwen 模型名称 (默认: $DEFAULT_MODEL)
  PORT     - 服务端口 (默认: $DEFAULT_PORT)

常用模型：
  qwen3-coder-plus    - 代码专用模型，推荐用于编程任务 ⭐
  qwen3-max           - 最强性能，262K 上下文
  qwen-plus           - 增强版本，平衡性能
  qwen-turbo          - 快速响应版本

示例：
  $0 "your-api-key"                           # 默认配置
  $0 "your-api-key" qwen3-max                 # 使用最强模型
  $0 "your-api-key" qwen3-coder-plus 18000    # 自定义端口

环境变量：
  RUST_LOG=debug  # 启用调试日志

获取 API 密钥：
  https://dashscope.aliyun.com/
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
echo -e "${GREEN}🚀 启动 Zed + 阿里云 Qwen3-Coder-Plus 服务${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "📋 提供商: ${GREEN}阿里云 DashScope${NC}"
echo -e "🤖 模型:   ${GREEN}$MODEL${NC}"
echo -e "🌐 端口:   ${GREEN}$PORT${NC}"
echo -e "🔗 协议:   ${GREEN}Ollama (兼容 Zed)${NC}"
echo -e "🔑 API:    ${GREEN}${API_KEY:0:8}...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}💡 在 Zed 中配置：${NC}"
echo -e "   1. 打开 Zed 设置 (${BLUE}Cmd/Ctrl + ,${NC})"
echo -e "   2. 找到 ${BLUE}Language Models${NC} 设置"
echo -e "   3. 配置："
echo -e "      • ${BLUE}Provider${NC}: Ollama"
echo -e "      • ${BLUE}API URL${NC}: http://localhost:$PORT"
echo -e "      • ${BLUE}Model${NC}: $MODEL"
echo ""
echo -e "${YELLOW}🎯 Qwen3-Coder-Plus 特性：${NC}"
echo -e "   • 🔥 专门针对代码任务优化"
echo -e "   • 📚 262K 超长上下文"
echo -e "   • 🛠️  支持工具调用 (Function Calling)"
echo -e "   • 🌐 中英文双语支持"
echo -e "   • ⚡ 快速响应，适合实时编程辅助"
echo ""
echo -e "${YELLOW}🛑 停止服务: Ctrl+C${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# 启动服务
exec "$XGATEWAY_BIN" \
  --app zed \
  --protocols ollama \
  --provider aliyun \
  --model "$MODEL" \
  --llm-api-key "$API_KEY" \
  --port "$PORT"
