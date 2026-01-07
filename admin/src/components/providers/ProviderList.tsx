import { Box } from "lucide-react"
import { getProviderIcon, getLocalizedProviderName } from "./utils"
import type { ProviderType } from "./types"
import { t } from "@/lib/i18n"

interface ProviderListProps {
  providers: ProviderType[]
  selectedProvider: ProviderType | null
  onSelectProvider: (provider: ProviderType) => void
}

export function ProviderList({ providers, selectedProvider, onSelectProvider }: ProviderListProps) {
  return (
    <div className="flex-1 overflow-auto space-y-2 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
      {providers.map(pt => (
        <div
          key={pt.id}
          className={`p-4 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors ${
            selectedProvider?.id === pt.id ? 'bg-muted' : 'bg-white'
          }`}
          onClick={() => onSelectProvider(pt)}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              {getProviderIcon(pt.id) ? (
                <img src={getProviderIcon(pt.id)!} alt={pt.label} className="h-5 w-5 shrink-0 mt-0.5" />
              ) : (
                <Box className={`h-5 w-5 shrink-0 mt-0.5 ${selectedProvider?.id === pt.id ? 'text-primary' : 'text-muted-foreground'}`} />
              )}
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{getLocalizedProviderName(pt.id, pt.label)}</div>
                <div className="text-xs text-muted-foreground truncate mt-0.5">{pt.id}</div>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-lg font-semibold">{pt.models.length}</div>
              <div className="text-xs text-muted-foreground whitespace-nowrap mt-0.5">{t("modelTypes.availableModels")}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}