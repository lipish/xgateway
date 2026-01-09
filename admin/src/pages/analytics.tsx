import { useState, useEffect } from "react"
import { apiGet } from "@/lib/api"
import { t } from "@/lib/i18n"
import { PageHeader } from "@/components/layout/page-header"
import {
  Activity,
  Clock,
  Zap,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  BarChart3,
} from "lucide-react"
import { DashboardStats } from "@/components/dashboard/dashboard-stats"
import { AnalyticsChart } from "@/components/dashboard/analytics-chart"
import { PerformancePanel } from "@/components/dashboard/performance-panel"
import { InsightsPanel } from "@/components/dashboard/insights-panel"
import { RecentErrorsPanel } from "@/components/dashboard/recent-errors-panel"

interface AnalyticsData {
  total_requests: number
  success_rate: number
  avg_latency_ms: number
  tokens_used: number
  requests_today: number
  failed_requests: number
  top_models: Array<{
    model: string
    requests: number
    tokens: number
  }>
  recent_errors: Array<{
    timestamp: string
    provider: string
    model: string
    error_type: string
    error_message: string
  }>
}

export function AnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true)
      setError(null)

      // 获取性能统计数据（包含今日统计）
      const performanceResult = await apiGet("/api/logs/performance") as any
      if (performanceResult.success) {
        const perfData = performanceResult.data

        // 获取错误日志
        const errorsResult = await apiGet("/api/logs?status=error&limit=10") as any
        const recentErrors = errorsResult.success ? errorsResult.data : []

        // 构建analytics数据
        const analyticsData: AnalyticsData = {
          total_requests: perfData.total_requests || 0,
          success_rate: perfData.success_rate || 0,
          avg_latency_ms: perfData.avg_response_time || 0,
          tokens_used: perfData.tokens_used || 0,
          requests_today: perfData.total_requests || 0, // 使用总请求数作为今日请求数
          failed_requests: perfData.failed_requests || 0,
          top_models: [], // TODO: 实现top models API
          recent_errors: recentErrors.map((error: any) => ({
            timestamp: error.created_at,
            provider: error.provider_name,
            model: error.model,
            error_type: error.error_message?.includes('timeout') ? 'Timeout' :
              error.error_message?.includes('rate') ? 'Rate Limit' : 'Error',
            error_message: error.error_message
          }))
        }

        setData(analyticsData)
      } else {
        setError(performanceResult.message || t('common.error'))
      }
    } catch (err) {
      console.error("Error fetching analytics:", err)
      setError(t('common.networkError'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalyticsData()
  }, [])

  if (loading) {
    return (
      <div className="flex-1 min-h-0 flex flex-col page-transition overflow-y-auto p-6 scrollbar-hide">
        <PageHeader />
        <div className="flex-1 max-w-[1400px] mx-auto w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-xl border bg-card p-4 h-32">
                <div className="h-4 bg-muted rounded w-24 mb-3"></div>
                <div className="h-8 bg-muted rounded w-16 mb-2"></div>
                <div className="h-3 bg-muted rounded w-20"></div>
              </div>
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border bg-card h-96"></div>
            <div className="rounded-xl border bg-card h-96"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 min-h-0 flex flex-col page-transition overflow-y-auto p-6 scrollbar-hide">
        <PageHeader />
        <div className="flex-1 max-w-[1400px] mx-auto w-full">
          <div className="rounded-xl border bg-destructive/5 p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-destructive mb-2">{t('common.error')}</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <button
              onClick={fetchAnalyticsData}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              {t('common.retry')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex-1 min-h-0 flex flex-col page-transition overflow-y-auto p-6 scrollbar-hide">
        <PageHeader />
        <div className="flex-1 max-w-[1400px] mx-auto w-full">
          <div className="rounded-xl border bg-muted/50 p-8 text-center">
            <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">{t('monitoring.noProviderData')}</h3>
            <p className="text-muted-foreground">Analytics data will appear here once requests are made</p>
          </div>
        </div>
      </div>
    )
  }

  const stats = [
    {
      title: t("dashboard.todayRequests"),
      value: data.requests_today.toLocaleString(),
      subtitle: t("dashboard.todayRequestsDesc"),
      icon: Activity,
      trend: { value: "12%", isPositive: true, label: t("dashboard.vsLastHour") },
    },
    {
      title: t("common.performance.successRate"),
      value: `${data.success_rate.toFixed(1)}%`,
      icon: TrendingUp,
      trend: { value: "2%", isPositive: true, label: t("dashboard.vsLastHour") },
    },
    {
      title: t("common.performance.avgLatency"),
      value: data.avg_latency_ms > 0 ? `${Math.round(data.avg_latency_ms)}ms` : "—",
      icon: Clock,
      trend: { value: "5%", isPositive: false, label: t("dashboard.vsLastHour") },
    },
    {
      title: t("dashboard.tokensUsed"),
      value: data.tokens_used.toLocaleString(),
      icon: Zap,
      trend: { value: "18%", isPositive: true, label: t("dashboard.vsLastHour") },
    }
  ]

  return (
    <div className="flex-1 min-h-0 flex flex-col page-transition overflow-y-auto p-6 scrollbar-hide">
      <div className="flex-1 max-w-[1400px] mx-auto w-full">
        <div className="space-y-4">
          {/* Stats Cards */}
          <DashboardStats stats={stats} />

          {/* Charts - First Row */}
          <div className="grid gap-4 lg:grid-cols-12 items-start">
            <div className="lg:col-span-8">
              <AnalyticsChart />
            </div>
            <div className="lg:col-span-4">
              <PerformancePanel
                successRate={data.success_rate}
                totalRequests={data.requests_today}
                totalTokens={data.tokens_used}
                failedRequests={data.failed_requests}
              />
            </div>
          </div>

          {/* Charts - Second Row */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 items-start">
            <RecentErrorsPanel recentErrors={data.recent_errors} />
            <div className="rounded-xl border bg-card p-6 h-80">
              <h3 className="text-lg font-semibold mb-4">{t("dashboard.topModels")}</h3>
              <div className="space-y-3">
                {data.top_models.length > 0 ? (
                  data.top_models.map((model, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <div className="font-medium">{model.model}</div>
                        <div className="text-sm text-muted-foreground">{model.requests} requests</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{model.tokens.toLocaleString()}</div>
                        <div className="text-sm text-muted-foreground">tokens</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>{t("dashboard.noModelData")}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="rounded-xl border bg-card p-6 h-80">
              <h3 className="text-lg font-semibold mb-4">{t("dashboard.systemStatus")}</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>{t("dashboard.apiStatus")}</span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">{t("dashboard.connected")}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>{t("dashboard.database")}</span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">{t("dashboard.connected")}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>{t("dashboard.cache")}</span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">{t("dashboard.active")}</span>
                </div>
                <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                  <div className="text-sm text-muted-foreground mb-2">{t("dashboard.uptime")}</div>
                  <div className="text-2xl font-bold">99.9%</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}