import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity } from "lucide-react"

interface ResponseTimeChartProps {
  poolMetrics: {
    providers: Array<{
      provider_id: number
      provider_name: string
      total_requests: number
      successful_requests: number
      failed_requests: number
      avg_latency_ms: number
      success_rate: string
      tokens_used: number
      requests_per_second: number
    }>
    timestamp: string
  } | null
}

export function ResponseTimeChart({ poolMetrics }: ResponseTimeChartProps) {
  // Use real provider data from pool metrics
  const services = poolMetrics?.providers.map(provider => ({
    name: provider.provider_name,
    latency: provider.avg_latency_ms,
    color: "bg-primary",
    requests: provider.total_requests
  })) || []

  const maxLatency = Math.max(...services.map(s => s.latency), 1)

  // Calculate overall average latency
  const overallAvgLatency = services.length > 0 
    ? services.reduce((acc, curr) => acc + curr.latency, 0) / services.length 
    : 0

  return (
    <Card className="rounded-xl border bg-card">
      <CardHeader className="px-6 pb-2">
        <CardTitle className="text-lg font-semibold">Latency Distribution</CardTitle>
        <p className="text-xs text-muted-foreground">Average latency by provider (ms)</p>
      </CardHeader>
      <CardContent className="px-6 pb-3">
        <div className="space-y-1.5">
          {services.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <div className="text-sm">No latency data available</div>
              <div className="text-xs">Start making requests to see latency metrics</div>
            </div>
          ) : (
            services.map((service, index) => {
              const width = (service.latency / maxLatency) * 100
              return (
                <div key={index} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{service.name}</span>
                    <span className="text-sm font-bold text-foreground">{service.latency.toFixed(1)}ms</span>
                  </div>
                  <div className="relative h-2.5 w-full bg-secondary rounded-full overflow-hidden">
                    <div
                      className={`h-full ${service.color} transition-all rounded-full`}
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              )
            })
          )}
          <div className="flex items-center justify-center gap-2 pt-1.5 border-t">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <div className="text-center">
              <div className="text-xl font-bold text-foreground">
                {overallAvgLatency.toFixed(1)}ms
              </div>
              <div className="text-xs text-muted-foreground">Average Latency</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}