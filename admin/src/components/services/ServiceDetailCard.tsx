import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Loader2 } from "lucide-react"
import { t } from "@/lib/i18n"
import type { Service } from "./types"

interface ServiceDetailCardProps {
  service: Service
  toggleBusy: boolean
  onToggleEnabled: () => void
}

export function ServiceDetailCard({ service, toggleBusy, onToggleEnabled }: ServiceDetailCardProps) {
  return (
    <div className="rounded-lg border bg-background">
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="text-xl font-semibold truncate">{service.name}</div>
              <Badge variant={service.enabled ? "success" : "outline"} className="shrink-0">
                {service.enabled ? t("services.enabled") : t("services.disabled")}
              </Badge>
              <Badge variant="secondary" className="shrink-0">
                {service.strategy || "Priority"}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Switch
              checked={service.enabled}
              disabled={toggleBusy}
              onCheckedChange={onToggleEnabled}
              className={toggleBusy ? "opacity-80" : undefined}
            />
            {toggleBusy && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
        </div>
      </div>

      <div className="border-t" />

      <div className="p-4">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="rounded-md border bg-muted/60 p-3">
            <div className="text-xs text-muted-foreground">{t("services.strategy")}</div>
            <div className="mt-1 text-sm font-medium">{service.strategy || "Priority"}</div>
          </div>
          <div className="rounded-md border bg-muted/60 p-3">
            <div className="text-xs text-muted-foreground">{t("services.updatedAt")}</div>
            <div className="mt-1 text-sm font-medium">{new Date(service.updated_at).toLocaleString()}</div>
          </div>

          <div className="rounded-md border bg-muted/60 p-3">
            <div className="text-xs text-muted-foreground">{t("services.qpsLimit")}</div>
            <div className="mt-1 text-sm font-medium">{service.qps_limit}</div>
          </div>
          <div className="rounded-md border bg-muted/60 p-3">
            <div className="text-xs text-muted-foreground">{t("services.concurrencyLimit")}</div>
            <div className="mt-1 text-sm font-medium">{service.concurrency_limit}</div>
          </div>

          <div className="rounded-md border bg-muted/60 p-3">
            <div className="text-xs text-muted-foreground">{t("services.maxQueueSize")}</div>
            <div className="mt-1 text-sm font-medium">{service.max_queue_size}</div>
          </div>
          <div className="rounded-md border bg-muted/60 p-3">
            <div className="text-xs text-muted-foreground">{t("services.maxQueueWaitMs")}</div>
            <div className="mt-1 text-sm font-medium">{service.max_queue_wait_ms}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
