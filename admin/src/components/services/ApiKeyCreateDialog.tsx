import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { t } from "@/lib/i18n"
import { Copy } from "lucide-react"
import { useState } from "react"

interface ApiKeyCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  serviceName?: string
  form: {
    name: string
    qps_limit: number
    concurrency_limit: number
  }
  onFormChange: (next: ApiKeyCreateDialogProps["form"]) => void
  onSave: () => void
  saving: boolean
  error: string | null
  createdApiKey: string | null
}

export function ApiKeyCreateDialog({
  open,
  onOpenChange,
  serviceName,
  form,
  onFormChange,
  onSave,
  saving,
  error,
  createdApiKey,
}: ApiKeyCreateDialogProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const copied = copiedKey === createdApiKey && createdApiKey !== null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden border">
        <div className="p-6 space-y-5">
          <DialogHeader className="space-y-1.5 mb-0">
            <DialogTitle className="text-xl font-semibold tracking-tight">{t("apiKeys.create")}</DialogTitle>
            <DialogDescription className="text-purple-600 font-medium pb-2">{serviceName}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t("apiKeys.name")}</Label>
              <Input
                autoFocus
                value={form.name}
                onChange={(e) => onFormChange({ ...form, name: e.target.value })}
                placeholder={t("apiKeys.enterName")}
                className="h-10"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t("apiKeys.qps")}</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.qps_limit}
                  onChange={(e) => onFormChange({ ...form, qps_limit: Number(e.target.value) })}
                  placeholder={t("apiKeys.enterRateLimit")}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t("apiKeys.concurrency")}</Label>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={form.concurrency_limit}
                  onChange={(e) => onFormChange({ ...form, concurrency_limit: Number(e.target.value) })}
                  placeholder={t("apiKeys.enterConcurrency")}
                  className="h-10"
                />
              </div>
            </div>

            {error && <p className="text-sm text-destructive mt-1 font-medium">{error}</p>}
            {createdApiKey && (
              <div className="rounded-md border bg-muted/30 p-3">
                <div className="text-xs text-muted-foreground">{t("apiKeys.saveKeyHint")}</div>
                <div className="mt-2 flex items-start gap-2">
                  <div className="text-sm font-mono break-all flex-1">{createdApiKey}</div>
                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(createdApiKey)
                        setCopiedKey(createdApiKey)
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

          <DialogFooter className="gap-2 mt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="h-10 px-10">
              {t("common.cancel")}
            </Button>
            <Button
              onClick={createdApiKey ? () => onOpenChange(false) : onSave}
              disabled={saving}
              className="h-10 px-10 bg-purple-600 hover:bg-purple-700 text-white border-0"
            >
              {createdApiKey ? t("common.confirm") : saving ? (t("common.saving") || t("common.save")) : t("common.save")}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
