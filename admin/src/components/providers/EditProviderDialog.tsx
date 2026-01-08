import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog"
import { Select } from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import { t } from "@/lib/i18n"

interface EditProviderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  providerForm: {
    id: string
    label: string
    base_url: string
    driver_type: string
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
      <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden border">
        <div className="p-6 space-y-5">
          <DialogHeader className="space-y-1.5 mb-0">
            <DialogTitle className="text-xl font-semibold tracking-tight">
              {t("modelTypes.editProvider")}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-5 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t("modelTypes.providerName")} <span className="text-destructive">*</span></Label>
                <Input
                  value={providerForm.label}
                  onChange={e => onFormChange({ ...providerForm, label: e.target.value })}
                  placeholder="OpenAI"
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t("modelTypes.driverType")} <span className="text-destructive">*</span></Label>
                <Select
                  value={providerForm.driver_type}
                  onChange={value => onFormChange({ ...providerForm, driver_type: value })}
                  options={[
                    { value: "openai", label: "OpenAI" },
                    { value: "openai_compatible", label: "OpenAI Compatible" },
                    { value: "anthropic", label: "Anthropic" },
                    { value: "aliyun", label: "Aliyun (DashScope)" },
                    { value: "volcengine", label: "Volcengine" },
                    { value: "tencent", label: "Tencent" },
                    { value: "ollama", label: "Ollama" },
                  ]}
                  triggerClassName="h-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">{t("modelTypes.baseUrl")}</Label>
              <Input
                value={providerForm.base_url}
                onChange={e => onFormChange({ ...providerForm, base_url: e.target.value })}
                placeholder="https://api.openai.com/v1"
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">{t("modelTypes.docsUrl")}</Label>
              <Input
                value={providerForm.docs_url}
                onChange={e => onFormChange({ ...providerForm, docs_url: e.target.value })}
                placeholder="https://platform.openai.com/docs"
                className="h-10"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 mt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="h-10 px-10">
              {t("common.cancel")}
            </Button>
            <Button onClick={onSubmit} disabled={saving} className="h-10 px-10 bg-purple-600 hover:bg-purple-700 text-white border-0">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("common.save")}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
