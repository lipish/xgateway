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
import { Header } from "@/components/layout/header"
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
        apiGet('/api/providers/stats'),
        apiGet('/api/providers')
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
      const result = await apiPost(`/api/providers/${id}/test`)
      const elapsed = Date.now() - startTime
      if (elapsed < minLoadingTime) {
        await new Promise(resolve => setTimeout(resolve, minLoadingTime - elapsed))
      }
      setTestResult({ id, success: result.success, message: result.message || (result.success ? '连接成功' : '连接失败') })
    } catch {
      const elapsed = Date.now() - startTime
      if (elapsed < minLoadingTime) {
        await new Promise(resolve => setTimeout(resolve, minLoadingTime - elapsed))
      }
      setTestResult({ id, success: false, message: '网络错误' })
    } finally {
      setTestingId(null)
    }
  }

  const toggleProvider = async (id: number) => {
    try {
      const result = await apiPost(`/api/providers/${id}/toggle`)
      if (result.success) {
        setRecentProviders(recentProviders.map(p => p.id === id ? result.data : p))
        // 静默更新统计数据，不触发 loading 状态
        const statsResult = await apiGet('/api/providers/stats')
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
      <Header
        title={t('dashboard.title')}
        description={t('dashboard.description')}
        onRefresh={fetchDashboardData}
        actions={
          <Button size="sm" onClick={() => navigate('/providers?add=true')}>
            <Plus className="mr-2 h-4 w-4" />
            {t('dashboard.addProvider')}
          </Button>
        }
      />

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
              <div className="text-center text-red-500">{error}</div>
              <div className="text-center mt-2">
                <Button onClick={fetchDashboardData}>Retry</Button>
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
          <div className="grid gap-4 md:grid-cols-7">
            {/* Providers Table */}
            <Card className="md:col-span-4">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>最近的 Providers</CardTitle>
                    <CardDescription>
                      管理您的 AI 服务提供商
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate('/providers')}>
                    查看全部
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>名称</TableHead>
                      <TableHead>类型</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>优先级</TableHead>
                      <TableHead>创建时间</TableHead>
                      <TableHead className="w-[100px]">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentProviders.map((provider) => (
                      <TableRow key={provider.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className={`h-2 w-2 rounded-full ${
                                provider.enabled ? "bg-green-500" : "bg-red-500"
                              }`}
                            />
                            <span className="font-medium">{provider.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{provider.provider_type}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={provider.enabled ? "success" : "destructive"}
                          >
                            {provider.enabled ? "启用" : "禁用"}
                          </Badge>
                        </TableCell>
                        <TableCell>{provider.priority}</TableCell>
                        <TableCell>{new Date(provider.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={provider.enabled}
                              onCheckedChange={() => toggleProvider(provider.id)}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              title="测试连接"
                              onClick={() => testProvider(provider.id)}
                              disabled={testingId === provider.id}
                            >
                              {testingId === provider.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : testResult?.id === provider.id ? (
                                <Activity className={`h-4 w-4 ${testResult.success ? 'text-green-500' : 'text-red-500'}`} />
                              ) : (
                                <Activity className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title={provider.enabled ? "开始对话" : "Provider 已禁用"}
                              onClick={() => navigate(`/chat?provider=${provider.id}`)}
                              disabled={!provider.enabled}
                            >
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="md:col-span-3">
              <CardHeader>
                <CardTitle>{t('dashboard.quickActions')}</CardTitle>
                <CardDescription>{t('common.loading')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button className="w-full justify-start" variant="outline">
                  <Activity className="mr-2 h-4 w-4" />
                  {t('dashboard.testAllProviders')}
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Settings className="mr-2 h-4 w-4" />
                  {t('dashboard.batchEdit')}
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  {t('dashboard.viewReport')}
                </Button>
                <Button
                  className="w-full justify-start"
                  variant="outline"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t('dashboard.cleanupProviders')}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle>系统状态</CardTitle>
            <CardDescription>实时监控系统运行状态</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center gap-4 rounded-lg border p-4">
                <div className="h-3 w-3 rounded-full bg-green-500" />
                <div>
                  <p className="text-sm font-medium">API 网关</p>
                  <p className="text-xs text-muted-foreground">运行正常 (端口 3000)</p>
                </div>
              </div>
              <div className="flex items-center gap-4 rounded-lg border p-4">
                <div className={`h-3 w-3 rounded-full ${stats && stats.enabled > 0 ? 'bg-green-500' : 'bg-yellow-500'}`} />
                <div>
                  <p className="text-sm font-medium">Provider 池</p>
                  <p className="text-xs text-muted-foreground">
                    {stats && stats.enabled > 0 ? `${stats.enabled} 个可用` : '无可用 Provider'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
