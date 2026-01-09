import { Zap } from "lucide-react"
import { t } from "@/lib/i18n"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

interface PerformancePanelProps {
  successRate?: number
  failedRequests?: number
  totalRequests?: number
  totalTokens?: number
  className?: string
}

export function PerformancePanel({
  successRate = 0,
  failedRequests = 0,
  totalRequests = 0,
  totalTokens = 0,
  className = "",
}: PerformancePanelProps) {
  const hasData = successRate > 0 || totalRequests > 0 || totalTokens > 0

  return (
    <Card className={`${className} h-80`}>
      <CardHeader className="flex flex-row items-center justify-between px-6 pb-2">
        <CardTitle className="text-lg font-semibold">{t('common.performance.title')}</CardTitle>
      </CardHeader>

      <CardContent className="p-0">
        <div className="px-6 pb-5 pt-1 space-y-4">
          {/* 成功率进度条 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">{t('common.performance.successRate')}</span>
              <span className="text-lg font-bold text-foreground">
                {hasData ? `${successRate.toFixed(2)}%` : "—"}
              </span>
            </div>
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${successRate}%` }}
              />
            </div>
          </div>

          {/* 核心性能指标 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                总请求数
              </div>
              <div className="text-xl font-bold text-foreground">
                {hasData ? totalRequests.toLocaleString() : "—"}
              </div>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                Tokens使用总数
              </div>
              <div className="text-xl font-bold text-foreground">
                {hasData ? totalTokens.toLocaleString() : "—"}
              </div>
            </div>
          </div>

          {/* 失败请求统计 */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Zap className="h-4 w-4" />
              <span className="text-sm">
                {hasData ? `${failedRequests} ${t('common.performance.failedRequests')}` : t('common.performance.statisticsComingSoon')}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}