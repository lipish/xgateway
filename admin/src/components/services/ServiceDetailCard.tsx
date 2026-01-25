import { t } from "@/lib/i18n"
import { formatDate } from "@/lib/utils"
import { STRATEGY_OPTIONS, type Service } from "./types"

interface ServiceDetailCardProps {
  service: Service
}

export function ServiceDetailCard({ service }: ServiceDetailCardProps) {
  const strategyOption = STRATEGY_OPTIONS.find((option) => option.value === service.strategy)
  const strategyLabel = strategyOption ? t(strategyOption.labelKey) : service.strategy || t("services.strategyOptions.priority")

  return (
    <div className="rounded-lg bg-background">
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex items-center gap-2">
            <div className="text-xl font-semibold truncate">{service.name}</div>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="rounded-md bg-muted/60 p-3">
            <div className="text-xs text-muted-foreground">{t("services.strategy")}</div>
            <div className="mt-1 text-sm font-medium">{strategyLabel}</div>
          </div>
          <div className="rounded-md bg-muted/60 p-3">
            <div className="text-xs text-muted-foreground">{t("services.updatedAt")}</div>
            <div className="mt-1 text-sm font-medium">{formatDate(service.updated_at)}</div>
          </div>

          <div className="rounded-md bg-muted/60 p-3">
            <div className="text-xs text-muted-foreground">{t("services.qpsLimit")}</div>
            <div className="mt-1 text-sm font-medium">{service.qps_limit}</div>
          </div>
          <div className="rounded-md bg-muted/60 p-3">
            <div className="text-xs text-muted-foreground">{t("services.concurrencyLimit")}</div>
            <div className="mt-1 text-sm font-medium">{service.concurrency_limit}</div>
          </div>

          <div className="rounded-md bg-muted/60 p-3">
            <div className="text-xs text-muted-foreground">{t("services.maxQueueSize")}</div>
            <div className="mt-1 text-sm font-medium">{service.max_queue_size}</div>
          </div>
          <div className="rounded-md bg-muted/60 p-3">
            <div className="text-xs text-muted-foreground">{t("services.maxQueueWaitMs")}</div>
            <div className="mt-1 text-sm font-medium">{service.max_queue_wait_ms}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
