import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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

import { useI18n, t } from "@/lib/i18n"
import {
  Server,
  Activity,
  Zap,
  Clock,
  TrendingUp,
  Plus,
  Loader2,
  MessageSquare,
  Settings,
  Trash2,
  Shield,
  BarChart3,
  Database,
  Heart,
} from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { apiGet, apiPost } from "@/lib/api"

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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [testingId, setTestingId] = useState<number | null>(null)
  const [testResult, setTestResult] = useState<{ id: number; success: boolean; message: string } | null>(null)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)

      // Fetch stats and providers in parallel
      const [statsResult, providersResult] = await Promise.all([
        apiGet('/api/instances/stats'),
        apiGet('/api/instances')
      ])

      if (statsResult.success) {
        setStats(statsResult.data)
      } else {
        setError(statsResult.message || 'Failed to fetch stats')
      }

      if (providersResult.success) {
        // Get the 4 most recent providers
        setRecentProviders((providersResult.data || []).slice(0, 4))
      } else {
        setError(providersResult.message || 'Failed to fetch providers')
      }

    } catch (err) {
      setError('Network error: Failed to fetch dashboard data')
      console.error('Error fetching dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  const testProvider = async (id: number) => {
    setTestingId(id)
    setTestResult(null)
    const startTime = Date.now()
    const minLoadingTime = 800
    try {
      const result = await apiPost(`/api/instances/${id}/test`)
      const elapsed = Date.now() - startTime
      if (elapsed < minLoadingTime) {
        await new Promise(resolve => setTimeout(resolve, minLoadingTime - elapsed))
      }
      setTestResult({ id, success: result.success, message: result.message || (result.success ? t('dashboard.connectionSuccess') : t('dashboard.connectionFailed')) })
    } catch {
      const elapsed = Date.now() - startTime
      if (elapsed < minLoadingTime) {
        await new Promise(resolve => setTimeout(resolve, minLoadingTime - elapsed))
      }
      setTestResult({ id, success: false, message: t('dashboard.networkError') })
    } finally {
      setTestingId(null)
    }
  }

  const toggleProvider = async (id: number) => {
    try {
      const result = await apiPost(`/api/instances/${id}/toggle`)
      if (result.success) {
        setRecentProviders(recentProviders.map(p => p.id === id ? result.data : p))
        // 静默更新统计数据，不触发 loading 状态
        const statsResult = await apiGet('/api/instances/stats')
        if (statsResult.success) {
          setStats(statsResult.data)
        }
      } else {
        alert(result.message || 'Failed to toggle provider')
      }
    } catch {
      alert('Network error: Failed to toggle provider')
    }
  }


  const statsCards = [
    {
      title: t('dashboard.totalProviders'),
      value: stats?.total.toString() || "0",
      subtitle: t('dashboard.totalProvidersDesc'),
      icon: Server,
    },
    {
      title: t('dashboard.enabledProviders'),
      value: stats?.enabled.toString() || "0",
      subtitle: t('dashboard.enabledProvidersDesc'),
      icon: Activity,
    },
    {
      title: t('dashboard.todayRequests'),
      value: "—",
      subtitle: t('dashboard.todayRequestsDesc'),
      icon: Zap,
    },
    {
      title: t('dashboard.avgLatency'),
      value: "—",
      subtitle: t('dashboard.avgLatencyDesc'),
      icon: Clock,
    },
  ]
  return (
    <div className="flex flex-col">

      <div className="flex-1 space-y-6 p-6 max-w-[1600px] mx-auto w-full">
        {/* Loading and Error States */}
        {loading && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                  <div className="h-4 w-4 bg-muted animate-pulse rounded" />
                </CardHeader>
                <CardContent>
                  <div className="h-8 w-12 bg-muted animate-pulse rounded mb-2" />
                  <div className="h-3 w-16 bg-muted animate-pulse rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        
        {error && (
          <Card>
            <CardContent className="p-6">
              <div className="text-center text-destructive">{error}</div>
              <div className="text-center mt-2">
                <Button onClick={fetchDashboardData}>{t('dashboard.retry')}</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        {!loading && !error && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {statsCards.map((stat) => (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <stat.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Recent Activity */}
        {!loading && !error && (
          <div className="flex gap-4">
            {/* Providers Table */}
            <Card className="flex-1 min-w-0">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle>{t('dashboard.recentProviders')}</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => navigate('/instances')}>
                    {t('dashboard.viewAll')}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('providers.name')}</TableHead>
                      <TableHead>{t('providers.status')}</TableHead>
                      <TableHead>{t('providers.model')}</TableHead>
                      <TableHead>{t('providers.priority')}</TableHead>
                      <TableHead className="w-[100px]">{t('providers.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentProviders.map((provider) => {
                      const config = (() => {
                        try {
                          return JSON.parse(provider.config)
                        } catch {
                          return {}
                        }
                      })()
                      return (
                        <TableRow key={provider.id}>
                          <TableCell>
                            <span className="font-medium">{provider.name}</span>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={provider.enabled ? "bg-primary/10 text-primary border-0" : ""}
                              variant={provider.enabled ? "outline" : "destructive"}
                            >
                              {provider.enabled ? t('providers.enabled') : t('providers.disabled')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">{config.model || '-'}</span>
                          </TableCell>
                          <TableCell>{provider.priority}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={provider.enabled}
                                onCheckedChange={() => toggleProvider(provider.id)}
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                title={t('dashboard.testConnection')}
                                onClick={() => testProvider(provider.id)}
                                disabled={testingId === provider.id}
                              >
                                {testingId === provider.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : testResult?.id === provider.id ? (
                                  <Activity className={`h-4 w-4 ${testResult.success ? 'text-success' : 'text-destructive'}`} />
                                ) : (
                                  <Activity className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                title={provider.enabled ? t('dashboard.startChat') : t('dashboard.providerDisabled')}
                                onClick={() => navigate(`/chat?provider=${provider.id}`)}
                                disabled={!provider.enabled}
                              >
                                <MessageSquare className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Comprehensive Monitoring */}
            <Card className="w-80 shrink-0 flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle>{t('dashboard.comprehensiveMonitoring')}</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-secondary/50">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <Activity className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{t('dashboard.systemLoad')}</span>
                    </div>
                    <span className="text-sm font-semibold">{t('dashboard.normal')}</span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-secondary/50">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <Zap className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{t('dashboard.responseSpeed')}</span>
                    </div>
                    <span className="text-sm font-semibold">{t('dashboard.good')}</span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-secondary/50">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${stats && stats.enabled > 0 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      <Server className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{t('dashboard.providerPool')}</span>
                    </div>
                    <span className="text-sm font-semibold">
                      {stats && stats.enabled > 0 ? `${stats.enabled}${t('dashboard.active')}` : t('dashboard.noAvailable')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-secondary/50">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <Database className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{t('dashboard.database')}</span>
                    </div>
                    <span className="text-sm font-semibold">{t('dashboard.connected')}</span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-secondary/50">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <Shield className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{t('dashboard.healthCheck')}</span>
                    </div>
                    <span className="text-sm font-semibold">{t('dashboard.passed')}</span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-secondary/50">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{t('dashboard.uptime')}</span>
                    </div>
                    <span className="text-sm font-semibold">{t('dashboard.stable')}</span>
                  </div>
                </div>
                <div className="pt-3 mt-auto">
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => navigate('/monitoring')}
                  >
                    <BarChart3 className="mr-2 h-4 w-4" />
                    {t('dashboard.viewDetailedMonitoring')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}