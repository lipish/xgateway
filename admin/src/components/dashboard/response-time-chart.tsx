import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity } from "lucide-react"
import { t } from "@/lib/i18n"
import { useState, useEffect } from "react"
import { apiGet } from "@/lib/api"

interface ProviderLatency {
  provider_name: string
  avg_latency_ms: number
}

interface ApiResponse<T> {
  success: boolean
  data?: T
}

interface ProviderLatencyRaw {
  provider_name?: unknown
  avg_latency_ms?: unknown
}

export function ResponseTimeChart() {
  const [services, setServices] = useState<ProviderLatency[]>([])
  const [loading, setLoading] = useState(true)

  const getLatencyColor = (avgLatencyMs: number, bestLatencyMs: number) => {
    if (!Number.isFinite(avgLatencyMs)) return "bg-muted"
    if (!Number.isFinite(bestLatencyMs) || bestLatencyMs <= 0) return "bg-violet-400"

    if (avgLatencyMs <= bestLatencyMs * 1.1) return "bg-emerald-500"
    return "bg-violet-400"
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await apiGet<ApiResponse<ProviderLatencyRaw[]>>('/api/logs/latencies')
        if (result.success && Array.isArray(result.data)) {
          const normalized = result.data
            .map((item) => ({
              provider_name: typeof item?.provider_name === 'string' ? item.provider_name : '',
              avg_latency_ms: Number(item?.avg_latency_ms ?? 0),
            }))
            .filter((item) => item.provider_name.length > 0)
          setServices(normalized)
        }
      } catch (error) {
        console.error('Failed to fetch provider latencies:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <Card className="rounded-xl border bg-card h-64">
        <CardHeader className="px-6 pb-2">
          <CardTitle className="text-lg font-semibold">{t('common.latencyDistribution.title')}</CardTitle>
          <p className="text-xs text-muted-foreground">{t('common.latencyDistribution.description')}</p>
        </CardHeader>
        <CardContent className="px-6 pb-2">
          <div className="space-y-1">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-2.5 bg-muted rounded animate-pulse"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const maxLatency = services.length > 0 ? Math.max(...services.map(s => s.avg_latency_ms)) : 1
  const minLatency = services.length > 0 ? Math.min(...services.map(s => s.avg_latency_ms)) : 0

  return (
    <Card className="rounded-xl border bg-card h-80">
      <CardHeader className="px-6 pb-2">
        <CardTitle className="text-lg font-semibold">{t('common.latencyDistribution.title')}</CardTitle>
        <p className="text-xs text-muted-foreground">{t('common.latencyDistribution.description')}</p>
      </CardHeader>
      <CardContent className="px-6 pb-2">
        <div className="space-y-1">
          {services.map((service, index) => {
            const width = services.length > 0 ? (service.avg_latency_ms / maxLatency) * 100 : 0
            const color = getLatencyColor(service.avg_latency_ms, minLatency)
            return (
              <div key={index} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{service.provider_name}</span>
                  <span className="text-sm font-bold text-foreground">{Math.round(service.avg_latency_ms)}ms</span>
                </div>
                <div className="relative h-2.5 w-full bg-secondary rounded-full overflow-hidden">
                  <div
                    className={`h-full ${color} transition-all rounded-full`}
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            )
          })}
          <div className="flex items-center justify-center gap-2 pt-1.5 border-t">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <div className="text-center">
              <div className="text-xl font-bold text-foreground">
                {services.length > 0 ? Math.round(services.reduce((acc, curr) => acc + curr.avg_latency_ms, 0) / services.length) : 0}ms
              </div>
              <div className="text-xs text-muted-foreground">{t('common.latencyDistribution.averageLatency')}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
