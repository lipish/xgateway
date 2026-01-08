import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { t } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { Settings, Save, RotateCcw, RefreshCw, Loader2, Shield, Zap, Heart } from "lucide-react"
import { PageHeader } from "@/components/layout/page-header"

interface PoolSettings {
  load_balance_strategy: string
  health_check_interval_secs: number
  circuit_breaker_threshold: number
  circuit_breaker_timeout_secs: number
  max_retries: number
  retry_delay_ms: number
}

const STRATEGIES = [
  { value: "round_robin", label: "round_robin" },
  { value: "least_connections", label: "least_connections" },
  { value: "weighted", label: "weighted" },
  { value: "random", label: "random" },
  { value: "priority", label: "priority" },
  { value: "latency", label: "latency" },
  { value: "lowest_price", label: "lowest_price" },
  { value: "quota_aware", label: "quota_aware" },
]

export function SettingsPage() {
  const [settings, setSettings] = useState<PoolSettings>({
    load_balance_strategy: "round_robin",
    health_check_interval_secs: 30,
    circuit_breaker_threshold: 5,
    circuit_breaker_timeout_secs: 60,
    max_retries: 3,
    retry_delay_ms: 1000,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/pool/settings')
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          setSettings(data.data)
        }
      }
    } catch {
      console.error('Failed to fetch settings')
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    try {
      setSaving(true)
      const response = await fetch('/api/pool/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })
      const data = await response.json()
      if (data.success) {
        setMessage({ type: 'success', text: t('settings.settingsSaved') })
      } else {
        setMessage({ type: 'error', text: data.message || t('settings.saveFailed') })
      }
    } catch (err) {
      setMessage({ type: 'error', text: t('common.networkError') })
    } finally {
      setSaving(false)
      setTimeout(() => setMessage(null), 3000)
    }
  }

  const resetToDefaults = () => {
    setSettings({
      load_balance_strategy: "round_robin",
      health_check_interval_secs: 30,
      circuit_breaker_threshold: 5,
      circuit_breaker_timeout_secs: 60,
      max_retries: 3,
      retry_delay_ms: 1000,
    })
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col page-transition overflow-y-auto p-6 scrollbar-hide">
      <PageHeader
        title={t('settings.title')}
        subtitle={t('settings.description')}
      />

      <div className="flex-1 space-y-6 max-w-[1200px] mx-auto w-full lg:px-4">
        {loading ? (
          <div className="grid gap-6 md:grid-cols-2">
            {[1, 2, 3, 4].map(i => (
              <Card key={i} className="border-none shadow-sm bg-card/50">
                <CardHeader className="pb-3">
                  <Skeleton className="h-6 w-32 mb-1" />
                  <Skeleton className="h-4 w-full" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2 text-purple-600 mb-1">
                    <Zap className="h-5 w-5" />
                    <CardTitle className="text-lg font-semibold tracking-tight">{t('settings.loadBalance')}</CardTitle>
                  </div>
                  <CardDescription className="text-sm font-medium opacity-80">{t('settings.loadBalanceDesc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">{t('settings.strategy')}</Label>
                    <Select
                      value={settings.load_balance_strategy}
                      onChange={(value) => setSettings({ ...settings, load_balance_strategy: value })}
                      options={STRATEGIES.map(s => ({ value: s.value, label: t(`scheduling.strategies.${s.value}`) || s.label }))}
                      triggerClassName="h-10"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2 text-purple-600 mb-1">
                    <Heart className="h-5 w-5" />
                    <CardTitle className="text-lg font-semibold tracking-tight">{t('settings.healthCheck')}</CardTitle>
                  </div>
                  <CardDescription className="text-sm font-medium opacity-80">{t('settings.healthCheckDesc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">{t('settings.interval')} ({t('common.seconds')})</Label>
                    <Input
                      type="number"
                      value={settings.health_check_interval_secs}
                      onChange={e => setSettings({ ...settings, health_check_interval_secs: parseInt(e.target.value) })}
                      className="h-10"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2 text-purple-600 mb-1">
                    <Shield className="h-5 w-5" />
                    <CardTitle className="text-lg font-semibold tracking-tight">{t('settings.circuitBreaker')}</CardTitle>
                  </div>
                  <CardDescription className="text-sm font-medium opacity-80">{t('settings.circuitBreakerDesc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">{t('settings.threshold')}</Label>
                      <Input
                        type="number"
                        value={settings.circuit_breaker_threshold}
                        onChange={e => setSettings({ ...settings, circuit_breaker_threshold: parseInt(e.target.value) })}
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">{t('settings.timeout')} ({t('common.seconds')})</Label>
                      <Input
                        type="number"
                        value={settings.circuit_breaker_timeout_secs}
                        onChange={e => setSettings({ ...settings, circuit_breaker_timeout_secs: parseInt(e.target.value) })}
                        className="h-10"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2 text-purple-600 mb-1">
                    <RotateCcw className="h-5 w-5" />
                    <CardTitle className="text-lg font-semibold tracking-tight">{t('settings.retry')}</CardTitle>
                  </div>
                  <CardDescription className="text-sm font-medium opacity-80">{t('settings.retryDesc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">{t('settings.maxRetries')}</Label>
                      <Input
                        type="number"
                        value={settings.max_retries}
                        onChange={e => setSettings({ ...settings, max_retries: parseInt(e.target.value) })}
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">{t('settings.retryDelay')} (ms)</Label>
                      <Input
                        type="number"
                        value={settings.retry_delay_ms}
                        onChange={e => setSettings({ ...settings, retry_delay_ms: parseInt(e.target.value) })}
                        className="h-10"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/50">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetToDefaults}
                  className="h-10 px-6 gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  {t('settings.resetToDefaults')}
                </Button>
              </div>
              <div className="flex items-center gap-3">
                {message && (
                  <span className={cn(
                    "text-sm font-medium px-3 py-1 rounded-full",
                    message.type === 'success' ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                  )}>
                    {message.text}
                  </span>
                )}
                <Button
                  onClick={saveSettings}
                  disabled={saving}
                  className="h-10 px-10 gap-2 bg-purple-600 hover:bg-purple-700 text-white border-0"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {t('common.save')}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}