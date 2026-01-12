import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { t } from "@/lib/i18n"
import type { Provider } from "./types"

interface ServiceBindingsSectionProps {
  providers: Provider[]
  boundProviderIdSet: Set<number>
  bindingBusyId: number | null
  onToggleBinding: (providerId: number, nextBound: boolean) => void
  error: string | null
}

export function ServiceBindingsSection({
  providers,
  boundProviderIdSet,
  bindingBusyId,
  onToggleBinding,
  error,
}: ServiceBindingsSectionProps) {
  return (
    <div className="rounded-lg border bg-background p-5">
      <div className="text-sm font-semibold">{t("services.bindings")}</div>
      <div className="mt-3 border rounded-md p-2 max-h-64 overflow-y-auto space-y-1 bg-background">
        {providers.length === 0 ? (
          <div className="text-sm text-muted-foreground">-</div>
        ) : (
          providers.map((p) => {
            const checked = boundProviderIdSet.has(p.id)
            const busy = bindingBusyId === p.id
            return (
              <label
                key={p.id}
                className={cn(
                  "flex items-center gap-2 p-2 hover:bg-accent rounded-md cursor-pointer transition-colors",
                  busy && "opacity-70 cursor-not-allowed"
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={busy}
                  onChange={(e) => onToggleBinding(p.id, e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm font-medium">{p.name}</span>
                <span className="text-xs text-muted-foreground">{p.provider_type}</span>
                {!p.enabled && <Badge variant="outline">{t("providers.disabled")}</Badge>}
                {busy && <Loader2 className="ml-auto h-4 w-4 animate-spin text-muted-foreground" />}
              </label>
            )
          })
        )}
      </div>

      {error && <p className="text-sm text-destructive mt-3 font-medium">{error}</p>}
    </div>
  )
}
