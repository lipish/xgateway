import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp } from "lucide-react"
import { t } from "@/lib/i18n"
import { useState, useEffect } from "react"
import { apiGet } from "@/lib/api"

interface HourlyRequestCount {
  hour: string
  requests: number
}

export function AnalyticsChart() {
  const [data, setData] = useState<HourlyRequestCount[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await apiGet('/api/logs/hourly') as any
        if (result.success && result.data) {
          setData(result.data)
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

  const maxValue = data.length > 0 ? Math.max(...data.map(d => d.requests)) : 1

  return (
    <Card className="rounded-xl border bg-card h-80">
      <CardHeader className="px-6 pb-2">
        <CardTitle className="text-lg font-semibold">{t('common.requestVolume.title')}</CardTitle>
        <p className="text-xs text-muted-foreground">{t('common.requestVolume.description')}</p>
      </CardHeader>
      <CardContent className="px-6 pb-2">
        <div className="space-y-1">
          <div className="flex items-end justify-between gap-1 h-28">
            {data.map((item, index) => {
              const height = data.length > 0 ? (item.requests / maxValue) * 100 : 0
              return (
                <div key={index} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className="w-full flex items-end justify-center h-32">
                    <div
                      className="w-full bg-gradient-to-t from-primary to-primary/60 rounded-t transition-all hover:opacity-80 cursor-pointer"
                      style={{ height: `${height}%` }}
                      title={`${item.hour}: ${item.requests} requests`}
                    />
                  </div>
                  <span className="text-[9px] text-muted-foreground">{item.hour}</span>
                </div>
              )
            })}
          </div>
          <div className="flex items-center justify-between pt-1.5 border-t">
            <div>
              <div className="text-xs text-muted-foreground">{t('common.requestVolume.totalToday')}</div>
              <div className="text-xl font-bold text-foreground">
                {data.reduce((acc, curr) => acc + curr.requests, 0).toLocaleString()}
              </div>
            </div>
            <div className="flex items-center gap-2 text-green-600">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm font-medium">+12.5%</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}