import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog"
import { Loader2 } from "lucide-react"
import { t } from "@/lib/i18n"

interface EditProviderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  providerForm: {
    id: string
    label: string
    base_url: string
    default_model: string
    docs_url: string
  }
  onFormChange: (form: any) => void
  onSubmit: () => void
  saving: boolean
}

export function EditProviderDialog({
  open,
  onOpenChange,
  providerForm,
  onFormChange,
  onSubmit,
  saving,
}: EditProviderDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("modelTypes.editProvider")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">{t("modelTypes.providerName")} *</label>
            <Input
              value={providerForm.label}
              onChange={e => onFormChange({ ...providerForm, label: e.target.value })}
              placeholder="OpenAI"
            />
          </div>
          <div>
            <label className="text-sm font-medium">{t("modelTypes.baseUrl")}</label>
            <Input
              value={providerForm.base_url}
              onChange={e => onFormChange({ ...providerForm, base_url: e.target.value })}
              placeholder="https://api.openai.com/v1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">{t("modelTypes.defaultModel")}</label>
            <Input
              value={providerForm.default_model}
              onChange={e => onFormChange({ ...providerForm, default_model: e.target.value })}
              placeholder="gpt-4"
            />
          </div>
          <div>
            <label className="text-sm font-medium">{t("modelTypes.docsUrl")}</label>
            <Input
              value={providerForm.docs_url}
              onChange={e => onFormChange({ ...providerForm, docs_url: e.target.value })}
              placeholder="https://platform.openai.com/docs"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button onClick={onSubmit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
