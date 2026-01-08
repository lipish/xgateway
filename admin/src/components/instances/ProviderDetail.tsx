import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Server,
  Key,
  Link,
  Calendar,
  Settings,
  Pencil,
  Trash2,
  ExternalLink,
  Activity,
  MessageSquare,
  Loader2,
} from "lucide-react"
import { t } from "@/lib/i18n"
import type { Provider, ProviderTypeConfig } from "./types"
import { parseProviderConfig } from "./utils"
import { getProviderIcon } from "../providers/utils"

interface ProviderDetailProps {
  provider: Provider | null
  providerTypeConfig?: ProviderTypeConfig
  onEdit: (provider: Provider) => void
  onDelete: (id: number) => void
  onTest: (id: number) => void
  onNavigateToChat: (id: number) => void
  testingId: number | null
  testResult: { id: number; success: boolean; message: string } | null
  isAdmin?: boolean
}

export function ProviderDetail({ provider, providerTypeConfig, onEdit, onDelete, onTest, onNavigateToChat, testingId, testResult, isAdmin = true }: ProviderDetailProps) {
  if (!provider) {
    return (
      <div className="w-[35%] bg-white rounded-xl shadow-sm border flex flex-col overflow-hidden">
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-6">
          <Server className="h-12 w-12 mb-3 opacity-20" />
          <p className="text-sm">{t('providers.selectProvider')}</p>
          <p className="text-xs mt-1">{t('providers.viewConfig')}</p>
        </div>
      </div>
    )
  }

  const config = parseProviderConfig(provider)
  const providerIcon = getProviderIcon(provider.provider_type)

  return (
    <div className="w-[35%] bg-white rounded-xl shadow-sm border flex flex-col overflow-hidden">
      {/* Header with gradient background */}
      <div className="px-6 py-4 bg-gradient-to-r from-muted/30 to-muted/10 border-b">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-3">
            <div
              className={`h-12 w-12 rounded-xl flex items-center justify-center ${provider.enabled ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}
            >
              {providerIcon ? (
                <img src={providerIcon} alt={provider.provider_type} className="h-8 w-8 object-contain" />
              ) : (
                <Server className="h-6 w-6" />
              )}
            </div>
            <div>
              <h4 className="font-bold text-xl mb-1">
                {provider.name}
              </h4>
              <Badge variant="secondary" className="text-xs">
                {provider.provider_type}
              </Badge>
            </div>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => !testingId && onTest(provider.id)}
              disabled={!!testingId}
              title={testingId === provider.id ? t('providers.testConnection') : testResult?.id === provider.id ? (testResult.success ? t('providers.connectionSuccess') : t('providers.connectionFailed')) : t('providers.testConnection')}
            >
              {testingId === provider.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : testResult?.id === provider.id ? (
                <Activity className={`h-4 w-4 ${testResult.success ? "text-primary" : "text-destructive"}`} />
              ) : (
                <Activity className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => provider.enabled && onNavigateToChat(provider.id)}
              disabled={!provider.enabled}
              title={!provider.enabled ? t('providers.providerDisabled') : t('providers.startChat')}
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
            {isAdmin && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onEdit(provider)}
                  title={t('providers.edit')}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:text-destructive"
                  onClick={() => onDelete(provider.id)}
                  title={t('providers.delete')}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
        {providerTypeConfig?.docs_url && (
          <a
            href={providerTypeConfig.docs_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors ml-15"
            title={t('providers.viewDocs')}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>{t('providers.viewDocs')}</span>
          </a>
        )}
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-auto p-6 space-y-5 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {/* Configuration section */}
        <div className="space-y-3">
          <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {t('providers.configInfo')}
          </h5>
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
              <div className="flex items-start gap-2">
                <Link className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    {t('providers.baseUrl')}
                  </p>
                  <p className="font-mono text-xs break-all">
                    {config.base_url || "-"}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
              <div className="flex items-start gap-2">
                <Settings className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground mb-1">{t('providers.model')}</p>
                  <p className="font-mono text-xs">
                    {config.model || "-"}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
              <div className="flex items-start gap-2">
                <Key className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    API Key
                  </p>
                  <p className="font-mono text-xs break-all">
                    {config.api_key && config.api_key.length > 8
                      ? config.api_key.slice(0, 4) + "••••" + config.api_key.slice(-4)
                      : config.api_key || "-"}
                  </p>
                </div>
              </div>
            </div>

            {provider.provider_type === 'tencent' && provider.secret_id && (
              <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                <div className="flex items-start gap-2">
                  <Key className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Secret ID
                    </p>
                    <p className="font-mono text-xs break-all">
                      {provider.secret_id && provider.secret_id.length > 8
                        ? provider.secret_id.slice(0, 4) + "••••" + provider.secret_id.slice(-4)
                        : provider.secret_id || "-"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {provider.provider_type === 'tencent' && provider.secret_key && (
              <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                <div className="flex items-start gap-2">
                  <Key className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Secret Key
                    </p>
                    <p className="font-mono text-xs break-all">
                      {provider.secret_key && provider.secret_key.length > 8
                        ? provider.secret_key.slice(0, 4) + "••••" + provider.secret_key.slice(-4)
                        : provider.secret_key || "-"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {provider.provider_type === 'volcengine' && provider.endpoint && (
              <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                <div className="flex items-start gap-2">
                  <Settings className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-muted-foreground mb-1">{t('providers.endpoint')}</p>
                    <p className="font-mono text-xs">
                      {provider.endpoint}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Pricing & Quota section */}
        <div className="space-y-3 pt-3 border-t">
          <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {t('providers.pricingAndQuota') || 'Pricing & Quota'}
          </h5>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
              <p className="text-[10px] font-medium text-muted-foreground mb-1">
                {t('providers.inputPrice')}
              </p>
              <p className="text-sm font-semibold">
                {config.input_price ? `¥${config.input_price}` : "¥0.00"}
                <span className="text-[10px] text-muted-foreground ml-1">/1M</span>
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
              <p className="text-[10px] font-medium text-muted-foreground mb-1">
                {t('providers.outputPrice')}
              </p>
              <p className="text-sm font-semibold">
                {config.output_price ? `¥${config.output_price}` : "¥0.00"}
                <span className="text-[10px] text-muted-foreground ml-1">/1M</span>
              </p>
            </div>
            <div className={`p-3 rounded-lg border border-border/50 ${config.quota_limit ? 'bg-primary/5 border-primary/20' : 'bg-muted/30'}`}>
              <p className="text-[10px] font-medium text-muted-foreground mb-1">
                {t('providers.quotaLimit')}
              </p>
              <p className="text-sm font-semibold">
                {config.quota_limit ? config.quota_limit.toLocaleString() : "∞"}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
              <p className="text-[10px] font-medium text-muted-foreground mb-1">
                {t('providers.tokensUsed')}
              </p>
              <p className="text-sm font-semibold text-primary">
                {/* Note: This value would typically come from a dynamic metrics API, 
                    but for now we show it's available. In a real integration, 
                    we'd fetch this from /api/monitoring/providers/:id */}
                -
              </p>
            </div>
          </div>
        </div>

        {/* Time info section */}
        <div className="space-y-3 pt-3 border-t">
          <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {t('providers.timeInfo')}
          </h5>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span className="font-medium">{t('providers.createdAt')}:</span>
              <span className="text-foreground">
                {new Date(provider.created_at).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span className="font-medium">{t('providers.updatedAt')}:</span>
              <span className="text-foreground">
                {new Date(provider.updated_at).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}