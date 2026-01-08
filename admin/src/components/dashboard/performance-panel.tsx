import { Zap } from "lucide-react"

interface PerformancePanelProps {
  successRate?: number
  requestsToday?: number
  tokensUsed?: number
  failedRequests?: number
}

export function PerformancePanel({
  successRate = 0,
  requestsToday = 0,
  tokensUsed = 0,
  failedRequests = 0,
}: PerformancePanelProps) {
  const hasData = successRate > 0 || requestsToday > 0 || tokensUsed > 0

  return (
    <div className="rounded-xl border bg-card p-5">
      <h3 className="text-lg font-semibold text-foreground mb-5">Performance</h3>

      <div className="space-y-5">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Success Rate</span>
            <span className="text-lg font-bold text-foreground">
              {hasData ? `${successRate}%` : "—"}
            </span>
          </div>
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div 
              className="h-full bg-primary transition-all"
              style={{ width: `${successRate}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2">
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              Requests Today
            </div>
            <div className="text-2xl font-bold text-foreground">
              {hasData ? requestsToday.toLocaleString() : "—"}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              Tokens Used
            </div>
            <div className="text-2xl font-bold text-foreground">
              {hasData ? tokensUsed.toLocaleString() : "—"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-muted-foreground">
          <Zap className="h-4 w-4" />
          <span className="text-sm font-medium">
            {hasData ? `${failedRequests} failed requests` : "Statistics coming soon"}
          </span>
        </div>
      </div>
    </div>
  )
}