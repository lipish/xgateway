# 🚀 Zed + 阿里云 Qwen3-Coder-Plus 配置指南

本指南将帮助你在 Zed 编辑器中配置阿里云的 Qwen3-Coder-Plus 模型，这是一个专门针对代码任务优化的强大 AI 模型。

## 🎯 为什么选择 Qwen3-Coder-Plus？

- **🔥 代码专用优化** - 专门针对编程任务训练
- **📚 262K 超长上下文** - 可以处理大型代码库
- **🛠️ 工具调用支持** - 完美支持 Zed 的 Function Calling
- **🌐 中英文双语** - 适合中国开发者
- **⚡ 快速响应** - 适合实时编程辅助
- **💰 成本效益** - 相比 GPT-4 更经济

## 📋 前置要求

1. **获取阿里云 API 密钥**
   - 访问 [阿里云 DashScope](https://dashscope.aliyun.com/)
   - 注册账号并获取 API 密钥
   - 确保账户有足够余额

2. **安装 Zed 编辑器**
   - 访问 [Zed 官网](https://zed.dev/) 下载安装

3. **克隆 xgateway 项目**
   ```bash
   git clone https://github.com/lipish/xgateway.git
   cd xgateway
   ```

## 🚀 快速启动

### 方法一：使用通用切换脚本（推荐）

```bash
# 阿里云 Qwen3-Coder-Plus（默认）
./scripts/switch-provider.sh aliyun "your-api-key"

# 指定其他模型
./scripts/switch-provider.sh aliyun "your-api-key" qwen3-max

# 自定义端口
./scripts/switch-provider.sh aliyun "your-api-key" qwen3-coder-plus 18000
```

## ⚙️ Zed 配置步骤

### 1. 启动 xgateway 服务

```bash
./scripts/switch-provider.sh aliyun "your-aliyun-api-key"
```

看到以下输出表示启动成功：
```
🚀 启动 Zed + 阿里云 Qwen3-Coder-Plus 服务
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 提供商: 阿里云 DashScope
🤖 模型:   qwen3-coder-plus
🌐 端口:   11434
🔗 协议:   Ollama (兼容 Zed)
```

### 2. 配置 Zed

1. **打开 Zed 设置**
   - macOS: `Cmd + ,`
   - Windows/Linux: `Ctrl + ,`

2. **找到 Language Models 设置**
   - 在设置界面搜索 "Language Models" 或 "AI"

3. **配置 Ollama 提供商**
   ```json
   {
     "language_models": {
       "ollama": {
         "api_url": "http://localhost:11434",
         "low_speed_timeout_in_seconds": 30
       }
     }
   }
   ```

4. **选择模型**
   - 在 Zed 的 AI 助手面板中
   - 点击模型选择器
   - 选择 `qwen3-coder-plus`

### 3. 验证配置

1. **测试连接**
   - 在 Zed 中打开 AI 助手面板
   - 发送一条测试消息："Hello, are you working?"

2. **测试代码功能**
   - 请求生成一个 Python 函数
   - 测试代码解释功能
   - 尝试代码重构建议

## 🧪 功能测试

运行测试脚本验证所有功能：

```bash
./scripts/test-qwen3-coder.sh "your-aliyun-api-key"
```

测试内容包括：
- ✅ 基本连接测试
- ✅ Python 代码生成
- ✅ JavaScript 代码生成  
- ✅ 代码解释功能
- ✅ 工具调用支持
- ✅ 中文编程支持

## 🎨 可用的 Qwen 模型

| 模型名称 | 特点 | 适用场景 |
|---------|------|----------|
| `qwen3-coder-plus` | 代码专用，262K 上下文 ⭐ | 编程任务、代码生成 |
| `qwen3-max` | 最强性能，262K 上下文 | 复杂推理、大型项目 |
| `qwen-plus` | 增强版本，平衡性能 | 日常编程辅助 |
| `qwen-turbo` | 快速响应版本 | 简单查询、快速补全 |

## 🔧 故障排除

### 常见问题

1. **端口被占用**
   ```bash
   # 检查端口占用
   lsof -i :11434
   
   # 使用其他端口
   ./scripts/switch-provider.sh aliyun "your-api-key" qwen3-coder-plus 18000
   ```

2. **API 密钥错误**
   - 确保 API 密钥正确
   - 检查阿里云账户余额
   - 验证 DashScope 服务状态

3. **Zed 无法连接**
   - 确认 xgateway 服务正在运行
   - 检查防火墙设置
   - 重启 Zed 编辑器

4. **模型响应慢**
   ```bash
   # 启用调试日志
   RUST_LOG=debug ./scripts/switch-provider.sh aliyun "your-api-key"
   ```

### 日志分析

```bash
# 查看服务日志
tail -f /tmp/qwen3-coder-test.log

# 查看错误信息
grep -i error /tmp/qwen3-coder-test.log
```

## 💡 使用技巧

### 1. 优化提示词
```
# 好的提示词示例
"请用 Python 写一个快速排序算法，包含详细注释"

# 避免模糊的提示词
"写个排序"
```

### 2. 利用长上下文
- Qwen3-Coder-Plus 支持 262K 上下文
- 可以一次性处理大型代码文件
- 适合代码重构和架构分析

### 3. 中英文混合使用
```
"Explain this Python code in Chinese: 
def fibonacci(n): ..."
```

## 📊 性能对比

| 特性 | Qwen3-Coder-Plus | GPT-4o | Claude 3.5 |
|------|------------------|--------|------------|
| 代码生成 | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| 中文支持 | ⭐⭐⭐ | ⭐⭐ | ⭐⭐ |
| 响应速度 | ⭐⭐⭐ | ⭐⭐ | ⭐⭐ |
| 成本效益 | ⭐⭐⭐ | ⭐ | ⭐⭐ |
| 上下文长度 | 262K | 128K | 200K |

## 🔗 相关链接

- [阿里云 DashScope](https://dashscope.aliyun.com/)
- [Qwen3 模型文档](https://help.aliyun.com/zh/model-studio/models)
- [Zed 编辑器](https://zed.dev/)
- [xgateway 项目](https://github.com/lipish/xgateway)

---

🎉 现在你可以在 Zed 中享受 Qwen3-Coder-Plus 带来的强大代码辅助功能了！
