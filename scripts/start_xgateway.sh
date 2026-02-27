#!/bin/bash

# 设置错误时退出
set -e

# 检查是否安装了 PostgreSQL
if ! command -v psql &> /dev/null; then
    echo "Error: PostgreSQL is not installed or not in PATH."
    echo "Please install PostgreSQL first."
    exit 1
fi

# 设置环境变量
export DATABASE_URL="postgresql://$(whoami)@localhost:5432/xgateway_new"
export XTRACE_DATABASE_URL="postgresql://$(whoami)@localhost:5432/xtrace_new"
export XTRACE_BIND_ADDR="127.0.0.1:18745"

echo "Environment variables set:"
echo "DATABASE_URL=$DATABASE_URL"
echo "XTRACE_DATABASE_URL=$XTRACE_DATABASE_URL"
echo "XTRACE_BIND_ADDR=$XTRACE_BIND_ADDR"

# 检查并创建数据库
if ! psql -lqt | cut -d \| -f 1 | grep -qw xgateway_new; then
    echo "Creating database xgateway_new..."
    createdb xgateway_new
else
    echo "Database xgateway_new already exists."
fi

if ! psql -lqt | cut -d \| -f 1 | grep -qw xtrace_new; then
    echo "Creating database xtrace_new..."
    createdb xtrace_new
else
    echo "Database xtrace_new already exists."
fi

# 启动 xgateway
echo "Starting xgateway..."
# 使用 exec 替换当前 shell 进程，这样 Ctrl+C 会直接发送给 cargo run 进程
exec cargo run --bin xgateway -- --host 127.0.0.1 --port 3105
