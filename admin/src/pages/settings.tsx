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
    <div className="flex flex-col page-transition">
      <PageHeader
        title={t('settings.title')}
        subtitle={t('settings.description')}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={resetToDefaults} disabled={saving}>
              <RotateCcw className="mr-2 h-4 w-4" />
              {t('settings.reset')}
            </Button>
            <Button size="sm" onClick={saveSettings} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {t('settings.save')}
            </Button>
          </div>
        }
      />
      <div className="flex-1 space-y-6 max-w-[1400px] mx-auto w-full">

        {message && (
          <div className={`p-4 rounded-lg flex items-center gap-2 border ${message.type === 'success' ? 'bg-primary/5 text-primary border-primary/20' : 'bg-destructive/5 text-destructive border-destructive/20'}`}>
            <div className={`w-2 h-2 rounded-full ${message.type === 'success' ? 'bg-primary' : 'bg-destructive'}`} />
            <span className="text-sm font-medium">{message.text}</span>
          </div>
        )}

        {loading ? (
          <div className="grid gap-6 md:grid-cols-2">
            {[1, 2, 3, 4].map(i => (
              <Card key={i}>
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
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="hover:border-primary/40 transition-colors">
              <CardHeader className="pb-3 border-b mb-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Settings className="h-5 w-5 text-primary" /> {t('settings.loadBalance')}
                    </CardTitle>
                    <CardDescription>{t('settings.loadBalanceDesc')}</CardDescription>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={fetchSettings}
                      disabled={loading}
                      title={t('common.refresh')}
                      className="h-8 w-8"
                    >
                      <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="strategy">{t('settings.strategy')}</Label>
                  <Select
                    id="strategy"
                    value={settings.load_balance_strategy}
                    onChange={(val) => setSettings({ ...settings, load_balance_strategy: val })}
                    options={STRATEGIES.map(s => ({ value: s.value, label: t(`settings.${s.value}` as any) }))}
                    placeholder={t('settings.selectStrategy')}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="hover:border-primary/40 transition-colors">
              <CardHeader className="pb-3 border-b mb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Heart className="h-5 w-5 text-primary" /> {t('settings.healthCheck')}
                </CardTitle>
                <CardDescription>{t('settings.healthCheckProviderDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="interval">{t('settings.interval')} (s)</Label>
                  <Input
                    id="interval"
                    type="number"
                    value={settings.health_check_interval_secs}
                    onChange={(e) => setSettings({ ...settings, health_check_interval_secs: parseInt(e.target.value) || 30 })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="hover:border-primary/40 transition-colors">
              <CardHeader className="pb-3 border-b mb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Shield className="h-5 w-5 text-primary" /> {t('settings.circuitBreaker')}
                </CardTitle>
                <CardDescription>{t('settings.circuitBreakerThresholdDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="threshold">{t('settings.threshold')} ({t('settings.thresholdUnit')})</Label>
                    <Input
                      id="threshold"
                      type="number"
                      value={settings.circuit_breaker_threshold}
                      onChange={(e) => setSettings({ ...settings, circuit_breaker_threshold: parseInt(e.target.value) || 5 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timeout">{t('settings.timeout')} (s)</Label>
                    <Input
                      id="timeout"
                      type="number"
                      value={settings.circuit_breaker_timeout_secs}
                      onChange={(e) => setSettings({ ...settings, circuit_breaker_timeout_secs: parseInt(e.target.value) || 60 })}
                    />
                  </div>
                </div>
                <div className="rounded-lg bg-muted/50 p-3 space-y-1">
                  <p className="text-xs text-muted-foreground"><span className="font-semibold text-primary">{t('settings.thresholdHint')}</span>: {t('settings.thresholdHintDesc') || 'Number of failures before breaking'}</p>
                  <p className="text-xs text-muted-foreground"><span className="font-semibold text-primary">{t('settings.timeoutHint')}</span>: {t('settings.timeoutHintDesc') || 'Seconds to wait before recovery'}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:border-primary/40 transition-colors">
              <CardHeader className="pb-3 border-b mb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Zap className="h-5 w-5 text-primary" /> {t('settings.retry')}
                </CardTitle>
                <CardDescription>{t('settings.retryStrategyDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="maxRetries">{t('settings.maxRetries')}</Label>
                    <Input
                      id="maxRetries"
                      type="number"
                      value={settings.max_retries}
                      onChange={(e) => setSettings({ ...settings, max_retries: parseInt(e.target.value) || 3 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="retryDelay">{t('settings.retryDelay')} (ms)</Label>
                    <Input
                      id="retryDelay"
                      type="number"
                      value={settings.retry_delay_ms}
                      onChange={(e) => setSettings({ ...settings, retry_delay_ms: parseInt(e.target.value) || 1000 })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}