import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { t } from "@/lib/i18n"
import { Activity, Heart, Shield, Gauge, RefreshCw, AlertTriangle, CheckCircle, XCircle } from "lucide-react"
import { PageHeader } from "@/components/layout/page-header"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

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
      case 'healthy': return <CheckCircle className="h-4 w-4 text-muted-foreground" />
      case 'degraded': return <AlertTriangle className="h-4 w-4 text-muted-foreground" />
      case 'unhealthy': return <XCircle className="h-4 w-4 text-muted-foreground" />
      default: return <Activity className="h-4 w-4 text-muted-foreground" />
    }
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col page-transition overflow-y-auto p-6 scrollbar-hide">
      <PageHeader
        title="Metrics"
        subtitle={t('dashboard.description')}
        onRefresh={fetchMonitoringData}
        loading={loading}
      />
      <div className="flex-1 space-y-4 max-w-[1400px] mx-auto w-full">

        {error && (
          <div className="p-4 rounded-lg bg-destructive/5 text-destructive border border-destructive/20 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        {/* Pool Overview */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t('monitoring.healthyProviders')}</CardTitle>
              <Heart className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-8 w-20" /> : (
                <div className="text-2xl font-bold">
                  {poolStatus?.healthy_providers ?? '--'} <span className="text-sm font-normal text-muted-foreground">/ {poolStatus?.total_providers ?? '--'}</span>
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t('monitoring.loadBalanceStrategy')}</CardTitle>
              <Gauge className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-8 w-32" /> : (
                <div className="text-2xl font-bold">{poolStatus?.load_balance_strategy ?? 'RoundRobin'}</div>
              )}
            </CardContent>
          </Card>
          <Card className="transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t('monitoring.todayRequests')}</CardTitle>
              <Activity className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-8 w-24" /> : (
                <div className="text-2xl font-bold">{poolStatus?.total_requests_today ?? '--'}</div>
              )}
            </CardContent>
          </Card>
          <Card className="transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t('monitoring.avgLatency')}</CardTitle>
              <Shield className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-8 w-28" /> : (
                <div className="text-2xl font-bold">{poolStatus?.avg_latency_ms ?? '--'} <span className="text-sm font-normal text-muted-foreground">ms</span></div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Provider Health Details */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div className="space-y-1">
              <CardTitle>{t('monitoring.providerHealthStatus')}</CardTitle>
              <CardDescription>{t('monitoring.providerHealthDesc')}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {loading && providerHealth.length === 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : providerHealth.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>{t('monitoring.noProviderData')}</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {providerHealth.map((provider) => (
                  <Card key={provider.id} className="overflow-hidden border-muted/60 transition-colors">
                    <CardHeader className="pb-3 bg-muted/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(provider.status)}
                          <CardTitle className="text-base font-semibold">{provider.name}</CardTitle>
                        </div>
                        <Badge
                          variant="outline"
                          className="border-0 bg-muted text-muted-foreground"
                        >
                          {provider.circuit_state === 'closed' ? t('monitoring.circuitClosed') :
                            provider.circuit_state === 'open' ? t('monitoring.circuitOpen') :
                              provider.circuit_state === 'half_open' ? t('monitoring.circuitHalfOpen') :
                                t('monitoring.circuitUnknown')}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">{t('monitoring.successRate')}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-foreground/20"
                              style={{ width: `${provider.success_rate}%` }}
                            />
                          </div>
                          <span className="font-medium">
                            {provider.success_rate.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">{t('monitoring.avgLatencyLabel')}</span>
                        <span className="font-medium">{provider.latency_avg.toFixed(0)} ms</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">{t('monitoring.activeConnections')}</span>
                        <Badge variant="secondary" className="font-normal">{provider.active_connections}</Badge>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">{t('monitoring.totalRequestsLabel')}</span>
                        <span className="font-medium tabular-nums">{provider.total_requests.toLocaleString()}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}