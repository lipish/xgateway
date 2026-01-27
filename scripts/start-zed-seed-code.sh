#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  cat <<'USAGE'
用法：scripts/start-zed-seed-code.sh <VOLCENGINE_API_KEY> [附加 xgateway 参数]
示例：scripts/start-zed-seed-code.sh "ark-xxx" --port 18000

该脚本会以 Ollama 协议启动 Zed 服务，后端使用 Volcengine Doubao Seed Code（逻辑名 doubao-seed-code-preview-latest）。
如需映射到具体 ep- 接入点，请在仓库根目录配置 model-overrides.yaml。
USAGE
  exit 1
fi

VOLCENGINE_API_KEY="$1"
shift

XGATEWAY_BIN=${XGATEWAY_BIN:-"./target/release/xgateway"}

if [[ ! -x "${XGATEWAY_BIN}" ]]; then
  echo "🔧 未找到 ${XGATEWAY_BIN}，正在执行 cargo build --release..."
  cargo build --release
fi
MODEL=${MODEL:-"doubao-seed-code-preview-latest"}

args=("$@")
user_model_flag=false
for ((i=0; i<${#args[@]}; i++)); do
  case "${args[$i]}" in
    --model|--model=*)
      user_model_flag=true
      break
      ;;
  esac
done

cmd=(
  "${XGATEWAY_BIN}"
  --app zed
  --protocols ollama
  --provider volcengine
  --llm-api-key "${VOLCENGINE_API_KEY}"
)

if [[ "${user_model_flag}" != true ]]; then
  cmd+=(--model "${MODEL}")
fi

cmd+=("${args[@]}")

exec "${cmd[@]}"
