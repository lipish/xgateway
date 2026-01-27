import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { t } from "@/lib/i18n"
import { Copy, Loader2, MoreVertical, Plus, Power, RotateCcw, Trash2 } from "lucide-react"
import { useState } from "react"
import type { ApiKey } from "./types"

interface ServiceApiKeysSectionProps {
  selectedServiceId: string | null
  apiKeys: ApiKey[]
  loading: boolean
  apiKeyError: string | null
  rotateError: string | null
  rotatedApiKey: string | null
  apiKeyStatusUpdatingId: number | null
  rotatingKeyId: number | null
  onOpenCreate: () => void
  onToggleStatus: (id: number) => void
  onRotate: (id: number) => void
  onRequestDelete: (id: number) => void
  onClearRotatedApiKey: () => void
}

export function ServiceApiKeysSection({
  selectedServiceId,
  apiKeys,
  loading,
  apiKeyError,
  rotateError,
  rotatedApiKey,
  apiKeyStatusUpdatingId,
  rotatingKeyId,
  onOpenCreate,
  onToggleStatus,
  onRotate,
  onRequestDelete,
  onClearRotatedApiKey,
}: ServiceApiKeysSectionProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const maskKey = (key?: string | null) => {
    if (!key) return "-"
    if (key.length <= 8) return key
    return `${key.slice(0, 4)}****${key.slice(-4)}`
  }

  const copied = copiedKey === rotatedApiKey && rotatedApiKey !== null

  return (
    <div className="rounded-lg bg-background p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold">{t("apiKeys.title")}</div>
        <Button size="sm" variant="outline" onClick={onOpenCreate} disabled={!selectedServiceId}>
          <Plus className="mr-2 h-4 w-4" />
          {t("apiKeys.create")}
        </Button>
      </div>

      <div className="mt-3 rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[220px]">{t("apiKeys.name")}</TableHead>
              <TableHead className="w-[120px]">{t("apiKeys.status")}</TableHead>
              <TableHead className="w-[180px]">{t("apiKeys.createdAt")}</TableHead>
              <TableHead className="w-[220px]">{t("apiKeys.key")}</TableHead>
              <TableHead className="w-[160px]">{t("apiKeys.qps")}</TableHead>
              <TableHead className="w-[160px]">{t("apiKeys.concurrency")}</TableHead>
              <TableHead className="w-[200px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  <div className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{t("common.loading")}</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : apiKeys.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  {t("apiKeys.noKeys")}
                </TableCell>
              </TableRow>
            ) : (
              apiKeys.map((k) => (
                <TableRow key={k.id}>
                  <TableCell className="font-medium">{k.name}</TableCell>
                  <TableCell>
                    <Badge variant={k.status === "active" ? "success" : "outline"}>
                      {k.status === "active" ? t("apiKeys.enabled") : t("apiKeys.disabled")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{new Date(k.created_at).toLocaleDateString("en-CA")}</TableCell>
                  <TableCell className="text-muted-foreground text-sm font-mono">{maskKey(k.key_hash)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{k.qps_limit ?? 0}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{k.concurrency_limit ?? 0}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end">
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
                          <DropdownMenuItem onClick={() => onToggleStatus(k.id)} disabled={apiKeyStatusUpdatingId === k.id}>
                            {apiKeyStatusUpdatingId === k.id ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Power className="h-4 w-4 mr-2" />
                            )}
                            {k.status === "active" ? t("apiKeys.disable") : t("apiKeys.enable")}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onRotate(k.id)} disabled={rotatingKeyId === k.id}>
                            {rotatingKeyId === k.id ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <RotateCcw className="h-4 w-4 mr-2" />
                            )}
                            {t("apiKeys.resetKey")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onRequestDelete(k.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t("common.delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {apiKeyError && <p className="text-sm text-destructive mt-3 font-medium">{apiKeyError}</p>}
      {rotateError && <p className="text-sm text-destructive mt-2 font-medium">{rotateError}</p>}
      {rotatedApiKey && (
        <div className="mt-3 rounded-md border bg-muted/30 p-3">
          <div className="text-xs text-muted-foreground">{t("apiKeys.key")}</div>
          <div className="mt-2 inline-flex items-center gap-2">
            <div className="text-sm font-mono break-all leading-5">{maskKey(rotatedApiKey)}</div>
            <Button
              variant="ghost"
              size="icon"
              type="button"
              className="shrink-0 h-8 w-8 p-0"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(rotatedApiKey)
                  setCopiedKey(rotatedApiKey)
                  onClearRotatedApiKey()
                  window.setTimeout(() => setCopiedKey(null), 1500)
                } catch {
                  setCopiedKey(null)
                }
              }}
            >
              {copied ? <span className="text-[10px]">{t("apiKeys.copiedToClipboard")}</span> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
