import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { t } from "@/lib/i18n"
import { Loader2, Plus } from "lucide-react"
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
}: ServiceApiKeysSectionProps) {
  return (
    <div className="rounded-lg border bg-background p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold">{t("apiKeys.title")}</div>
        <Button size="sm" onClick={onOpenCreate} disabled={!selectedServiceId}>
          <Plus className="mr-2 h-4 w-4" />
          {t("apiKeys.create")}
        </Button>
      </div>

      <div className="mt-3 border rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[220px]">{t("apiKeys.name")}</TableHead>
              <TableHead className="w-[120px]">{t("apiKeys.scope")}</TableHead>
              <TableHead className="w-[120px]">{t("apiKeys.status")}</TableHead>
              <TableHead className="w-[90px]">{t("apiKeys.qps")}</TableHead>
              <TableHead className="w-[110px]">{t("apiKeys.concurrency")}</TableHead>
              <TableHead className="w-[220px]">{t("apiKeys.createdAt")}</TableHead>
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
                  <TableCell className="text-muted-foreground text-sm">
                    {k.scope === "global" ? t("apiKeys.global") : t("apiKeys.instance")}
                  </TableCell>
                  <TableCell>
                    <Badge variant={k.status === "active" ? "success" : "outline"}>
                      {k.status === "active" ? t("apiKeys.enabled") : t("apiKeys.disabled")}
                    </Badge>
                  </TableCell>
                  <TableCell>{k.qps_limit}</TableCell>
                  <TableCell>{k.concurrency_limit}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{new Date(k.created_at).toLocaleString()}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onToggleStatus(k.id)}
                        disabled={apiKeyStatusUpdatingId === k.id}
                      >
                        {apiKeyStatusUpdatingId === k.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : k.status === "active" ? (
                          t("apiKeys.disable")
                        ) : (
                          t("apiKeys.enable")
                        )}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => onRotate(k.id)} disabled={rotatingKeyId === k.id}>
                        {rotatingKeyId === k.id ? <Loader2 className="h-4 w-4 animate-spin" /> : t("common.refresh")}
                      </Button>
                      <Button variant="outline" size="sm" className="text-destructive" onClick={() => onRequestDelete(k.id)}>
                        {t("common.delete")}
                      </Button>
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
          <div className="mt-1 text-sm font-mono break-all">{rotatedApiKey}</div>
        </div>
      )}
    </div>
  )
}
