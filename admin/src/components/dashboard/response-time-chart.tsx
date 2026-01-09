import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity } from "lucide-react"
import { t } from "@/lib/i18n"
import { useState, useEffect } from "react"
import { apiGet } from "@/lib/api"

interface ProviderLatency {
  provider_name: string
  avg_latency_ms: number
}

const colors = [
  "bg-blue-500",
  "bg-purple-500",
  "bg-green-500",
  "bg-orange-500",
  "bg-red-500",
  "bg-yellow-500",
  "bg-pink-500",
  "bg-indigo-500",
  "bg-teal-500",
  "bg-cyan-500"
]

export function ResponseTimeChart() {
  const [services, setServices] = useState<ProviderLatency[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await apiGet('/api/logs/latencies') as any
        if (result.success && result.data) {
          setServices(result.data)
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
            const color = colors[index % colors.length]
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