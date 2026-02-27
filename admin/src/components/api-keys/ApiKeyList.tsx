import { t } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { KeyRound } from "lucide-react"
import { type ApiKey } from "@/components/services/types"

interface ApiKeyListProps {
  apiKeys: ApiKey[]
  loading: boolean
  selectedId: number | null
  onSelect: (id: number) => void
}

export function ApiKeyList({ apiKeys, loading, selectedId, onSelect }: ApiKeyListProps) {
  return (
    <div className={cn("w-full md:w-[280px] lg:w-[320px] shrink-0", apiKeys.length === 0 && "min-w-0")}>
      <div className="rounded-2xl bg-white p-4 h-full border border-border flex flex-col">
        <div className="flex items-center gap-2 text-sm font-semibold mb-3 shrink-0">
          <KeyRound className="h-4 w-4 text-muted-foreground" />
          {t("services.listTitle")}
        </div>
        
        <div className="flex-1 overflow-y-auto pr-1">
          {loading ? (
            <div className="flex flex-col gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 w-full bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : apiKeys.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-muted-foreground">
                <p className="text-lg font-medium mb-2">{t("services.empty")}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {apiKeys.map((key) => (
                <button
                  key={key.id}
                  type="button"
                  onClick={() => onSelect(key.id)}
                  className={cn(
                    "w-full text-left rounded-2xl border px-3 py-3 transition-all",
                    selectedId === key.id
                      ? "bg-violet-50 border-violet-200 shadow-sm"
                      : "border-transparent hover:bg-muted/40"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-medium truncate">{key.name}</div>
                    <div
                      className={cn(
                        "text-xs font-medium px-2 py-0.5 rounded-full shrink-0",
                        key.status === "active" ? "bg-green-50 text-green-700" : "bg-muted text-muted-foreground"
                      )}
                    >
                      {key.status === "active" ? t("services.enabled") : t("services.disabled")}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
