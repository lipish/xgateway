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

interface LogEntry {
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
}

export function AnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [error, setError] = useState<string | null>(null)

  // Calculate analytics from logs
  const calculateAnalytics = () => {
    const totalRequests = logs.length
    const successRequests = logs.filter(log => log.status === 'success').length
    const failedRequests = logs.filter(log => log.status === 'error').length
    const successRate = totalRequests > 0 ? parseFloat(((successRequests / totalRequests) * 100).toFixed(1)) : 0
    
    // Calculate average latency excluding timeout errors (60+ seconds)
    const successLogs = logs.filter(log => log.status === 'success')
    const validLatencyLogs = successLogs.filter(log => log.latency_ms < 60000) // Exclude 60+ second timeouts
    const avgLatency = validLatencyLogs.length > 0 
      ? parseFloat((validLatencyLogs.reduce((sum, log) => sum + log.latency_ms, 0) / validLatencyLogs.length).toFixed(1)) 
      : 0
    
    const tokensUsed = logs.reduce((sum, log) => sum + log.tokens_used, 0)
    
    // Calculate requests today (last 24 hours)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const requestsToday = logs.filter(log => new Date(log.created_at) > yesterday).length

    return {
      totalRequests,
      successRate,
      avgLatency,
      tokensUsed,
      requestsToday,
      failedRequests
    }
  }

  const analytics = calculateAnalytics()

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Fetch logs data
        const logsResult = await apiGet("/api/logs") as any
        if (logsResult.success) {
          setLogs(logsResult.data || [])
        } else {
          setError(logsResult.message || "Failed to load logs")
        }
        
        setLoading(false)
      } catch (err) {
        console.error("Error fetching logs:", err)
        setError("Network error occurred")
        setLoading(false)
      }
    }
    
    loadData()
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
        setError(result.message || "Failed to load analytics data")
      }
    } catch (err) {
      console.error("Error fetching analytics:", err)
      setError("Network error occurred")
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
            <h3 className="text-lg font-semibold text-destructive mb-2">Failed to Load Data</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  const stats = [
    {
      title: "TOTAL REQUESTS",
      value: analytics.totalRequests.toLocaleString(),
      icon: Activity,
      trend: {
        value: "+12%",
        isPositive: true,
        label: "vs yesterday"
      }
    },
    {
      title: "SUCCESS RATE",
      value: `${analytics.successRate.toFixed(1)}%`,
      icon: TrendingUp,
      trend: {
        value: "+2%",
        isPositive: true,
        label: "vs yesterday"
      }
    },
    {
      title: "AVG LATENCY",
      value: `${Math.round(analytics.avgLatency)}ms`,
      icon: Clock,
      trend: {
        value: "-5%",
        isPositive: false,
        label: "vs yesterday"
      }
    },
    {
      title: "TOKENS USED",
      value: analytics.tokensUsed.toLocaleString(),
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
             <AnalyticsChart logs={logs} />
             <PerformancePanel 
               successRate={analytics.successRate}
               requestsToday={analytics.requestsToday}
               tokensUsed={analytics.tokensUsed}
               failedRequests={analytics.failedRequests}
             />
           </div>

{/* Bottom Panels */}
            <div className="grid gap-6 lg:grid-cols-2">
              <InsightsPanel logs={logs} />
              <RecentErrorsPanel recentErrors={logs.filter(log => log.status === 'error')} />
            </div>
        </div>
      </div>
    </div>
  )
}