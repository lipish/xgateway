import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import { useI18n, t } from "@/lib/i18n"
import { Settings, Save, RotateCcw } from "lucide-react"

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
    } catch (err) {
      console.error('Failed to fetch settings:', err)
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
    <div className="flex flex-col">
      <div className="flex-1 space-y-6 p-6 max-w-[1600px] mx-auto w-full">
        {message && (
          <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
            {message.text}
          </div>
        )}

        <div className="flex gap-2">
          <Button onClick={saveSettings} disabled={saving}>
            <Save className="mr-2 h-4 w-4" /> {saving ? t('settings.saving') : t('settings.save')}
          </Button>
          <Button variant="outline" onClick={resetToDefaults}>
            <RotateCcw className="mr-2 h-4 w-4" /> {t('settings.reset')}
          </Button>
        </div>

        {loading ? (
          <Card><CardContent className="p-6 text-center">{t('common.loading')}</CardContent></Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" /> {t('settings.loadBalance')}
                </CardTitle>
                <CardDescription>{t('settings.loadBalanceDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">{t('settings.strategy')}</label>
                  <select
                    className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2"
                    value={settings.load_balance_strategy}
                    onChange={(e) => setSettings({ ...settings, load_balance_strategy: e.target.value })}
                  >
                    {STRATEGIES.map(s => (
                      <option key={s.value} value={s.value}>{t(`settings.${s.value}` as any)}</option>
                    ))}
                  </select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('settings.healthCheck')}</CardTitle>
                <CardDescription>{t('settings.healthCheckProviderDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">{t('settings.interval')}</label>
                  <Input
                    type="number"
                    value={settings.health_check_interval_secs}
                    onChange={(e) => setSettings({ ...settings, health_check_interval_secs: parseInt(e.target.value) || 30 })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('settings.circuitBreaker')}</CardTitle>
                <CardDescription>{t('settings.circuitBreakerThresholdDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">{t('settings.threshold')} ({t('settings.thresholdUnit')})</label>
                  <Input
                    type="number"
                    value={settings.circuit_breaker_threshold}
                    onChange={(e) => setSettings({ ...settings, circuit_breaker_threshold: parseInt(e.target.value) || 5 })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">{t('settings.thresholdHint')}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">{t('settings.timeout')}</label>
                  <Input
                    type="number"
                    value={settings.circuit_breaker_timeout_secs}
                    onChange={(e) => setSettings({ ...settings, circuit_breaker_timeout_secs: parseInt(e.target.value) || 60 })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">{t('settings.timeoutHint')}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('settings.retry')}</CardTitle>
                <CardDescription>{t('settings.retryStrategyDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">{t('settings.maxRetries')}</label>
                  <Input
                    type="number"
                    value={settings.max_retries}
                    onChange={(e) => setSettings({ ...settings, max_retries: parseInt(e.target.value) || 3 })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">{t('settings.retryDelay')}</label>
                  <Input
                    type="number"
                    value={settings.retry_delay_ms}
                    onChange={(e) => setSettings({ ...settings, retry_delay_ms: parseInt(e.target.value) || 1000 })}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}