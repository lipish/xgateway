import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { t } from "@/lib/i18n"
import { PageHeader } from "@/components/layout/page-header"
import { Badge } from "@/components/ui/badge"
import { Book, Code, MessageCircle, Github, Globe, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"

export function HelpPage() {
  return (
    <div className="flex-1 min-h-0 flex flex-col page-transition overflow-y-auto p-6 scrollbar-hide">
      <PageHeader
        title={t('help.title')}
        subtitle={t('help.subtitle')}
        action={
          <Button variant="outline" size="sm" onClick={() => window.open('https://github.com/lipish/llm-link', '_blank')}>
            <Github className="mr-2 h-4 w-4" />
            GitHub
          </Button>
        }
      />
      <div className="flex-1 space-y-6 max-w-[1400px] mx-auto w-full">

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="hover:border-primary/40 transition-colors">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                < Book className="h-5 w-5 text-primary" /> {t('help.quickStart')}
              </CardTitle>
              <CardDescription>{t('help.quickStartDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="h-5 w-5 rounded-full p-0 flex items-center justify-center font-bold">1</Badge>
                  <h4 className="font-semibold">{t('help.step1Title')}</h4>
                </div>
                <p className="text-sm text-muted-foreground ml-7">{t('help.step1Desc')}</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="h-5 w-5 rounded-full p-0 flex items-center justify-center font-bold">2</Badge>
                  <h4 className="font-semibold">{t('help.step2Title')}</h4>
                </div>
                <p className="text-sm text-muted-foreground ml-7">{t('help.step2Desc')}</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="h-5 w-5 rounded-full p-0 flex items-center justify-center font-bold">3</Badge>
                  <h4 className="font-semibold">{t('help.step3Title')}</h4>
                </div>
                <p className="text-sm text-muted-foreground ml-7">{t('help.step3Desc')}</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="h-5 w-5 rounded-full p-0 flex items-center justify-center font-bold">4</Badge>
                  <h4 className="font-semibold">{t('help.step4Title')}</h4>
                </div>
                <p className="text-sm text-muted-foreground ml-7">{t('help.step4Desc')}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:border-primary/40 transition-colors flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5 text-primary" /> {t('help.apiKeys')}
              </CardTitle>
              <CardDescription>{t('help.apiKeysDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold mb-2">Chat Completions</h4>
                  <div className="relative group">
                    <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto font-mono text-muted-foreground">
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
              </div>
            </CardContent>
          </Card>

          <Card className="hover:border-primary/40 transition-colors">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" /> {t('help.supportedProviders')}
              </CardTitle>
              <CardDescription>{t('help.supportedProvidersDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {['OpenAI', 'Anthropic', t('help.zhipu'), t('help.aliyun'), t('help.baidu'), t('help.tencent'), t('help.volcengine'), 'Minimax', 'DeepSeek', 'Moonshot'].map(provider => (
                  <Badge key={provider} variant="secondary" className="px-3 py-1 font-normal bg-primary/5 text-primary border-primary/10">
                    {provider}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="hover:border-primary/40 transition-colors">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" /> {t('help.coreFeatures')}
              </CardTitle>
              <CardDescription>{t('help.coreFeaturesDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4">
                {[
                  { label: t('help.loadBalancing'), desc: t('help.loadBalancingDesc') },
                  { label: t('help.healthCheck'), desc: t('help.healthCheckDesc') },
                  { label: t('help.circuitBreaker'), desc: t('help.circuitBreakerDesc') },
                  { label: t('help.failover'), desc: t('help.failoverDesc') },
                  { label: t('help.metricsCollection'), desc: t('help.metricsCollectionDesc') },
                ].map((feature, i) => (
                  <div key={i} className="flex flex-col gap-1 p-3 rounded-lg bg-muted/30 border border-muted/50">
                    <span className="text-sm font-semibold text-primary">{feature.label}</span>
                    <span className="text-sm text-muted-foreground">{feature.desc}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{t('help.contact')}</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-6">
            <a href="https://github.com/lipish/llm-link" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm font-medium text-primary hover:underline">
              <Github className="h-4 w-4" /> {t('help.github')}
            </a>
            <a href="https://github.com/lipish/llm-link/issues" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm font-medium text-primary hover:underline">
              <MessageCircle className="h-4 w-4" /> {t('help.issues')}
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}