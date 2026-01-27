#!/bin/bash

# 部署验证脚本
# 用于在本地验证文档站点构建是否正常

set -e

echo "🚀 开始验证 XGateway 文档站点部署..."

# 检查 Node.js 版本
echo "📋 检查 Node.js 版本..."
node --version
npm --version

# 进入文档站点目录
cd docs-site

# 清理之前的构建
echo "🧹 清理之前的构建..."
rm -rf build .svelte-kit

# 安装依赖
echo "📦 安装依赖..."
npm ci

# 构建项目
echo "🔨 构建项目..."
npm run build

# 检查构建结果
echo "✅ 检查构建结果..."
if [ -d "build" ]; then
    echo "✅ 构建成功！"
    echo "📊 构建文件大小:"
    du -sh build/*
    
    echo "🌐 预览构建结果 (按 Ctrl+C 停止):"
    npm run preview
else
    echo "❌ 构建失败！"
    exit 1
fi
