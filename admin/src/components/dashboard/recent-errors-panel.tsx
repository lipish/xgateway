import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertTriangle, XCircle, Clock, ArrowRight } from "lucide-react"
import { t } from "@/lib/i18n"

interface ErrorLog {
  timestamp: string
  provider: string
  model: string
  error_type: string
  error_message: string
}

interface RecentErrorsPanelProps {
  recentErrors?: ErrorLog[]
}

export function RecentErrorsPanel({ recentErrors = [] }: RecentErrorsPanelProps) {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMinutes = Math.floor(diffMs / 60000)

    if (diffMinutes < 1) return t('common.recentErrors.justNow')
    if (diffMinutes < 60) return `${diffMinutes} ${t('common.recentErrors.minutesAgo')}`
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)} ${t('common.recentErrors.hoursAgo')}`
    return `${Math.floor(diffMinutes / 1440)} ${t('common.recentErrors.daysAgo')}`
  }

  const getErrorIcon = (errorType: string) => {
    if (errorType.toLowerCase().includes('rate')) return AlertTriangle
    if (errorType.toLowerCase().includes('timeout')) return Clock
    return XCircle
  }

  const getErrorType = (errorType: string) => {
    if (errorType.toLowerCase().includes('rate')) return "warning"
    return "error"
  }

  return (
    <Card className="rounded-xl border bg-card h-80">
      <CardHeader className="flex flex-row items-center justify-between px-6 pb-2">
        <div>
          <CardTitle className="text-lg font-semibold">{t('common.recentErrors.title')}</CardTitle>
          <p className="text-xs text-muted-foreground">{t('common.recentErrors.description')}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.location.href = '/logs'}
          className="text-xs"
        >
          <ArrowRight className="mr-1 h-3 w-3" />
          {t('dashboard.viewAll')}
        </Button>
      </CardHeader>
      <CardContent className="px-6 pb-2">
        <div className="space-y-1">
          {recentErrors.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              <div className="text-sm">{t('common.recentErrors.noRecentErrors')}</div>
            </div>
          ) : (
            recentErrors.slice(0, 2).map((error, index) => {
              const Icon = getErrorIcon(error.error_type)
              const type = getErrorType(error.error_type)

              return (
                <div
                  key={index}
                  className="flex items-start gap-2.5 p-1.5 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <Icon
                    className={`h-4 w-4 mt-0.5 shrink-0 ${type === "error" ? "text-red-500" : "text-yellow-500"
                      }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm font-medium text-foreground truncate">
                        {error.provider} - {error.model}
                      </span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatTime(error.timestamp)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{error.error_message || error.error_type}</p>
                  </div>
                </div>
              )
            })
          )}
        </div>
        <div className="flex items-center justify-between pt-1.5 border-t mt-1">
          <div className="text-xs text-muted-foreground">{t('common.recentErrors.totalErrors')}</div>
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            {recentErrors.length}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}