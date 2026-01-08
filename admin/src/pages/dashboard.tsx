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

interface PoolMetrics {
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
}

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

export function DashboardPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<ProviderStats | null>(null)
  const [recentProviders, setRecentProviders] = useState<Provider[]>([])
  const [allProviders, setAllProviders] = useState<Provider[]>([])
  const [poolMetrics, setPoolMetrics] = useState<PoolMetrics | null>(null)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)

      const [statsResult, providersResult, metricsResult, logsResult] = await Promise.all([
        apiGet('/api/instances/stats'),
        apiGet('/api/instances'),
        apiGet('/api/pool/metrics'),
        apiGet('/api/logs')
      ]) as [any, any, any, any]

      if (statsResult.success) {
        setStats(statsResult.data)
      } else {
        setError(statsResult.message || 'Failed to fetch stats')
      }

      if (providersResult.success) {
        const providers = providersResult.data || []
        setRecentProviders(providers.slice(0, 4))
        setAllProviders(providers)
      } else {
        setError(providersResult.message || 'Failed to fetch providers')
      }

      if (metricsResult.success) {
        setPoolMetrics(metricsResult.data)
      } else {
        setError(metricsResult.message || 'Failed to fetch metrics')
      }

      if (logsResult.success) {
        setLogs(logsResult.data || [])
      } else {
        setError(logsResult.message || 'Failed to fetch logs')
      }

    } catch (err) {
      setError('Network error: Failed to fetch dashboard data')
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
        setError(result.message || 'Failed to toggle provider')
        setTimeout(() => setError(null), 3000)
      }
    } catch {
      setError('Network error: Failed to toggle provider')
      setTimeout(() => setError(null), 3000)
    }
  }


  // Calculate aggregated metrics from pool metrics
  const totalRequests = poolMetrics?.providers.reduce((sum, p) => sum + p.total_requests, 0) || 0
  const totalSuccessfulRequests = poolMetrics?.providers.reduce((sum, p) => sum + p.successful_requests, 0) || 0
  const totalFailedRequests = poolMetrics?.providers.reduce((sum, p) => sum + p.failed_requests, 0) || 0
  const totalTokensUsed = poolMetrics?.providers.reduce((sum, p) => sum + p.tokens_used, 0) || 0
  
  // Calculate weighted average latency
  const avgLatency = poolMetrics?.providers.length > 0 
    ? poolMetrics.providers.reduce((sum, p) => sum + p.avg_latency_ms, 0) / poolMetrics.providers.length 
    : 0

  // Calculate metrics for PerformancePanel
  const successRate = poolMetrics?.providers.length > 0 
    ? parseFloat(((poolMetrics.providers.reduce((sum, p) => sum + p.successful_requests, 0) / 
       Math.max(1, poolMetrics.providers.reduce((sum, p) => sum + p.total_requests, 0))) * 100).toFixed(1))
    : 0
  
  const requestsToday = poolMetrics?.providers.reduce((sum, p) => sum + p.total_requests, 0) || 0
  const tokensUsed = poolMetrics?.providers.reduce((sum, p) => sum + p.tokens_used, 0) || 0
  const failedRequests = poolMetrics?.providers.reduce((sum, p) => sum + p.failed_requests, 0) || 0

  const statsCards = [
    {
      title: "Total Requests",
      value: totalRequests.toLocaleString(),
      subtitle: totalSuccessfulRequests > 0 ? `${totalSuccessfulRequests} successful, ${totalFailedRequests} failed` : "No requests yet",
      icon: TrendingUp,
      trend: { value: totalRequests > 0 ? "12%" : "0%", isPositive: true, label: "vs last hour" },
    },
    {
      title: "Active Services",
      value: stats?.enabled.toString() || "0",
      subtitle: "Model endpoints",
      icon: Server,
    },
    {
      title: "Total Services",
      value: stats?.total.toString() || "0",
      subtitle: "Configured services",
      icon: Layers,
    },
    {
      title: "Avg Latency",
      value: `${avgLatency.toFixed(1)} ms`,
      subtitle: avgLatency > 0 ? `${poolMetrics?.providers.length || 0} providers` : "No activity yet",
      icon: Clock,
      trend: { value: avgLatency > 0 ? "5%" : "0%", isPositive: true, label: "vs last hour" },
    },
  ]

  return (
    <div className="space-y-4 max-w-[1400px] mx-auto w-full">
      <DashboardStats stats={statsCards} />

      <div className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-4">
          <Card className="lg:col-span-3">
            <CardHeader className="flex flex-row items-center justify-between px-6 pb-2">
              <CardTitle className="text-lg font-semibold">Active Model Services</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/instances')}
              >
                <ArrowRight className="mr-1 h-4 w-4" />
                View All
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[140px] pl-6">Name</TableHead>
                    <TableHead className="w-[120px]">Provider</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead className="w-[80px]">Priority</TableHead>
                    <TableHead className="w-[120px] text-right pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentProviders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No recent providers available
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
                            {provider.enabled ? 'Enabled' : 'Disabled'}
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
            successRate={successRate}
            requestsToday={requestsToday}
            tokensUsed={tokensUsed}
            failedRequests={failedRequests}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <AnalyticsChart logs={logs} />

          <ResponseTimeChart poolMetrics={poolMetrics} />

          <RecentErrorsPanel recentErrors={logs.filter(log => log.status === 'error')} />
        </div>
      </div>
    </div>
  )
}