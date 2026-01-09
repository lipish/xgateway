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

// TEMPORARY: Using mock data until backend API is ready
const mockData: AnalyticsData = {
  total_requests: 15847,
  success_rate: 96.2,
  avg_latency_ms: 245,
  tokens_used: 1847293,
  requests_today: 1247,
  failed_requests: 4,
  top_models: [
    { model: "gpt-4o", requests: 3833, tokens: 198000 },
    { model: "gemini-pro", requests: 8887, tokens: 272000 },
    { model: "claude-3-sonnet", requests: 1017, tokens: 443000 },
    { model: "gpt-4-turbo", requests: 1046, tokens: 112000 },
  ],
  recent_errors: [
    {
      timestamp: new Date(Date.now() - 2 * 60000).toISOString(),
      provider: "OpenAI",
      model: "gpt-4-turbo",
      error_type: "Rate Limit",
      error_message: "Rate limit exceeded"
    },
    {
      timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
      provider: "Anthropic",
      model: "claude-3-sonnet",
      error_type: "Timeout",
      error_message: "Connection timeout"
    }
  ]
}

export function AnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<AnalyticsData | null>(mockData)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => setLoading(false), 800)
    return () => clearTimeout(timer)
  }, [])

  // TEMPORARY: Comment out actual API call
  /*
  const fetchAnalyticsData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const result = await apiGet("/api/analytics") as any
      if (result.success) {
        setData(result.data)
      } else {
        setError(result.message || t('common.error'))
      }
    } catch (err) {
      console.error("Error fetching analytics:", err)
      setError(t('common.networkError'))
    } finally {
      setLoading(false)
    }
  }
  */

  if (loading) {
    return (
      <div className="flex-1 min-h-0 flex flex-col page-transition overflow-y-auto p-6 scrollbar-hide">
        <PageHeader />
        <div className="flex-1 max-w-[1400px] mx-auto w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-xl border bg-card p-5">
                <div className="h-4 bg-muted rounded w-24 mb-3"></div>
                <div className="h-8 bg-muted rounded w-16 mb-2"></div>
                <div className="h-3 bg-muted rounded w-20"></div>
              </div>
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border bg-card h-64"></div>
            <div className="rounded-xl border bg-card h-64"></div>
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
              onClick={() => window.location.reload()}
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
      title: t("monitoring.totalRequests"),
      value: data.total_requests.toLocaleString(),
      icon: Activity,
      trend: {
        value: "+12%",
        isPositive: true,
        label: "vs yesterday"
      }
    },
    {
      title: t("monitoring.successRate"),
      value: `${data.success_rate.toFixed(1)}%`,
      icon: TrendingUp,
      trend: {
        value: "+2%",
        isPositive: true,
        label: "vs yesterday"
      }
    },
    {
      title: t("monitoring.avgLatency"),
      value: `${Math.round(data.avg_latency_ms)}ms`,
      icon: Clock,
      trend: {
        value: "-5%",
        isPositive: false,
        label: "vs yesterday"
      }
    },
    {
      title: "TOKENS USED",
      value: data.tokens_used.toLocaleString(),
      icon: Zap,
      trend: {
        value: "+18%",
        isPositive: true,
        label: "vs yesterday"
      }
    }
  ]

  return (
    <div className="flex-1 min-h-0 flex flex-col page-transition overflow-y-auto p-6 scrollbar-hide">
      <div className="flex-1 max-w-[1400px] mx-auto w-full">
        <div className="space-y-6">
          {/* Stats Cards */}
          <DashboardStats stats={stats} />

          {/* Charts */}
          <div className="grid gap-6 lg:grid-cols-2">
            <AnalyticsChart />
            <PerformancePanel
              successRate={data.success_rate}
              totalRequests={data.requests_today}
              totalTokens={data.tokens_used}
              failedRequests={data.failed_requests}
            />
          </div>

          {/* Bottom Panels */}
          <div className="grid gap-6 lg:grid-cols-2">
            <InsightsPanel topModels={data.top_models} />
            <RecentErrorsPanel recentErrors={data.recent_errors} />
          </div>
        </div>
      </div>
    </div>
  )
}