import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { DashboardStats } from "@/components/dashboard/dashboard-stats"
import { PerformancePanel } from "@/components/dashboard/performance-panel"
import { AnalyticsChart } from "@/components/dashboard/analytics-chart"
import { ResponseTimeChart } from "@/components/dashboard/response-time-chart"
import { RecentErrorsPanel } from "@/components/dashboard/recent-errors-panel"

import { t } from "@/lib/i18n"
import {
  ArrowRight,
  TrendingUp,
  Clock,
  Layers,
  Server
} from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { apiGet, apiPost } from "@/lib/api"
import { cn } from "@/lib/utils"

interface ProviderStats {
  total: number
  enabled: number
  disabled: number
}

interface Provider {
  id: number
  name: string
  provider_type: string
  config: string
  enabled: boolean
  priority: number
  created_at: string
  updated_at: string
}

interface PerformanceStats {
  success_rate: number
  requests_today: number
  tokens_used: number
  failed_requests: number
  avg_response_time: number
  qps: number
}

interface ErrorLog {
  timestamp: string
  provider: string
  model: string
  error_type: string
  error_message: string
}

export function DashboardPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<ProviderStats | null>(null)
  const [todayStats, setTodayStats] = useState<{ total_requests: number, avg_latency_ms: number } | null>(null)
  const [performanceStats, setPerformanceStats] = useState<PerformanceStats | null>(null)
  const [recentErrors, setRecentErrors] = useState<ErrorLog[]>([])
  const [recentProviders, setRecentProviders] = useState<Provider[]>([])
  const [allProviders, setAllProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)

      const [statsResult, providersResult, todayStatsResult, performanceStatsResult, logsResult] = await Promise.all([
        apiGet('/api/instances/stats'),
        apiGet('/api/instances'),
        apiGet('/api/logs/today'),
        apiGet('/api/logs/performance'),
        apiGet('/api/logs?limit=20&status=error')
      ]) as [any, any, any, any, any]

      if (statsResult.success) {
        setStats(statsResult.data)
      } else {
        setError(statsResult.message || t('common.error'))
      }

      if (providersResult.success) {
        const providers = providersResult.data || []
        setRecentProviders(providers.slice(0, 4))
        setAllProviders(providers)
      } else {
        setError(providersResult.message || t('common.error'))
      }

      if (todayStatsResult.success) {
        setTodayStats(todayStatsResult.data)
      } else {
        setError(todayStatsResult.message || t('common.error'))
      }

      if (performanceStatsResult.success) {
        setPerformanceStats(performanceStatsResult.data)
      } else {
        setError(performanceStatsResult.message || t('common.error'))
      }

      if (logsResult.success) {
        const errorLogs = (logsResult.data || []).map((log: any) => ({
          timestamp: log.created_at,
          provider: log.provider_name,
          model: log.model,
          error_type: log.error_message || 'error',
          error_message: log.error_message
        }))
        setRecentErrors(errorLogs)
      } else {
        setError(logsResult.message || t('common.error'))
      }

    } catch (err) {
      setError(t('common.networkError'))
      console.error('Error fetching dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  const toggleProvider = async (id: number) => {
    try {
      setError(null)
      const result = await apiPost(`/api/instances/${id}/toggle`) as any
      if (result.success) {
        setRecentProviders(recentProviders.map(p => p.id === id ? result.data : p))
        setAllProviders(allProviders.map(p => p.id === id ? result.data : p))
        const statsResult = await apiGet('/api/instances/stats') as any
        if (statsResult.success) {
          setStats(statsResult.data)
        }
      } else {
        setError(result.message || t('common.error'))
        setTimeout(() => setError(null), 3000)
      }
    } catch {
      setError(t('common.networkError'))
      setTimeout(() => setError(null), 3000)
    }
  }


  const statsCards = [
    {
      title: t("dashboard.todayRequests"),
      value: todayStats ? todayStats.total_requests.toLocaleString() : "0",
      subtitle: t("dashboard.todayRequestsDesc"),
      icon: TrendingUp,
      trend: { value: "12%", isPositive: true, label: t("dashboard.vsLastHour") },
    },
    {
      title: t("dashboard.enabledProviders"),
      value: stats?.enabled.toString() || "0",
      subtitle: t("providers.model"),
      icon: Server,
    },
    {
      title: t("dashboard.totalProviders"),
      value: stats?.total.toString() || "0",
      subtitle: t("providers.total"),
      icon: Layers,
    },
    {
      title: t("dashboard.avgLatency"),
      value: todayStats && todayStats.avg_latency_ms > 0 ? `${Math.round(todayStats.avg_latency_ms)}ms` : "—",
      subtitle: t("dashboard.avgLatencyDesc"),
      icon: Clock,
      trend: { value: "5%", isPositive: true, label: t("dashboard.vsLastHour") },
    },
  ]

  return (
    <div className="space-y-4 max-w-[1400px] mx-auto w-full">
      <DashboardStats stats={statsCards} />

      <div className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-12 items-start">
          <Card className="lg:col-span-8 h-80">
            <CardHeader className="flex flex-row items-center justify-between px-6 pb-2">
              <CardTitle className="text-lg font-semibold">{t("dashboard.enabledProviders")}</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/instances')}
              >
                <ArrowRight className="mr-1 h-4 w-4" />
                {t("dashboard.viewAll")}
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[140px] pl-6">{t("providers.name")}</TableHead>
                    <TableHead className="w-[120px]">{t("providers.type")}</TableHead>
                    <TableHead className="w-[100px]">{t("providers.status")}</TableHead>
                    <TableHead>{t("providers.model")}</TableHead>
                    <TableHead className="w-[80px]">{t("providers.priority")}</TableHead>
                    <TableHead className="w-[120px] text-right pr-6">{t("providers.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentProviders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        {t("common.noRecentProviders")}
                      </TableCell>
                    </TableRow>
                  ) : recentProviders.map((provider) => {
                    const config = (() => {
                      try { return JSON.parse(provider.config) } catch { return {} }
                    })()
                    return (
                      <TableRow key={provider.id}>
                        <TableCell className="font-medium pl-6">{provider.name}</TableCell>
                        <TableCell className="text-muted-foreground text-sm capitalize">
                          {provider.provider_type || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs",
                              provider.enabled ? "bg-green-50 text-green-700 border-green-200" : "bg-muted text-muted-foreground"
                            )}
                          >
                            {provider.enabled ? t("providers.enabled") : t("providers.disabled")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {config.model || '-'}
                        </TableCell>
                        <TableCell>{provider.priority}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end pr-6">
                            <Switch
                              checked={provider.enabled}
                              onCheckedChange={() => toggleProvider(provider.id)}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <PerformancePanel
            successRate={performanceStats?.success_rate || 0}
            failedRequests={performanceStats?.failed_requests || 0}
            totalRequests={performanceStats?.requests_today || 0}
            totalTokens={performanceStats?.tokens_used || 0}
            className="lg:col-span-4"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 items-start">
          <AnalyticsChart />

          <ResponseTimeChart />

          <RecentErrorsPanel recentErrors={recentErrors} />
        </div>
      </div>
    </div>
  )
}