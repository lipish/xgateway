import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { t } from "@/lib/i18n"
import { Loader2 } from "lucide-react"
import type { ApiKey, Service } from "./types"

interface ApiKeyDetailCardProps {
  apiKey: ApiKey
  statusUpdatingId: number | null
  onToggleStatus: (id: number) => void
  getScopeLabel: (scope: string) => string
  hasLegacyBindingButNoServiceIds: (key: ApiKey) => boolean
  migratingKeyId: number | null
  onMigrateLegacyBinding: (key: ApiKey) => void
  getBoundServices: (key: ApiKey) => Service[]
}

export function ApiKeyDetailCard({
  apiKey,
  statusUpdatingId,
  onToggleStatus,
  getScopeLabel,
  hasLegacyBindingButNoServiceIds,
  migratingKeyId,
  onMigrateLegacyBinding,
  getBoundServices,
}: ApiKeyDetailCardProps) {
  const boundServices = getBoundServices(apiKey)

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-background">
        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="text-xl font-semibold truncate">{apiKey.name}</div>
                <Badge variant={apiKey.status === "active" ? "success" : "outline"} className="shrink-0">
                  {apiKey.status === "active" ? t("apiKeys.enabled") : t("apiKeys.disabled")}
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Switch
                checked={apiKey.status === "active"}
                disabled={statusUpdatingId === apiKey.id}
                onCheckedChange={() => onToggleStatus(apiKey.id)}
                className={statusUpdatingId === apiKey.id ? "opacity-80" : undefined}
              />
              {statusUpdatingId === apiKey.id && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
          </div>
        </div>

        <div className="border-t" />

        <div className="p-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-md bg-muted/30 p-4">
              <div className="text-xs text-muted-foreground">{t("apiKeys.created")}</div>
              <div className="mt-1 text-sm font-medium">{new Date(apiKey.created_at).toLocaleString()}</div>
            </div>
            <div className="rounded-md bg-muted/30 p-4">
              <div className="text-xs text-muted-foreground">{t("apiKeys.scope")}</div>
              <div className="mt-1 text-sm font-medium">{getScopeLabel(apiKey.scope)}</div>
            </div>
          </div>
        </div>
      </div>

      <Card className="rounded-lg">
        <CardContent className="p-5">
          <div className="text-sm font-semibold">{t("apiKeys.supportedServices") || t("apiKeys.supportedProviders")}</div>
          <div className="mt-3">
            {apiKey.scope === "global" ? (
              <Badge variant="secondary">{t("apiKeys.global")}</Badge>
            ) : (
              <div className="space-y-3">
                {hasLegacyBindingButNoServiceIds(apiKey) && (
                  <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-md">
                    <div className="text-xs text-destructive font-medium">{t("apiKeys.legacyBindingNotice")}</div>
                    <div className="mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={migratingKeyId === apiKey.id}
                        onClick={() => onMigrateLegacyBinding(apiKey)}
                      >
                        {migratingKeyId === apiKey.id ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {t("apiKeys.migrating")}
                          </span>
                        ) : (
                          t("apiKeys.migrateNow")
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {boundServices.length === 0 ? (
                    <span className="text-sm text-muted-foreground">-</span>
                  ) : (
                    boundServices.map((s) => (
                      <Badge key={s.id} variant="secondary">
                        {s.name}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
