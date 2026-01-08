import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Search,
} from "lucide-react"
import { t } from "@/lib/i18n"
import type { Provider } from "./types"

interface ProviderListProps {
  providers: Provider[]
  selectedProvider: Provider | null
  searchQuery: string
  onSearchChange: (query: string) => void
  onSelectProvider: (provider: Provider) => void
  onToggleProvider: (id: number) => void
}

export function ProviderList({
  providers,
  selectedProvider,
  searchQuery,
  onSearchChange,
  onSelectProvider,
  onToggleProvider,
}: ProviderListProps) {
  return (
    <div className="bg-card rounded-xl border p-6 flex flex-col w-[65%]">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("providers.search")}
              className="pl-9 w-48"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
          <span className="text-sm text-muted-foreground">
            {t('providers.total')} {providers.length} {t('providers.unit')}
          </span>
        </div>
      </div>
      <div className="flex-1 overflow-auto border rounded-lg scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <Table>
          <TableHeader className="sticky top-0 bg-white">
            <TableRow>
              <TableHead className="text-left pl-6">{t("providers.name")}</TableHead>
              <TableHead className="text-left">{t("providers.type")}</TableHead>
              <TableHead className="text-center w-[100px]">{t("providers.status")}</TableHead>
              <TableHead className="text-center">{t("providers.priority")}</TableHead>
              <TableHead className="text-center w-[80px]">
                {t("providers.actions")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {providers.map((provider) => (
              <TableRow
                key={provider.id}
                className={`cursor-pointer hover:bg-muted/50 ${selectedProvider?.id === provider.id ? "bg-muted" : ""}`}
                onClick={() => onSelectProvider(provider)}
              >
                <TableCell className="text-left pl-6">
                  <span className="font-medium">{provider.name}</span>
                </TableCell>
                <TableCell className="text-left">
                  <span className="text-sm">{provider.provider_type}</span>
                </TableCell>
                <TableCell className="text-center">
                  <Badge
                    className={provider.enabled ? "bg-primary/10 text-primary border-0" : ""}
                    variant={provider.enabled ? "outline" : "destructive"}
                  >
                    {provider.enabled
                      ? t("providers.enabled")
                      : t("providers.disabled")}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">{provider.priority}</TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                    <Switch
                      checked={provider.enabled}
                      onCheckedChange={() => onToggleProvider(provider.id)}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}