import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Loader2 } from "lucide-react"
import { t } from "@/lib/i18n"
import type { ProviderTypeConfig } from "./types"

interface EditProviderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  providerType?: string
  providerTypeConfig?: ProviderTypeConfig
  form: {
    name: string
    apiKey: string
    model: string
    baseUrl: string
    priority: string
    endpoint: string
    secretId: string
    secretKey: string
    inputPrice: string
    outputPrice: string
    quotaLimit: string
  }
  onFormChange: (form: any) => void;
  onModelChange?: (model: string) => void;
  onSubmit: () => void;
  saving: boolean
  error?: string | null
}

export function EditProviderDialog({
  open,
  onOpenChange,
  providerType,
  providerTypeConfig,
  form,
  onFormChange,
  onModelChange,
  onSubmit,
  saving,
  error,
}: EditProviderDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden border">
        <div className="p-6 space-y-5">
          <DialogHeader className="space-y-1.5 mb-0">
            <DialogTitle className="text-xl font-semibold tracking-tight text-foreground">
              {t('providers.editProvider')}
            </DialogTitle>
            <DialogDescription className="text-purple-600 font-medium pb-2">
              {t('providers.editProviderDesc')}
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="grid gap-5 py-2">
            {/* Header: Type Info - Updated Style */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-purple-50 text-purple-700 w-fit text-xs font-semibold border border-purple-100">
              <span className="opacity-70">{t('providers.providerType')}:</span>
              <span>{providerTypeConfig?.label || providerType}</span>
            </div>

            {/* Row 1: Name and Model */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name" className="text-sm font-medium">
                  {t('providers.name')} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit-name"
                  value={form.name}
                  onChange={(e) =>
                    onFormChange({ ...form, name: e.target.value })
                  }
                  className="bg-background border-input h-10 px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-model" className="text-sm font-medium">
                  {t('providers.model')}
                </Label>
                {providerTypeConfig?.models && providerTypeConfig.models.length > 0 ? (
                  <Select
                    id="edit-model"
                    value={form.model}
                    onChange={(value) => {
                      if (onModelChange) {
                        onModelChange(value);
                      } else {
                        onFormChange({ ...form, model: value });
                      }
                    }}
                    options={providerTypeConfig.models.map((m) => ({
                      value: m.id,
                      label: m.name,
                    }))}
                    placeholder={t('providers.selectModel')}
                    triggerClassName="bg-background border-input h-10 px-3 py-2 text-sm ring-offset-background"
                  />
                ) : (
                  <Input
                    id="edit-model"
                    value={form.model}
                    onChange={(e) =>
                      onFormChange({ ...form, model: e.target.value })
                    }
                    className="bg-background border-input h-10 px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                )}
              </div>
            </div>

            {/* Row 2: API Key or Tencent Secrets */}
            {providerType === 'tencent' ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-secretId" className="text-sm font-medium">
                    Secret ID
                  </Label>
                  <Input
                    id="edit-secretId"
                    type="password"
                    value={form.secretId}
                    placeholder="Leave masked to keep current"
                    onChange={(e) =>
                      onFormChange({ ...form, secretId: e.target.value })
                    }
                    className="bg-background border-input h-10 px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-secretKey" className="text-sm font-medium">
                    Secret Key
                  </Label>
                  <Input
                    id="edit-secretKey"
                    type="password"
                    value={form.secretKey}
                    placeholder="Leave masked to keep current"
                    onChange={(e) =>
                      onFormChange({ ...form, secretKey: e.target.value })
                    }
                    className="bg-background border-input h-10 px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="edit-apiKey" className="text-sm font-medium">
                  API Key
                </Label>
                <Input
                  id="edit-apiKey"
                  type="password"
                  value={form.apiKey}
                  placeholder="Enter new API key or leave masked to keep current"
                  onChange={(e) =>
                    onFormChange({ ...form, apiKey: e.target.value })
                  }
                  className="bg-background border-input h-10 px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
            )}

            {/* Row 3: Priority & Volcengine Endpoint */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-priority" className="text-sm font-medium">
                  {t('providers.priority')}
                </Label>
                <Input
                  id="edit-priority"
                  type="number"
                  value={form.priority}
                  onChange={(e) =>
                    onFormChange({ ...form, priority: e.target.value })
                  }
                  className="bg-background border-input h-10 px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
              {providerType === 'volcengine' ? (
                <div className="space-y-2">
                  <Label htmlFor="edit-endpoint" className="text-sm font-medium">
                    {t('providers.endpoint')} *
                  </Label>
                  <Input
                    id="edit-endpoint"
                    placeholder="ep-xxxxx"
                    value={form.endpoint}
                    onChange={(e) =>
                      onFormChange({ ...form, endpoint: e.target.value })
                    }
                    className="bg-background border-input h-10 px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </div>
              ) : null}
            </div>

            {/* Row 4: Base URL */}
            <div className="space-y-2">
              <Label htmlFor="edit-baseUrl" className="text-sm font-medium">
                {t('providers.baseUrl')}
              </Label>
              <Input
                id="edit-baseUrl"
                value={form.baseUrl}
                onChange={(e) =>
                  onFormChange({ ...form, baseUrl: e.target.value })
                }
                className="bg-background border-input h-10 px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            {/* Row 5: Pricing & Quota */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-inputPrice" className="text-sm font-medium">
                  {t('providers.input')} (¥/1M)
                </Label>
                <Input
                  id="edit-inputPrice"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={form.inputPrice}
                  onChange={(e) =>
                    onFormChange({ ...form, inputPrice: e.target.value })
                  }
                  className="bg-background border-input h-10 px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-outputPrice" className="text-sm font-medium">
                  {t('providers.output')} (¥/1M)
                </Label>
                <Input
                  id="edit-outputPrice"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={form.outputPrice}
                  onChange={(e) =>
                    onFormChange({ ...form, outputPrice: e.target.value })
                  }
                  className="bg-background border-input h-10 px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-quotaLimit" className="text-sm font-medium">
                  {t('providers.quotaLimit')}
                </Label>
                <Input
                  id="edit-quotaLimit"
                  placeholder={t('common.noLimit')}
                  value={form.quotaLimit}
                  onChange={(e) =>
                    onFormChange({ ...form, quotaLimit: e.target.value })
                  }
                  className="bg-background border-input h-10 px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2 mt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-10 px-10"
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={onSubmit}
              disabled={saving}
              className="h-10 px-10 bg-purple-600 hover:bg-purple-700 text-white"
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {t('common.save')}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}