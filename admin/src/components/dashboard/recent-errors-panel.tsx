import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, XCircle, Clock } from "lucide-react"

interface ErrorLog {
  timestamp: string
  provider: string
  model: string
  error_type: string
  error_message: string
}

interface RecentErrorsPanelProps {
  recentErrors?: Array<{
    id: number
    provider_id: number
    provider_name: string
    model: string
    status: string
    latency_ms: number
    tokens_used: number
    error_message: string | null
    request_type: string
    request_content: string
    response_content: string | null
    created_at: string
  }>
}

export function RecentErrorsPanel({ recentErrors = [] }: RecentErrorsPanelProps) {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMinutes = Math.floor(diffMs / 60000)
    
    if (diffMinutes < 1) return "Just now"
    if (diffMinutes < 60) return `${diffMinutes} min ago`
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)} hours ago`
    return `${Math.floor(diffMinutes / 1440)} days ago`
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

  // Transform log entries to error log format
  const formattedErrors = recentErrors.map(log => ({
    timestamp: log.created_at,
    provider: log.provider_name,
    model: log.model || 'unknown',
    error_type: log.error_message || 'Unknown Error',
    error_message: log.error_message || 'No additional details'
  }))

  return (
    <Card className="rounded-xl border bg-card">
      <CardHeader className="px-6 pb-2">
        <CardTitle className="text-lg font-semibold">Recent Errors</CardTitle>
        <p className="text-xs text-muted-foreground">Latest error logs</p>
      </CardHeader>
      <CardContent className="px-6 pb-3">
        <div className="space-y-1.5">
          {formattedErrors.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <div className="text-sm">No recent errors</div>
              <div className="text-xs">When errors occur, they will appear here</div>
            </div>
          ) : (
            formattedErrors.slice(0, 5).map((error, index) => {
              const Icon = getErrorIcon(error.error_type)
              const type = getErrorType(error.error_type)
              
              return (
                <div
                  key={index}
                  className="flex items-start gap-2.5 p-2.5 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <Icon
                    className={`h-4 w-4 mt-0.5 shrink-0 ${
                      type === "error" ? "text-red-500" : "text-yellow-500"
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
                    <p className="text-xs text-muted-foreground">{error.error_message}</p>
                  </div>
                </div>
              )
            })
          )}
          <div className="flex items-center justify-between pt-1.5 border-t">
            <div className="text-xs text-muted-foreground">Total Errors</div>
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
              {formattedErrors.length}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}