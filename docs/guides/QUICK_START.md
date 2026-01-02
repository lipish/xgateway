# 🚀 快速启动指南

## 3 步快速启动

### 第 1 步：设置 MiniMax API Key

```bash
export MINIMAX_API_KEY="your-actual-minimax-api-key"
```

### 第 2 步：启动服务

```bash
cd /Users/xinference/github/llm-link
./scripts/start_service.sh
```

你会看到类似的输出：
```
🚀 Starting LLM Link proxy service
🌐 Server will bind to 0.0.0.0:11434
✅ LLM service initialized successfully
🎉 LLM Link proxy is listening on 0.0.0.0:11434
📡 Ready to accept connections!
```

### 第 3 步：测试服务（在另一个终端）

```bash
cd /Users/xinference/github/llm-link
./scripts/test_endpoints.sh
```

## 🎯 预期结果

所有 5 个测试都应该返回 200 OK：

- ✅ 健康检查 (`/health`)
- ✅ API 版本 (`/api/version`)
- ✅ 可用模型 (`/api/tags`)
- ✅ 聊天接口 (`/api/chat`)
- ✅ 模型详情 (`/api/show`)

## 🔧 在 Zed IDE 中配置

1. 打开 Zed IDE
2. 进入 Settings → Features → AI
3. 配置：
   - **URL**: `http://localhost:11434`
   - **Model**: `MiniMax-M2`
4. 保存设置

现在你可以在 Zed 中使用 AI 功能了！

## 🛑 停止服务

在启动服务的终端中按 `Ctrl+C`

## ❓ 常见问题

**Q: 如何获取 MiniMax API Key？**
A: 访问 https://www.minimaxi.com/ 注册并获取

**Q: 服务无法启动？**
A: 检查 `MINIMAX_API_KEY` 是否正确设置

**Q: 无法连接到服务？**
A: 检查防火墙设置，确保 11434 端口未被占用

**Q: 测试脚本无法运行？**
A: 确保已安装 curl 和 jq：
```bash
brew install curl jq
```

## 📚 相关文档

- `CLOSURE_EXPLANATION_SUMMARY.md` - 快速总结
- `UNDERSTANDING_CLOSURES.md` - 基础知识
- `AXUM_CLOSURE_EXPLANATION.md` - 详细概念
- `CLOSURE_VS_FUNCTION_EXAMPLES.md` - 代码示例

## ✨ 现在开始测试吧！

