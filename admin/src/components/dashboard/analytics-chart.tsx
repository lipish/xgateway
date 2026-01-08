import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"

interface AnalyticsChartProps {
  logs: Array<{
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

export function AnalyticsChart({ logs }: AnalyticsChartProps) {
  // Get current time and calculate recent 8 hours (current hour + 7 previous hours)
  const now = new Date()
  const currentHour = now.getHours()
  const recentHours = Array.from({ length: 8 }, (_, i) => (currentHour - (7 - i) + 24) % 24)
  
  // Group logs by recent hours
  const recentData = recentHours.map(hour => {
    const hourLogs = logs.filter(log => {
      const logHour = new Date(log.created_at).getHours()
      return logHour === hour
    })
    
    return {
      time: `${hour.toString().padStart(2, '0')}:00`,
      requests: hourLogs.length,
      errors: hourLogs.filter(log => log.status === 'error').length
    }
  })

  const maxValue = Math.max(...recentData.map(d => d.requests), 1)

  // Calculate total requests
  const totalRequests = logs.length
  const successRate = totalRequests > 0 
    ? ((totalRequests - logs.filter(log => log.status === 'error').length) / totalRequests) * 100 
    : 0

  return (
    <Card className="rounded-xl border bg-card">
      <CardHeader className="flex flex-row items-center justify-between px-6 pb-2">
        <div>
          <CardTitle className="text-lg font-semibold">Request Volume</CardTitle>
          <p className="text-xs text-muted-foreground">Last 8 hours</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.location.href = '/analytics'}
        >
          <ExternalLink className="h-4 w-4 mr-1" />
          View All
        </Button>
      </CardHeader>
      <CardContent className="px-6 pb-3">
        <div className="space-y-1.5">
          <div className="flex items-end justify-between gap-2 h-32">
            {recentData.map((item, index) => {
              const height = (item.requests / maxValue) * 100
              return (
                <div key={index} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex items-end justify-center h-24">
                    <div
                      className={`w-full ${item.requests > 0 ? 'bg-gradient-to-t from-primary to-primary/60' : 'bg-muted'} rounded-t transition-all hover:opacity-80 cursor-pointer`}
                      style={{ height: `${height}%` }}
                      title={`${item.time}: ${item.requests} requests (${item.errors} errors)`}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium">{item.time}</span>
                </div>
              )
            })}
          </div>
          <div className="flex items-center justify-between pt-1.5 border-t">
            <div>
              <div className="text-xs text-muted-foreground">Total Requests</div>
              <div className="text-xl font-bold text-foreground">
                {totalRequests.toLocaleString()}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-2 text-green-600">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm font-medium">{successRate.toFixed(1)}% Success</span>
              </div>
              <div className="text-xs text-red-600">
                {logs.filter(log => log.status === 'error').length} errors
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}