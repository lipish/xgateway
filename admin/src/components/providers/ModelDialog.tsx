import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog"
import { Loader2 } from "lucide-react"
import { t } from "@/lib/i18n"
import type { ModelInfo } from "./types"

interface ModelDialogProps {
  open: boolean
  onOpenChange: () => void
  isEdit: boolean
  modelForm: ModelInfo
  onFormChange: (form: ModelInfo) => void
  onSave: () => void
  saving: boolean
}

export function ModelDialog({
  open,
  onOpenChange,
  isEdit,
  modelForm,
  onFormChange,
  onSave,
  saving
}: ModelDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden border">
        <div className="p-6 space-y-5">
          <DialogHeader className="space-y-1.5 mb-0">
            <DialogTitle className="text-xl font-semibold tracking-tight">
              {isEdit ? t("modelTypes.editModel") : t("modelTypes.addModel")}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-5 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t("modelTypes.modelId")} <span className="text-destructive">*</span></Label>
                <Input
                  value={modelForm.id}
                  onChange={e => onFormChange({ ...modelForm, id: e.target.value })}
                  placeholder="gpt-4"
                  disabled={isEdit}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t("modelTypes.modelName")} <span className="text-destructive">*</span></Label>
                <Input
                  value={modelForm.name}
                  onChange={e => onFormChange({ ...modelForm, name: e.target.value })}
                  placeholder="GPT-4"
                  className="h-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">{t("modelTypes.description")}</Label>
              <Input
                value={modelForm.description || ""}
                onChange={e => onFormChange({ ...modelForm, description: e.target.value })}
                placeholder={t("modelTypes.descriptionPlaceholder")}
                className="h-10"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t("modelTypes.contextLength")}</Label>
                <Input
                  type="number"
                  value={modelForm.context_length || ""}
                  onChange={e => onFormChange({ ...modelForm, context_length: parseInt(e.target.value) || undefined })}
                  placeholder="128000"
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t("modelTypes.supportsTools")}</Label>
                <div className="h-10 flex items-center gap-3 px-1">
                  <Switch
                    checked={modelForm.supports_tools || false}
                    onCheckedChange={checked => onFormChange({ ...modelForm, supports_tools: checked })}
                  />
                  <span className="text-sm text-muted-foreground font-medium">
                    {modelForm.supports_tools ? t("common.yes") : t("common.no")}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t("modelTypes.inputPrice")} ({t("modelTypes.priceUnit")})</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={modelForm.input_price || ""}
                  onChange={e => onFormChange({ ...modelForm, input_price: parseFloat(e.target.value) || undefined })}
                  placeholder="0.30"
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t("modelTypes.outputPrice")} ({t("modelTypes.priceUnit")})</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={modelForm.output_price || ""}
                  onChange={e => onFormChange({ ...modelForm, output_price: parseFloat(e.target.value) || undefined })}
                  placeholder="0.60"
                  className="h-10"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 mt-2">
            <Button variant="outline" onClick={onOpenChange} className="h-10 px-10">
              {t("common.cancel")}
            </Button>
            <Button onClick={onSave} disabled={saving} className="h-10 px-10 bg-purple-600 hover:bg-purple-700 text-white border-0">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("common.save")}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}