import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Search, Server, MoreVertical, Pencil, Trash2, Power } from "lucide-react"
import { t } from "@/lib/i18n"
import type { Provider } from "./types"

interface ProviderListProps {
  providers: Provider[]
  selectedProvider: Provider | null
  searchQuery: string
  onSearchChange: (query: string) => void
  onSelectProvider: (provider: Provider) => void
  onToggleProvider: (id: number, nextEnabled: boolean) => void
  togglingProviderIds: number[]
  onEdit: (provider: Provider) => void
  onDelete: (id: number) => void
  isAdmin?: boolean
}

export function ProviderList({
  providers,
  selectedProvider,
  searchQuery,
  onSearchChange,
  onSelectProvider,
  onToggleProvider,
  togglingProviderIds,
  onEdit,
  onDelete,
  isAdmin = true,
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
      <div className="flex-1 overflow-auto rounded-lg scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {providers.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <div className="text-center text-muted-foreground">
              <Server className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">{t('providers.noProviders')}</p>
              <p className="text-xs mt-1">{t('providers.addProviderTip')}</p>
            </div>
          </div>
        ) : (
          <Table>
            <TableHeader className="sticky top-0 bg-white">
              <TableRow>
                <TableHead className="text-left pl-6">{t("providers.name")}</TableHead>
                <TableHead className="text-left">{t("providers.type")}</TableHead>
                <TableHead className="text-center w-[100px]">{t("providers.status")}</TableHead>
                <TableHead className="text-center">{t("providers.priority")}</TableHead>
                {isAdmin && <TableHead className="text-center w-[64px]"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {providers.map((provider) => (
                <TableRow
                  key={provider.id}
                  className={`cursor-pointer hover:bg-muted/50 ${selectedProvider?.id === provider.id ? "bg-violet-50 border-l-2 border-l-violet-400" : ""}`}
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
                      variant="outline"
                      className={provider.enabled ? "bg-violet-50 text-violet-700 border border-violet-200" : "bg-muted text-muted-foreground border-0"}
                    >
                      {provider.enabled
                        ? t("providers.enabled")
                        : t("providers.disabled")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">{provider.priority}</TableCell>
                  {isAdmin && (
                    <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            aria-label={t("common.actions") || "Actions"}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              onEdit(provider)
                            }}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            {t("common.edit")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              onToggleProvider(provider.id, !provider.enabled)
                            }}
                            disabled={togglingProviderIds.includes(provider.id)}
                          >
                            <Power className="h-4 w-4 mr-2" />
                            {provider.enabled ? t("providers.disable") : t("providers.enable")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              onDelete(provider.id)
                            }}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t("common.delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
