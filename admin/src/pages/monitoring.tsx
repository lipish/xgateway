import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useI18n, t } from "@/lib/i18n"
import { Activity, Heart, Shield, Gauge, RefreshCw, AlertTriangle, CheckCircle, XCircle } from "lucide-react"
import { Header } from "@/components/layout/header"
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
      case 'healthy': return <CheckCircle className="h-4 w-4 text-primary" />
      case 'degraded': return <AlertTriangle className="h-4 w-4 text-amber-500" />
      case 'unhealthy': return <XCircle className="h-4 w-4 text-destructive" />
      default: return <Activity className="h-4 w-4 text-muted-foreground" />
    }
  }

  return (
    <div className="flex flex-col page-transition">
      <Header
        title={t('nav.monitoring')}
        subtitle={t('dashboard.description')}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchMonitoringData}
              disabled={loading}
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
              {t('common.refresh')}
            </Button>
            <Button
              variant={autoRefresh ? "secondary" : "outline"}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={cn(autoRefresh && "bg-primary/10 text-primary hover:bg-primary/20")}
            >
              <Activity className={cn("h-4 w-4 mr-2", autoRefresh && "animate-pulse")} />
              {autoRefresh ? t('monitoring.stopAutoRefresh') : t('monitoring.autoRefresh')}
            </Button>
          </div>
        }
      />
      <div className="flex-1 space-y-4 max-w-[1600px] mx-auto w-full">

        {error && (
          <div className="p-4 rounded-lg bg-destructive/5 text-destructive border border-destructive/20 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        {/* Pool Overview */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t('monitoring.healthyProviders')}</CardTitle>
              <Heart className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {poolStatus?.healthy_providers ?? '--'} <span className="text-sm font-normal text-muted-foreground">/ {poolStatus?.total_providers ?? '--'}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t('monitoring.loadBalanceStrategy')}</CardTitle>
              <Gauge className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{poolStatus?.load_balance_strategy ?? 'RoundRobin'}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t('monitoring.todayRequests')}</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{poolStatus?.total_requests_today ?? '--'}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t('monitoring.avgLatency')}</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{poolStatus?.avg_latency_ms ?? '--'} <span className="text-sm font-normal text-muted-foreground">ms</span></div>
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
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={fetchMonitoringData}
                disabled={loading}
                className="h-8 w-8"
                title={t('common.refresh')}
              >
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={cn("h-8 w-8", autoRefresh && "bg-primary/10 text-primary hover:bg-primary/20")}
                title={autoRefresh ? t('monitoring.stopAutoRefresh') : t('monitoring.autoRefresh')}
              >
                <Activity className={cn("h-4 w-4", autoRefresh && "animate-pulse")} />
              </Button>
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
                  <Card key={provider.id} className="overflow-hidden border-muted/60 hover:border-primary/40 transition-colors">
                    <CardHeader className="pb-3 bg-muted/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(provider.status)}
                          <CardTitle className="text-base font-semibold">{provider.name}</CardTitle>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            "border-0",
                            provider.circuit_state === 'closed' ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
                          )}
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
                              className={cn("h-full rounded-full", provider.success_rate >= 95 ? "bg-primary" : provider.success_rate >= 80 ? "bg-amber-500" : "bg-destructive")}
                              style={{ width: `${provider.success_rate}%` }}
                            />
                          </div>
                          <span className={cn("font-medium", provider.success_rate >= 95 ? "text-primary" : provider.success_rate >= 80 ? "text-amber-500" : "text-destructive")}>
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