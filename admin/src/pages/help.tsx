import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Header } from "@/components/layout/header"
import { useI18n, t } from "@/lib/i18n"
import { Badge } from "@/components/ui/badge"
import { Book, Code, MessageCircle, Github } from "lucide-react"

export function HelpPage() {
  return (
    <div className="flex flex-col">
      <Header title={t('help.title')} description={t('help.description')} />
      <div className="flex-1 space-y-6 p-6 max-w-[1600px] mx-auto w-full">
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Book className="h-5 w-5" /> {t('help.quickStart')}
              </CardTitle>
              <CardDescription>{t('help.quickStartDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium">{t('help.step1Title')}</h4>
                <p className="text-sm text-muted-foreground">{t('help.step1Desc')}</p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">{t('help.step2Title')}</h4>
                <p className="text-sm text-muted-foreground">{t('help.step2Desc')}</p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">{t('help.step3Title')}</h4>
                <p className="text-sm text-muted-foreground">{t('help.step3Desc')}</p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">{t('help.step4Title')}</h4>
                <p className="text-sm text-muted-foreground">{t('help.step4Desc')}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" /> {t('help.apiKeys')}
              </CardTitle>
              <CardDescription>{t('help.apiKeysDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Chat Completions</h4>
                  <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`curl -X POST http://localhost:8000/v1/chat/completions \\
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
                {t('help.supportedProviders')}
              </CardTitle>
              <CardDescription>{t('help.supportedProvidersDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Badge>OpenAI</Badge>
                <Badge>Anthropic</Badge>
                <Badge>{t('help.zhipu')}</Badge>
                <Badge>{t('help.aliyun')}</Badge>
                <Badge>{t('help.baidu')}</Badge>
                <Badge>{t('help.tencent')}</Badge>
                <Badge>{t('help.volcengine')}</Badge>
                <Badge>Minimax</Badge>
                <Badge>DeepSeek</Badge>
                <Badge>Moonshot</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {t('help.coreFeatures')}
              </CardTitle>
              <CardDescription>{t('help.coreFeaturesDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-2">
                <Badge variant="outline">{t('help.loadBalancing')}</Badge>
                <span className="text-sm text-muted-foreground">{t('help.loadBalancingDesc')}</span>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="outline">{t('help.healthCheck')}</Badge>
                <span className="text-sm text-muted-foreground">{t('help.healthCheckDesc')}</span>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="outline">{t('help.circuitBreaker')}</Badge>
                <span className="text-sm text-muted-foreground">{t('help.circuitBreakerDesc')}</span>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="outline">{t('help.failover')}</Badge>
                <span className="text-sm text-muted-foreground">{t('help.failoverDesc')}</span>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="outline">{t('help.metricsCollection')}</Badge>
                <span className="text-sm text-muted-foreground">{t('help.metricsCollectionDesc')}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('help.contact')}</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-4">
            <a href="https://github.com/lipish/llm-link" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
              <Github className="h-4 w-4" /> {t('help.github')}
            </a>
            <a href="https://github.com/lipish/llm-link/issues" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
              <MessageCircle className="h-4 w-4" /> {t('help.issues')}
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}