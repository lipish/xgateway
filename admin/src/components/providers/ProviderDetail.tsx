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
import { Plus, Pencil, Trash2, MoreVertical } from "lucide-react"
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
      <div className="p-6 border-b">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold">{getLocalizedProviderName(provider.id, provider.label)}</h2>
            <p className="text-sm text-muted-foreground mt-1">{provider.id}</p>
          </div>
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" onClick={() => onAddModel(provider.id)} title={t("modelTypes.addModel")}>
              <Plus className="h-4 w-4" />
            </Button>
            <Button 
              size="icon" 
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation()
                onEditProvider(provider)
              }}
              title={t("providers.edit")}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation()
                if (confirm(t("modelTypes.confirmDelete"))) {
                  onDeleteProvider(provider.id)
                }
              }}
              title={t("providers.delete")}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-muted/30">
            <div className="text-xs text-muted-foreground mb-1">{t('modelTypes.baseUrl')}</div>
            <div className="text-xs font-mono">{provider.base_url || '-'}</div>
          </div>
          <div className="p-4 rounded-lg bg-muted/30">
            <div className="text-xs text-muted-foreground mb-1">{t('modelTypes.defaultModel')}</div>
            <div className="text-xs">{provider.default_model || '-'}</div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <h3 className="text-base font-semibold mb-4">{t('modelTypes.availableModels')} ({provider.models.length})</h3>
        {provider.models.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            {t("modelTypes.noModels")}
          </div>
        ) : (
          <div className="border rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="font-medium text-xs">{t('modelTypes.modelId')}</TableHead>
                  <TableHead className="font-medium text-xs">{t('modelTypes.modelName')}</TableHead>
                  <TableHead className="font-medium text-xs text-center">
                    <div>{t('modelTypes.contextLength')}</div>
                  </TableHead>
                  <TableHead className="font-medium text-xs text-center">
                    <div>{t('modelTypes.inputPrice')}</div>
                    <div className="text-xs font-normal text-muted-foreground whitespace-nowrap">({t('modelTypes.priceUnit')})</div>
                  </TableHead>
                  <TableHead className="font-medium text-xs text-center">
                    <div>{t('modelTypes.outputPrice')}</div>
                    <div className="text-xs font-normal text-muted-foreground whitespace-nowrap">({t('modelTypes.priceUnit')})</div>
                  </TableHead>
                  <TableHead className="font-medium text-xs text-center">
                    <div>{t('modelTypes.supportsTools')}</div>
                  </TableHead>
                  <TableHead className="font-medium text-xs text-center w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {provider.models.map(model => (
                  <TableRow key={model.id} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-xs">{model.id}</TableCell>
                    <TableCell className="font-mono text-xs">{model.name}</TableCell>
                    <TableCell className="text-xs text-center">{model.context_length ? `${(model.context_length / 1000).toFixed(0)}K` : "-"}</TableCell>
                    <TableCell className="text-xs text-center">{formatPrice(model.input_price)}</TableCell>
                    <TableCell className="text-xs text-center">{formatPrice(model.output_price)}</TableCell>
                    <TableCell className="text-center">
                      {model.supports_tools ? (
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-xs">✓</span>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center">
                        <DropdownMenu modal={false}>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8">
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
                              className="text-destructive"
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