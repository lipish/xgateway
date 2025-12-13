import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Header } from "@/components/layout/header"
import { Badge } from "@/components/ui/badge"
import { Book, Code, MessageCircle, Github } from "lucide-react"

export function HelpPage() {
  return (
    <div className="flex flex-col">
      <Header title="帮助中心" description="LLM Link 使用指南和文档" />
      <div className="flex-1 space-y-6 p-6 max-w-[1600px] mx-auto w-full">
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Book className="h-5 w-5" /> 快速开始
              </CardTitle>
              <CardDescription>了解如何配置和使用 LLM Link</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium">1. 添加 Provider</h4>
                <p className="text-sm text-muted-foreground">在 Providers 页面添加您的 AI 服务提供商配置，包括 API Key 和模型设置。</p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">2. 配置负载均衡</h4>
                <p className="text-sm text-muted-foreground">在设置页面选择合适的负载均衡策略，如轮询、最少连接或基于延迟。</p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">3. 创建 API Key</h4>
                <p className="text-sm text-muted-foreground">生成 API Key 用于客户端访问 LLM Link 网关。</p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">4. 发送请求</h4>
                <p className="text-sm text-muted-foreground">使用 OpenAI 兼容格式向网关发送请求，系统会自动路由到可用的 Provider。</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" /> API 使用示例
              </CardTitle>
              <CardDescription>常用 API 调用示例</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Chat Completions</h4>
                  <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`curl -X POST http://localhost:3000/v1/chat/completions \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-4",
    "messages": [
      {"role": "user", "content": "Hello!"}
    ]
  }'`}
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                支持的 Providers
              </CardTitle>
              <CardDescription>LLM Link 支持的 AI 服务提供商</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Badge>OpenAI</Badge>
                <Badge>Anthropic</Badge>
                <Badge>智谱 (Zhipu)</Badge>
                <Badge>阿里云 (Aliyun)</Badge>
                <Badge>百度 (Baidu)</Badge>
                <Badge>腾讯 (Tencent)</Badge>
                <Badge>火山引擎 (Volcengine)</Badge>
                <Badge>Minimax</Badge>
                <Badge>DeepSeek</Badge>
                <Badge>Moonshot</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                核心功能
              </CardTitle>
              <CardDescription>Multi-Provider Expansion 特性</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-2">
                <Badge variant="outline">负载均衡</Badge>
                <span className="text-sm text-muted-foreground">支持 6 种策略：轮询、最少连接、加权、随机、优先级、延迟</span>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="outline">健康检查</Badge>
                <span className="text-sm text-muted-foreground">自动检测 Provider 可用性，标记健康/降级/不健康状态</span>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="outline">熔断器</Badge>
                <span className="text-sm text-muted-foreground">失败次数达到阈值自动熔断，防止雪崩效应</span>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="outline">故障转移</Badge>
                <span className="text-sm text-muted-foreground">自动切换到备用 Provider，支持降级链配置</span>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="outline">指标收集</Badge>
                <span className="text-sm text-muted-foreground">延迟统计、成功率、请求量等实时指标</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>联系与支持</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-4">
            <a href="https://github.com/lipish/llm-link" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
              <Github className="h-4 w-4" /> GitHub 仓库
            </a>
            <a href="https://github.com/lipish/llm-link/issues" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
              <MessageCircle className="h-4 w-4" /> 提交问题
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

