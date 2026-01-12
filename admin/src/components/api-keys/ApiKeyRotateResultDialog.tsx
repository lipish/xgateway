import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { t } from "@/lib/i18n"
import { Copy, Shield } from "lucide-react"

interface ApiKeyRotateResultDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  rotatedKey: string | null
  rotateError: string | null
  copySuccess: boolean
  onCopy: (text: string) => void
}

export function ApiKeyRotateResultDialog({
  open,
  onOpenChange,
  rotatedKey,
  rotateError,
  copySuccess,
  onCopy,
}: ApiKeyRotateResultDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden border">
        <div className="p-6 space-y-5">
          <DialogHeader className="space-y-1.5 mb-0">
            <DialogTitle className="text-xl font-semibold tracking-tight">{t("apiKeys.create")}</DialogTitle>
            <DialogDescription className="text-purple-600 font-medium pb-2">{t("apiKeys.saveKeyHint")}</DialogDescription>
          </DialogHeader>

          {rotatedKey ? (
            <div className="space-y-4 py-2">
              <div className="rounded-md bg-muted p-3 flex items-center gap-2 group border">
                <code className="text-sm font-mono break-all flex-1">{rotatedKey}</code>
                <Button variant="ghost" size="icon" className="shrink-0" onClick={() => onCopy(rotatedKey)}>
                  {copySuccess ? <span className="text-[10px] text-primary">Copied!</span> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-md">
                <p className="text-xs text-destructive font-medium flex items-center gap-2">
                  <Shield className="h-3 w-3" /> {t("apiKeys.saveKeyHint")}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 py-2">
              <p className="text-sm text-destructive mt-1 font-medium">{rotateError || t("common.networkError")}</p>
            </div>
          )}

          <DialogFooter className="gap-2 mt-2">
            <Button onClick={() => onOpenChange(false)} className="h-10 px-10">
              {t("common.confirm")}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
