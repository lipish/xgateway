import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("modelTypes.editModel") : t("modelTypes.addModel")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">{t("modelTypes.modelId")}</label>
              <Input
                value={modelForm.id}
                onChange={e => onFormChange({ ...modelForm, id: e.target.value })}
                placeholder="gpt-4"
                disabled={isEdit}
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t("modelTypes.modelName")}</label>
              <Input
                value={modelForm.name}
                onChange={e => onFormChange({ ...modelForm, name: e.target.value })}
                placeholder="GPT-4"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">{t("modelTypes.description")}</label>
            <Input
              value={modelForm.description || ""}
              onChange={e => onFormChange({ ...modelForm, description: e.target.value })}
              placeholder={t("modelTypes.descriptionPlaceholder")}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">{t("modelTypes.contextLength")}</label>
              <Input
                type="number"
                value={modelForm.context_length || ""}
                onChange={e => onFormChange({ ...modelForm, context_length: parseInt(e.target.value) || undefined })}
                placeholder="128000"
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t("modelTypes.supportsTools")}</label>
              <div className="h-10 flex items-center gap-2">
                <Switch
                  checked={modelForm.supports_tools || false}
                  onCheckedChange={checked => onFormChange({ ...modelForm, supports_tools: checked })}
                />
                <span className="text-sm text-muted-foreground">
                  {modelForm.supports_tools ? t("common.yes") : t("common.no")}
                </span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">{t("modelTypes.inputPrice")} ({t("modelTypes.priceUnit")})</label>
              <Input
                type="number"
                step="0.01"
                value={modelForm.input_price || ""}
                onChange={e => onFormChange({ ...modelForm, input_price: parseFloat(e.target.value) || undefined })}
                placeholder="0.30"
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t("modelTypes.outputPrice")} ({t("modelTypes.priceUnit")})</label>
              <Input
                type="number"
                step="0.01"
                value={modelForm.output_price || ""}
                onChange={e => onFormChange({ ...modelForm, output_price: parseFloat(e.target.value) || undefined })}
                placeholder="0.60"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onOpenChange}>{t("common.cancel")}</Button>
          <Button onClick={onSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}