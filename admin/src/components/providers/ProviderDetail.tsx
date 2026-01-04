import { Button } from "@/components/ui/button"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Plus, Pencil, Trash2, MoreVertical, ExternalLink } from "lucide-react"
import { t } from "@/lib/i18n"
import type { ProviderType, ModelInfo } from "./types"
import { getLocalizedProviderName, formatPrice } from "./utils"

interface ProviderDetailProps {
  provider: ProviderType
  onAddModel: (typeId: string) => void
  onEditModel: (typeId: string, model: ModelInfo) => void
  onDeleteModel: (typeId: string, modelId: string) => void
  onEditProvider: (provider: ProviderType) => void
  onDeleteProvider: (providerId: string) => void
}

export function ProviderDetail({ provider, onAddModel, onEditModel, onDeleteModel, onEditProvider, onDeleteProvider }: ProviderDetailProps) {
  return (
    <>
      <div className="p-6 border-b bg-gradient-to-r from-muted/20 to-muted/5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-2">{getLocalizedProviderName(provider.id, provider.label)}</h2>
            {provider.docs_url && (
              <a
                href={provider.docs_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
                title={t('providers.viewDocs')}
              >
                <ExternalLink className="h-4 w-4" />
                <span>{t('providers.viewDocs')}</span>
              </a>
            )}
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onAddModel(provider.id)}
              title={t("modelTypes.addModel")}
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation()
                onEditProvider(provider)
              }}
              title={t("providers.edit")}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation()
                onDeleteProvider(provider.id)
              }}
              title={t("providers.delete")}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-background border border-border/50">
            <div className="text-xs font-medium text-muted-foreground mb-1.5">{t('modelTypes.baseUrl')}</div>
            <div className="text-xs font-mono text-foreground/90 break-all">{provider.base_url || '-'}</div>
          </div>
          {/* Corrected: Removed default model block */}
          <div className="p-3 rounded-lg bg-background border border-border/50">
            <div className="text-xs font-medium text-muted-foreground mb-1.5">{t('modelTypes.driverType')}</div>
            <div className="text-xs font-mono text-foreground/90 uppercase">{provider.driver_type || '-'}</div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold">
            {t('modelTypes.availableModels')}
            <span className="ml-2 text-sm font-normal text-muted-foreground">({provider.models.length})</span>
          </h3>
        </div>
        {provider.models.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm">
            <div className="mb-2 text-4xl">📦</div>
            {t("modelTypes.noModels")}
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-semibold text-xs">{t('modelTypes.modelId')}</TableHead>
                  <TableHead className="font-semibold text-xs">{t('modelTypes.modelName')}</TableHead>
                  <TableHead className="font-semibold text-xs text-center">{t('modelTypes.contextLength')}</TableHead>
                  <TableHead className="font-semibold text-xs text-center">
                    <div>{t('modelTypes.inputPrice')}</div>
                    <div className="text-[10px] font-normal text-muted-foreground">({t('modelTypes.priceUnit')})</div>
                  </TableHead>
                  <TableHead className="font-semibold text-xs text-center">
                    <div>{t('modelTypes.outputPrice')}</div>
                    <div className="text-[10px] font-normal text-muted-foreground">({t('modelTypes.priceUnit')})</div>
                  </TableHead>
                  <TableHead className="font-semibold text-xs text-center">{t('modelTypes.supportsTools')}</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {provider.models.map(model => (
                  <TableRow key={model.id} className="hover:bg-muted/20 transition-colors">
                    <TableCell className="font-mono text-xs">{model.id}</TableCell>
                    <TableCell className="text-xs font-medium">{model.name}</TableCell>
                    <TableCell className="text-xs text-center tabular-nums">
                      {model.context_length ? `${(model.context_length / 1000).toFixed(0)}K` : "-"}
                    </TableCell>
                    <TableCell className="text-xs text-center tabular-nums">{formatPrice(model.input_price)}</TableCell>
                    <TableCell className="text-xs text-center tabular-nums">{formatPrice(model.output_price)}</TableCell>
                    <TableCell className="text-center">
                      {model.supports_tools ? (
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs font-bold">✓</span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center">
                        <DropdownMenu modal={false}>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-muted">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onEditModel(provider.id, model)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              {t("providers.edit")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => onDeleteModel(provider.id, model.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {t("providers.delete")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </>
  )
}