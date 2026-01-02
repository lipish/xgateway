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
} from "lucide-react"
import { t } from "@/lib/i18n"
import type { Provider, ProviderTypeConfig } from "./types"
import { parseProviderConfig } from "./utils"

interface ProviderDetailProps {
  provider: Provider | null
  providerTypeConfig?: ProviderTypeConfig
  onEdit: (provider: Provider) => void
  onDelete: (id: number) => void
}

export function ProviderDetail({ provider, providerTypeConfig, onEdit, onDelete }: ProviderDetailProps) {
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

  return (
    <div className="w-[35%] bg-white rounded-xl shadow-sm border flex flex-col overflow-hidden">
      <div className="p-4 border-b flex items-center justify-end">
        <div className="flex gap-1">
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
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => onDelete(provider.id)}
            title={t('providers.delete')}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4 space-y-4 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div
              className={`h-10 w-10 rounded-lg flex items-center justify-center ${provider.enabled ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}
            >
              <Server className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-semibold text-lg">
                {provider.name}
              </h4>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {provider.provider_type}
                </Badge>
                {providerTypeConfig?.docs_url && (
                  <a
                    href={providerTypeConfig.docs_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={t('providers.viewDocs')}
                  >
                    <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-primary" />
                  </a>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Badge
              className={provider.enabled ? "bg-primary/10 text-primary border-0" : ""}
              variant={provider.enabled ? "outline" : "destructive"}
            >
              {provider.enabled ? t('providers.enabled') : t('providers.disabled')}
            </Badge>
            <Badge variant="outline">
              {t('providers.priority')}: {provider.priority}
            </Badge>
          </div>
        </div>

        <div className="space-y-3 pt-3 border-t">
          <h5 className="text-sm font-medium text-muted-foreground">
            {t('providers.configInfo')}
          </h5>
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <Link className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-muted-foreground">
                  {t('providers.baseUrl')}
                </p>
                <p className="font-mono text-xs break-all">
                  {config.base_url || "-"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Settings className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-muted-foreground">{t('providers.model')}</p>
                <p className="font-medium">
                  {config.model || "-"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Key className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-muted-foreground">
                  API Key
                </p>
                <p className="font-mono text-xs">
                  {config.api_key
                    ? "••••••••" + config.api_key.slice(-4)
                    : "-"}
                </p>
              </div>
            </div>
            {provider.provider_type === 'volcengine' && provider.endpoint && (
              <div className="flex items-start gap-2">
                <Settings className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-muted-foreground">{t('providers.endpoint')}</p>
                  <p className="font-mono text-xs">
                    {provider.endpoint}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2 pt-3 border-t">
          <h5 className="text-sm font-medium text-muted-foreground">
            {t('providers.timeInfo')}
          </h5>
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{t('providers.createdAt')}</span>
              <span>
                {new Date(provider.created_at).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{t('providers.updatedAt')}</span>
              <span>
                {new Date(provider.updated_at).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}