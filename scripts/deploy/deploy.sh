#!/usr/bin/env bash
set -euo pipefail

DEPLOY_BASE="${DEPLOY_BASE:-/home/ubuntu/xgateway}"
GIT_SHA="${GITHUB_SHA:-}"
DEPLOY_RESTART_CMD="${DEPLOY_RESTART_CMD:-}"

REPO_DIR="${REPO_DIR:-/home/ubuntu/xgateway}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-master}"
APP_NAME="${APP_NAME:-xgateway}"
ENV_FILE="${ENV_FILE:-${DEPLOY_BASE}/.env}"
RUST_ENV_FILE="${RUST_ENV_FILE:-$HOME/.cargo/env}"
NVM_DIR="${NVM_DIR:-$HOME/.nvm}"

ensure_node() {
  if command -v npm >/dev/null 2>&1; then
    return 0
  fi

  if [ -s "${NVM_DIR}/nvm.sh" ]; then
    . "${NVM_DIR}/nvm.sh"
  fi

  if ! command -v npm >/dev/null 2>&1; then
    echo "npm not found; install Node.js/npm or make npm available in non-interactive shell" >&2
    echo "if you use nvm, ensure ${NVM_DIR}/nvm.sh exists and nvm has a default node version" >&2
    return 1
  fi
}

ensure_rust() {
  if command -v cargo >/dev/null 2>&1; then
    return 0
  fi

  if [ -f "${RUST_ENV_FILE}" ]; then
    . "${RUST_ENV_FILE}"
  fi

  if ! command -v cargo >/dev/null 2>&1; then
    echo "cargo not found; install Rust (rustup) and ensure cargo is in PATH" >&2
    return 1
  fi
}

restart_service() {
  if [ -n "${DEPLOY_RESTART_CMD}" ]; then
    bash -lc "${DEPLOY_RESTART_CMD}"
    return 0
  fi

  if ! command -v pm2 >/dev/null 2>&1; then
    echo "pm2 not found on server; install pm2 or set DEPLOY_RESTART_CMD" >&2
    return 1
  fi

  local start_cmd=""
  start_cmd="set -a; [ -f \"${ENV_FILE}\" ] && source \"${ENV_FILE}\"; set +a; exec \"${DEPLOY_BASE}/current/xgateway\""

  mkdir -p "${DEPLOY_BASE}/logs"

  if pm2 describe "${APP_NAME}" >/dev/null 2>&1; then
    pm2 restart "${APP_NAME}" --update-env
    return 0
  fi

  pm2 start /bin/bash \
    --name "${APP_NAME}" \
    --cwd "${DEPLOY_BASE}/current" \
    --output "${DEPLOY_BASE}/logs/${APP_NAME}.out.log" \
    --error "${DEPLOY_BASE}/logs/${APP_NAME}.err.log" \
    --merge-logs \
    --time \
    -- -lc "${start_cmd}"
}

deploy_from_tarball() {
  local tarball="${1}"

  if [ -z "${GIT_SHA}" ]; then
    local basename
    basename="$(basename "${tarball}")"
    case "${basename}" in
      xgateway-*.tar.gz)
        GIT_SHA="${basename#xgateway-}"
        GIT_SHA="${GIT_SHA%.tar.gz}"
        ;;
    esac
  fi

  if [ -z "${GIT_SHA}" ]; then
    echo "unable to determine GITHUB_SHA from env or tarball name" >&2
    exit 1
  fi

  local release_dir="${DEPLOY_BASE}/releases/${GIT_SHA}"
  mkdir -p "${release_dir}"
  tar -xzf "${tarball}" -C "${release_dir}" --strip-components=1

  chmod +x "${release_dir}/xgateway"
  ln -sfn "${release_dir}" "${DEPLOY_BASE}/current"
  mkdir -p "${DEPLOY_BASE}/logs"

  restart_service
}

deploy_from_repo() {
  local repo_root=""
  if repo_root="$(git rev-parse --show-toplevel 2>/dev/null)"; then
    :
  elif [ -d "${REPO_DIR}/.git" ]; then
    repo_root="${REPO_DIR}"
  else
    echo "not in a git repo and REPO_DIR not found: ${REPO_DIR}" >&2
    exit 1
  fi

  export GIT_TERMINAL_PROMPT=0
  cd "${repo_root}"
  git fetch origin --prune

  if [ -n "${GIT_SHA}" ]; then
    git checkout --detach "${GIT_SHA}"
    git reset --hard "${GIT_SHA}"
  else
    git checkout "${DEPLOY_BRANCH}"
    git reset --hard "origin/${DEPLOY_BRANCH}"
    GIT_SHA="$(git rev-parse HEAD)"
  fi

  ensure_node
  (cd admin && npm ci && npm run build)
  ensure_rust
  cargo build --release

  local release_dir="${DEPLOY_BASE}/releases/${GIT_SHA}"
  mkdir -p "${release_dir}/admin"
  cp target/release/xgateway "${release_dir}/"
  cp -R admin/dist "${release_dir}/admin/"

  chmod +x "${release_dir}/xgateway"
  ln -sfn "${release_dir}" "${DEPLOY_BASE}/current"
  mkdir -p "${DEPLOY_BASE}/logs"

  restart_service
}

if [ $# -ge 1 ]; then
  deploy_from_tarball "${1}"
else
  deploy_from_repo
fi
