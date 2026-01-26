import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp } from "lucide-react"
import { t } from "@/lib/i18n"
import { useState, useEffect } from "react"
import { apiGet } from "@/lib/api"

interface HourlyRequestCount {
  hour: string
  requests: number
}

interface ApiResponse<T> {
  success: boolean
  data?: T
}

interface HourlyRequestCountRaw {
  hour?: unknown
  requests?: unknown
}

interface AnalyticsChartProps {
  maxHours?: number
}

export function AnalyticsChart({ maxHours }: AnalyticsChartProps) {
  const [data, setData] = useState<HourlyRequestCount[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await apiGet<ApiResponse<HourlyRequestCountRaw[]>>('/api/logs/hourly')
        const raw = Array.isArray(result?.data) ? result.data : []
        const parsed: HourlyRequestCount[] = raw
          .map((item) => ({
            hour: typeof item?.hour === 'string' || typeof item?.hour === 'number' ? String(item.hour) : '',
            requests: Number(item?.requests ?? 0),
          }))
          .filter((item) => item.hour.length > 0)
          .sort((a, b) => a.hour.localeCompare(b.hour))

        if (result?.success) {
          setData(parsed)
        }
      } catch (error) {
        console.error('Failed to fetch hourly requests:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <Card className="rounded-xl border bg-card h-80">
        <CardHeader className="px-6 pb-2">
          <CardTitle className="text-lg font-semibold">{t('common.requestVolume.title')}</CardTitle>
          <p className="text-xs text-muted-foreground">{t('common.requestVolume.description')}</p>
        </CardHeader>
        <CardContent className="px-6 pb-2">
          <div className="h-24 bg-muted rounded animate-pulse"></div>
        </CardContent>
      </Card>
    )
  }

  const displayData = typeof maxHours === 'number' && maxHours > 0 ? data.slice(-maxHours) : data
  const maxValue = displayData.length > 0 ? Math.max(...displayData.map(d => d.requests)) : 1

  return (
    <Card className="rounded-xl border bg-card h-80">
      <CardHeader className="px-6 pb-2">
        <CardTitle className="text-lg font-semibold">{t('common.requestVolume.title')}</CardTitle>
        <p className="text-xs text-muted-foreground">{t('common.requestVolume.description')}</p>
      </CardHeader>
      <CardContent className="px-6 pb-2">
        <div className="space-y-1">
          {displayData.length === 0 ? (
            <div className="h-32 flex items-center justify-center text-xs text-muted-foreground">
              —
            </div>
          ) : (
            <div className="flex items-end justify-between gap-1 h-32 min-w-0 overflow-hidden">
              {displayData.map((item, index) => {
                const height = displayData.length > 0 ? (item.requests / maxValue) * 100 : 0
                return (
                  <div key={index} className="flex-1 min-w-0 flex flex-col items-center gap-1.5 h-full">
                    <div className="w-full flex items-end justify-center h-full min-w-0">
                      <div
                        className="w-full bg-gradient-to-t from-primary to-primary/60 rounded-t transition-all hover:opacity-80 cursor-pointer"
                        style={{ height: `${height}%` }}
                        title={`${item.hour}: ${item.requests} requests`}
                      />
                    </div>
                    <span className="text-[9px] text-muted-foreground truncate max-w-full">{item.hour}</span>
                  </div>
                )
              })}
            </div>
          )}
          <div className="flex items-center justify-between gap-2 pt-1.5 border-t min-w-0">
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground">{t('common.requestVolume.totalToday')}</div>
              <div className="text-xl font-bold text-foreground truncate">
                {displayData.reduce((acc, curr) => acc + curr.requests, 0).toLocaleString()}
              </div>
            </div>
            <div className="flex items-center gap-2 text-violet-600">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm font-medium">+12.5%</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
