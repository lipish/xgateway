import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { t } from "@/lib/i18n"
import { cn, formatDate } from "@/lib/utils"
import { Loader2, MoreVertical, Pencil, Shield, Trash2 } from "lucide-react"
import type { ApiKey, Service } from "./types"

interface ApiKeysListCardProps {
  loading: boolean
  apiKeys: ApiKey[]
  selectedApiKeyId: number | null
  onSelectApiKeyId: (id: number) => void
  getScopeLabel: (scope: string) => string
  getBoundServices: (key: ApiKey) => Service[]
  onEdit: (key: ApiKey) => void
  onRotate: (id: number) => void
  rotatingId: number | null
  onRequestDelete: (id: number) => void
}

export function ApiKeysListCard({
  loading,
  apiKeys,
  selectedApiKeyId,
  onSelectApiKeyId,
  getScopeLabel,
  getBoundServices,
  onEdit,
  onRotate,
  rotatingId,
  onRequestDelete,
}: ApiKeysListCardProps) {
  return (
    <Card className="w-[520px] shrink-0 h-full flex flex-col">
      <CardContent className="flex-1 h-full overflow-y-auto p-6">
        {loading ? (
          <div className="flex flex-col gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 w-full bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : apiKeys.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground">
              <p className="text-lg font-medium mb-2">{t("apiKeys.noKeys")}</p>
            </div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("apiKeys.name")}</TableHead>
                <TableHead>{t("apiKeys.scope")}</TableHead>
                <TableHead>{t("apiKeys.service") || t("apiKeys.provider")}</TableHead>
                <TableHead>{t("apiKeys.created")}</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apiKeys.map((key) => {
                const boundServices = getBoundServices(key)
                const serviceSummary = key.scope === "global" ? t("apiKeys.global") : boundServices.length > 0 ? `${boundServices.length}` : "0"

                return (
                  <TableRow
                    key={key.id}
                    className={cn("cursor-pointer transition-colors", selectedApiKeyId === key.id ? "bg-violet-50 border-l-2 border-l-violet-400" : "hover:bg-muted/40")}
                    onClick={() => onSelectApiKeyId(key.id)}
                  >
                    <TableCell className="font-medium">{key.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{getScopeLabel(key.scope)}</Badge>
                    </TableCell>
                    <TableCell>
                      {key.scope === "global" ? (
                        <Badge variant="secondary">{t("apiKeys.global")}</Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">{serviceSummary}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(key.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={(e) => e.stopPropagation()}
                            aria-label={t("common.actions") || "Actions"}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              onEdit(key)
                            }}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            {t("common.edit") || t("providers.edit") || "Edit"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={rotatingId === key.id}
                            onClick={(e) => {
                              e.stopPropagation()
                              onRotate(key.id)
                            }}
                          >
                            {rotatingId === key.id ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Shield className="h-4 w-4 mr-2" />
                            )}
                            {t("common.reset") || "Rotate"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              onRequestDelete(key.id)
                            }}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t("common.delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
