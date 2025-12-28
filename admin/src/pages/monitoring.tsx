import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Header } from "@/components/layout/header"
import { useI18n, t } from "@/lib/i18n"
import { Activity, Heart, Shield, Gauge, RefreshCw, AlertTriangle, CheckCircle, XCircle } from "lucide-react"

interface ProviderHealth {
  id: number
  name: string
  status: "healthy" | "degraded" | "unhealthy" | "unknown"
  latency_avg: number
  success_rate: number
  circuit_state: "closed" | "open" | "half_open"
  active_connections: number
  total_requests: number
  last_check: string
}

interface PoolStatus {
  total_providers: number
  healthy_providers: number
  degraded_providers: number
  unhealthy_providers: number
  load_balance_strategy: string
  total_requests_today: number
  avg_latency_ms: number
}

export function MonitoringPage() {
  const [poolStatus, setPoolStatus] = useState<PoolStatus | null>(null)
  const [providerHealth, setProviderHealth] = useState<ProviderHealth[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(false)

  useEffect(() => {
    fetchMonitoringData()
    let interval: ReturnType<typeof setInterval> | null = null
    if (autoRefresh) {
      interval = setInterval(fetchMonitoringData, 5000)
    }
    return () => { if (interval) clearInterval(interval) }
  }, [autoRefresh])

  const fetchMonitoringData = async () => {
    try {
      setLoading(true)
      const [poolRes, healthRes] = await Promise.all([
        fetch('/api/pool/status'),
        fetch('/api/pool/health')
      ])
      
      if (poolRes.ok) {
        const poolData = await poolRes.json()
        if (poolData.success) setPoolStatus(poolData.data)
      }
      
      if (healthRes.ok) {
        const healthData = await healthRes.json()
        if (healthData.success) setProviderHealth(healthData.data || [])
      }
      
      setError(null)
    } catch (err) {
      setError('Failed to fetch monitoring data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'degraded': return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'unhealthy': return <XCircle className="h-4 w-4 text-red-500" />
      default: return <Activity className="h-4 w-4 text-gray-400" />
    }
  }

  const getCircuitBadge = (state: string) => {
    switch (state) {
      case 'closed': return <Badge variant="success">闭合</Badge>
      case 'open': return <Badge variant="destructive">断开</Badge>
      case 'half_open': return <Badge variant="secondary">半开</Badge>
      default: return <Badge variant="outline">未知</Badge>
    }
  }

  return (
    <div className="flex flex-col">
      <Header title={t('monitoring.title')} description={t('monitoring.description')} />

      <div className="flex-1 space-y-6 p-6 max-w-[1600px] mx-auto w-full">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchMonitoringData}>
              <RefreshCw className="mr-2 h-4 w-4" /> {t('monitoring.refresh')}
            </Button>
            <Button
              variant={autoRefresh ? "default" : "outline"}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? t('monitoring.stopAutoRefresh') : t('monitoring.autoRefresh')}
            </Button>
          </div>
        </div>

        {error && (
          <Card><CardContent className="p-6 text-center text-red-500">{error}</CardContent></Card>
        )}

        {/* Pool Overview */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">健康 Providers</CardTitle>
              <Heart className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {poolStatus?.healthy_providers ?? '--'} / {poolStatus?.total_providers ?? '--'}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">负载均衡策略</CardTitle>
              <Gauge className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{poolStatus?.load_balance_strategy ?? 'RoundRobin'}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">今日请求</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{poolStatus?.total_requests_today ?? '--'}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">平均延迟</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{poolStatus?.avg_latency_ms ?? '--'} ms</div>
            </CardContent>
          </Card>
        </div>

        {/* Provider Health Details */}
        <Card>
          <CardHeader>
            <CardTitle>Provider 健康状态</CardTitle>
            <CardDescription>各 Provider 的实时健康指标和熔断器状态</CardDescription>
          </CardHeader>
          <CardContent>
            {loading && <div className="text-center py-4">加载中...</div>}
            {!loading && providerHealth.length === 0 && (
              <div className="text-center py-4 text-muted-foreground">暂无 Provider 数据</div>
            )}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {providerHealth.map((provider) => (
                <Card key={provider.id} className="border-2">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(provider.status)}
                        <CardTitle className="text-base">{provider.name}</CardTitle>
                      </div>
                      {getCircuitBadge(provider.circuit_state)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">成功率</span>
                      <span className={provider.success_rate >= 95 ? "text-green-600" : provider.success_rate >= 80 ? "text-yellow-600" : "text-red-600"}>
                        {provider.success_rate.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">平均延迟</span>
                      <span>{provider.latency_avg.toFixed(0)} ms</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">活跃连接</span>
                      <span>{provider.active_connections}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">总请求数</span>
                      <span>{provider.total_requests}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
