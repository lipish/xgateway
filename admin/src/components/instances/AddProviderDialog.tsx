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

interface AddProviderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  providerTypes: ProviderTypeConfig[]
  form: {
    name: string
    providerType: string
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
  onFormChange: (form: any) => void
  onProviderTypeChange: (type: string) => void
  onModelChange?: (model: string) => void
  onSubmit: () => void
  adding: boolean
  error?: string | null
  getProviderTypeConfig: (typeId: string) => ProviderTypeConfig | undefined
}

export function AddProviderDialog({
  open,
  onOpenChange,
  providerTypes,
  form,
  onFormChange,
  onProviderTypeChange,
  onModelChange,
  onSubmit,
  adding,
  error,
  getProviderTypeConfig,
}: AddProviderDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden border">
        <div className="p-6 space-y-5">
          <DialogHeader className="space-y-1.5 mb-0">
            <DialogTitle className="text-xl font-semibold tracking-tight text-foreground">
              {t('providers.addProvider')}
            </DialogTitle>
            <DialogDescription className="text-purple-600 font-medium pb-2">
              {t('providers.addProviderDesc')}
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="grid gap-5 py-2">
            {/* Row 1: Provider and Model */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="add-providerType" className="text-sm font-medium">
                  {t('providers.providerType')}
                </Label>
                <Select
                  id="add-providerType"
                  value={form.providerType}
                  onChange={onProviderTypeChange}
                  options={providerTypes.map((t) => ({
                    value: t.id,
                    label: t.label,
                  }))}
                  triggerClassName="bg-background border-input h-10 px-3 py-2 text-sm ring-offset-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-model" className="text-sm font-medium">
                  {t('providers.model')}
                </Label>
                <Select
                  id="add-model"
                  value={form.model}
                  onChange={(val) => {
                    if (onModelChange) {
                      onModelChange(val);
                    } else {
                      onFormChange({ ...form, model: val });
                    }
                  }}
                  options={
                    getProviderTypeConfig(form.providerType)?.models.map(
                      (m) => ({ value: m.id, label: m.name }),
                    ) || []
                  }
                  triggerClassName="bg-background border-input h-10 px-3 py-2 text-sm ring-offset-background"
                />
              </div>
            </div>

            {/* Row 2: Name and Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="add-name" className="text-sm font-medium">
                  {t('providers.name')} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="add-name"
                  placeholder={t('providers.namePlaceholder')}
                  value={form.name}
                  onChange={(e) =>
                    onFormChange({ ...form, name: e.target.value })
                  }
                  className="bg-background border-input h-10 px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-priority" className="text-sm font-medium">
                  {t('providers.priorityRange')}
                </Label>
                <Input
                  id="add-priority"
                  type="number"
                  value={form.priority}
                  onChange={(e) =>
                    onFormChange({ ...form, priority: e.target.value })
                  }
                  className="bg-background border-input h-10 px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
            </div>

            {/* Row 3: API Key or Tencent Secrets */}
            {form.providerType === 'tencent' ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="add-secretId" className="text-sm font-medium">
                    Secret ID <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="add-secretId"
                    type="password"
                    value={form.secretId}
                    onChange={(e) =>
                      onFormChange({ ...form, secretId: e.target.value })
                    }
                    className="bg-background border-input h-10 px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="add-secretKey" className="text-sm font-medium">
                    Secret Key <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="add-secretKey"
                    type="password"
                    value={form.secretKey}
                    onChange={(e) =>
                      onFormChange({ ...form, secretKey: e.target.value })
                    }
                    className="bg-background border-input h-10 px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="add-apiKey" className="text-sm font-medium">
                  API Key <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="add-apiKey"
                  type="password"
                  placeholder="sk-..."
                  value={form.apiKey}
                  onChange={(e) =>
                    onFormChange({ ...form, apiKey: e.target.value })
                  }
                  className="bg-background border-input h-10 px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
            )}

            {/* Row 4: Volcengine Endpoint (if applicable) */}
            {form.providerType === 'volcengine' && (
              <div className="space-y-2">
                <Label htmlFor="add-endpoint" className="text-sm font-medium">
                  {t('providers.endpoint')} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="add-endpoint"
                  placeholder="ep-xxxxx (Required for Volcengine)"
                  value={form.endpoint}
                  onChange={(e) =>
                    onFormChange({ ...form, endpoint: e.target.value })
                  }
                  className="bg-background border-input h-10 px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
            )}

            {/* Row 5: Base URL */}
            <div className="space-y-2">
              <Label htmlFor="add-baseUrl" className="text-sm font-medium">
                {t('providers.baseUrl')}
              </Label>
              <Input
                id="add-baseUrl"
                placeholder="https://api.deepseek.com/v1"
                value={form.baseUrl}
                onChange={(e) =>
                  onFormChange({ ...form, baseUrl: e.target.value })
                }
                className="bg-background border-input h-10 px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            {/* Row 6: Pricing & Quota */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="add-inputPrice" className="text-sm font-medium">
                  {t('providers.input')} (¥/1M)
                </Label>
                <Input
                  id="add-inputPrice"
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
                <Label htmlFor="add-outputPrice" className="text-sm font-medium">
                  {t('providers.output')} (¥/1M)
                </Label>
                <Input
                  id="add-outputPrice"
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
                <Label htmlFor="add-quotaLimit" className="text-sm font-medium">
                  {t('providers.quotaLimit')}
                </Label>
                <Input
                  id="add-quotaLimit"
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
              disabled={adding}
              className="h-10 px-10 bg-purple-600 hover:bg-purple-700 text-white"
            >
              {adding ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {t('common.add')}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}