import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Switch } from "@/components/ui/switch"
import { t } from "@/lib/i18n"
import { formatDate } from "@/lib/utils"
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"
import type { ApiKey, Service } from "./types"

interface ApiKeyDetailCardProps {
  apiKey: ApiKey
  statusUpdatingId: number | null
  serviceBindingUpdating: boolean
  services: Service[]
  onToggleStatus: (id: number) => void
  onToggleServiceBinding: (key: ApiKey, serviceId: string, nextBound: boolean) => void
  getScopeLabel: (scope: string) => string
  hasLegacyBindingButNoServiceIds: (key: ApiKey) => boolean
  migratingKeyId: number | null
  onMigrateLegacyBinding: (key: ApiKey) => void
  getBoundServices: (key: ApiKey) => Service[]
}

export function ApiKeyDetailCard({
  apiKey,
  statusUpdatingId,
  serviceBindingUpdating,
  services,
  onToggleStatus,
  onToggleServiceBinding,
  getScopeLabel,
  hasLegacyBindingButNoServiceIds,
  migratingKeyId,
  onMigrateLegacyBinding,
  getBoundServices,
}: ApiKeyDetailCardProps) {
  const boundServices = getBoundServices(apiKey)
  const boundServiceNames = boundServices.map((service) => service.name)

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-background">
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

        <div className="p-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-md bg-muted p-4">
              <div className="text-xs text-muted-foreground">{t("apiKeys.created")}</div>
              <div className="mt-1 text-sm font-medium">{formatDate(apiKey.created_at)}</div>
            </div>
            <div className="rounded-md bg-muted p-4">
              <div className="text-xs text-muted-foreground">{t("apiKeys.scope")}</div>
              <div className="mt-1 text-sm font-medium">{getScopeLabel(apiKey.scope)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-background p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div className="text-sm font-semibold">{t("apiKeys.supportedServices") || t("apiKeys.supportedProviders")}</div>
            {apiKey.scope === "global" ? (
              <Badge variant="secondary">{t("apiKeys.global")}</Badge>
            ) : (
              <Popover modal={false}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="h-10 w-full justify-between font-normal" type="button">
                    <span className="flex-1 truncate text-left">
                      {boundServiceNames.length > 0 ? boundServiceNames.join(", ") : t("services.bindingsPlaceholder")}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[20rem] p-0" align="start">
                  <Command>
                    <CommandInput placeholder={t("common.search")} />
                    <CommandList>
                      <CommandEmpty>{t("services.empty")}</CommandEmpty>
                      <CommandGroup>
                        {boundServices.length === 0 ? (
                          <CommandItem value="-" className="text-muted-foreground" disabled>
                            -
                          </CommandItem>
                        ) : (
                          services.map((service) => {
                            const checked = boundServices.some((s) => s.id === service.id)
                            return (
                              <CommandItem
                                key={service.id}
                                value={`${service.name} ${service.id}`}
                                onSelect={() => {
                                  if (serviceBindingUpdating) return
                                  onToggleServiceBinding(apiKey, service.id, !checked)
                                }}
                                className={serviceBindingUpdating ? "opacity-70" : undefined}
                              >
                                <Check className={checked ? "mr-2 h-4 w-4 opacity-100" : "mr-2 h-4 w-4 opacity-0"} />
                                <span className="truncate">{service.name}</span>
                                <span className="ml-auto text-xs text-muted-foreground">{service.id}</span>
                                {serviceBindingUpdating && <Loader2 className="ml-2 h-4 w-4 animate-spin text-muted-foreground" />}
                              </CommandItem>
                            )
                          })
                        )}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>

        {apiKey.scope !== "global" && hasLegacyBindingButNoServiceIds(apiKey) && (
          <div className="mt-3 rounded-md border bg-destructive/5 border-destructive/20 p-3">
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
      </div>
    </div>
  )
}
