import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { t } from "@/lib/i18n"
import { STRATEGY_OPTIONS } from "./types"

interface ServiceEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  form: {
    name: string
    enabled: boolean
    strategy: string
    fallback_chain: string
    qps_limit: number
    concurrency_limit: number
    max_queue_size: number
    max_queue_wait_ms: number
  }
  onFormChange: (next: ServiceEditDialogProps["form"]) => void
  onSave: () => void
  saving: boolean
  error: string | null
}

export function ServiceEditDialog({ open, onOpenChange, form, onFormChange, onSave, saving, error }: ServiceEditDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden border">
        <div className="p-6 space-y-5">
          <DialogHeader className="space-y-1.5 mb-0">
            <DialogTitle className="text-xl font-semibold tracking-tight">{t("common.edit")}</DialogTitle>
            <DialogDescription className="text-purple-600 font-medium pb-2">{t("services.editDesc")}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t("services.name")}</Label>
              <Input value={form.name} onChange={(e) => onFormChange({ ...form, name: e.target.value })} className="h-10" />
            </div>

            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t("services.strategy")}</Label>
                <Select
                  value={form.strategy}
                  onChange={(value) => onFormChange({ ...form, strategy: value })}
                  options={STRATEGY_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                  triggerClassName="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t("services.enabled")}</Label>
                <div className="h-10 flex items-center">
                  <Switch checked={form.enabled} onCheckedChange={(v) => onFormChange({ ...form, enabled: v })} />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">{t("services.fallbackChain")}</Label>
              <Input
                value={form.fallback_chain}
                onChange={(e) => onFormChange({ ...form, fallback_chain: e.target.value })}
                placeholder={t("services.fallbackChainPlaceholder")}
                className="h-10"
              />
            </div>

            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t("services.qpsLimit")}</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.qps_limit}
                  onChange={(e) => onFormChange({ ...form, qps_limit: Number.isFinite(e.currentTarget.valueAsNumber) ? e.currentTarget.valueAsNumber : 0 })}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t("services.concurrencyLimit")}</Label>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={form.concurrency_limit}
                  onChange={(e) => onFormChange({ ...form, concurrency_limit: Number.isFinite(e.currentTarget.valueAsNumber) ? e.currentTarget.valueAsNumber : 0 })}
                  className="h-10"
                />
              </div>
            </div>

            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t("services.maxQueueSize")}</Label>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={form.max_queue_size}
                  onChange={(e) => onFormChange({ ...form, max_queue_size: Number.isFinite(e.currentTarget.valueAsNumber) ? e.currentTarget.valueAsNumber : 0 })}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t("services.maxQueueWaitMs")}</Label>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={form.max_queue_wait_ms}
                  onChange={(e) => onFormChange({ ...form, max_queue_wait_ms: Number.isFinite(e.currentTarget.valueAsNumber) ? e.currentTarget.valueAsNumber : 0 })}
                  className="h-10"
                />
              </div>
            </div>

            {error && <p className="text-sm text-destructive mt-1 font-medium">{error}</p>}
          </div>

          <DialogFooter className="gap-2 mt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="h-10 px-10">
              {t("common.cancel")}
            </Button>
            <Button
              onClick={onSave}
              disabled={saving}
              className="h-10 px-10 bg-purple-600 hover:bg-purple-700 text-white border-0"
            >
              {saving ? (t("common.saving") || t("common.save")) : t("common.save")}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
