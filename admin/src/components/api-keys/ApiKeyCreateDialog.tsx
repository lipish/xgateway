import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { t } from "@/lib/i18n"
import { Copy, Shield } from "lucide-react"
import type { Service } from "./types"

interface ApiKeyCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  createdKey: string | null
  copySuccess: boolean
  onCopy: (text: string) => void
  form: {
    name: string
    scope: string
    service_ids: string[]
  }
  onFormChange: (next: ApiKeyCreateDialogProps["form"]) => void
  services: Service[]
  error: string | null
  onSave: () => void
  onConfirmAfterCreated: () => void
}

export function ApiKeyCreateDialog({
  open,
  onOpenChange,
  createdKey,
  copySuccess,
  onCopy,
  form,
  onFormChange,
  services,
  error,
  onSave,
  onConfirmAfterCreated,
}: ApiKeyCreateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden border">
        <div className="p-6 space-y-5">
          <DialogHeader className="space-y-1.5 mb-0">
            <DialogTitle className="text-xl font-semibold tracking-tight">{t("apiKeys.create")}</DialogTitle>
            <DialogDescription className="text-purple-600 font-medium pb-2">
              {createdKey ? t("apiKeys.saveKeyHint") : t("apiKeys.listDesc")}
            </DialogDescription>
          </DialogHeader>

          {createdKey ? (
            <div className="space-y-4 py-2">
              <div className="rounded-md bg-muted p-3 flex items-center gap-2 group border">
                <code className="text-sm font-mono break-all flex-1">{createdKey}</code>
                <Button variant="ghost" size="icon" className="shrink-0" onClick={() => onCopy(createdKey)}>
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
            <div className="grid gap-5 py-2">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  {t("apiKeys.name")} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => onFormChange({ ...form, name: e.target.value })}
                  placeholder="e.g. My App"
                  className="h-10"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">{t("apiKeys.scope")}</Label>
                <Select
                  value={form.scope}
                  onChange={(value) => onFormChange({ ...form, scope: value, service_ids: value === "global" ? [] : form.service_ids })}
                  options={[
                    { value: "global", label: t("apiKeys.global") },
                    { value: "instance", label: t("apiKeys.instance") },
                  ]}
                  triggerClassName="h-10"
                />
              </div>

              {form.scope === "instance" && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">{t("apiKeys.selectService") || t("apiKeys.selectInstance")}</Label>
                  <div className="border rounded-md p-2 max-h-40 overflow-y-auto space-y-1 bg-background">
                    {services.map((service) => (
                      <label
                        key={service.id}
                        className="flex items-center gap-2 p-2 hover:bg-accent rounded-md cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={form.service_ids.includes(service.id)}
                          onChange={(e) => {
                            const newServiceIds = e.target.checked
                              ? [...form.service_ids, service.id]
                              : form.service_ids.filter((id) => id !== service.id)
                            onFormChange({ ...form, service_ids: newServiceIds })
                          }}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <span className="text-sm font-medium">{service.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {error && <p className="text-sm text-destructive mt-1 font-medium">{error}</p>}
            </div>
          )}

          <DialogFooter className="gap-2 mt-2">
            {createdKey ? (
              <Button onClick={onConfirmAfterCreated} className="h-10 px-10">
                {t("common.confirm")}
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => onOpenChange(false)} className="h-10 px-10">
                  {t("common.cancel")}
                </Button>
                <Button onClick={onSave} className="h-10 px-10 bg-purple-600 hover:bg-purple-700 text-white border-0">
                  {t("common.save")}
                </Button>
              </>
            )}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
