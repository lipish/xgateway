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
  }
  onFormChange: (form: any) => void
  onProviderTypeChange: (type: string) => void
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
  onSubmit,
  adding,
  error,
  getProviderTypeConfig,
}: AddProviderDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('providers.addProvider')}</DialogTitle>
          <DialogDescription>{t('providers.addProviderDesc')}</DialogDescription>
        </DialogHeader>
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="add-type">{t('providers.providerType')}</Label>
              <Select
                id="add-type"
                value={form.providerType}
                onChange={onProviderTypeChange}
                options={providerTypes.map((pt) => ({
                  value: pt.id,
                  label: pt.label,
                }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-model">{t('providers.model')}</Label>
              <Select
                id="add-model"
                value={form.model}
                onChange={(val) => onFormChange({ ...form, model: val })}
                options={
                  getProviderTypeConfig(form.providerType)?.models.map(
                    (m) => ({ value: m.id, label: m.name }),
                  ) || []
                }
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="add-name">{t('providers.name')} *</Label>
              <Input
                id="add-name"
                placeholder={t('providers.namePlaceholder')}
                value={form.name}
                onChange={(e) =>
                  onFormChange({ ...form, name: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-priority">{t('providers.priorityRange')}</Label>
              <Input
                id="add-priority"
                type="number"
                min="1"
                max="100"
                value={form.priority}
                onChange={(e) =>
                  onFormChange({ ...form, priority: e.target.value })
                }
              />
            </div>
          </div>
          {form.providerType === 'tencent' ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="add-secretId">Secret ID *</Label>
                <Input
                  id="add-secretId"
                  placeholder="AKIDxxxxxxxxxx"
                  value={form.secretId}
                  onChange={(e) =>
                    onFormChange({ ...form, secretId: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="add-secretKey">Secret Key *</Label>
                <Input
                  id="add-secretKey"
                  type="password"
                  placeholder="Tencent Cloud Secret Key"
                  value={form.secretKey}
                  onChange={(e) =>
                    onFormChange({ ...form, secretKey: e.target.value })
                  }
                />
              </div>
            </div>
          ) : (
            <div className="grid gap-2">
              <Label htmlFor="add-apiKey">API Key *</Label>
              <Input
                id="add-apiKey"
                type="password"
                placeholder="sk-..."
                value={form.apiKey}
                onChange={(e) =>
                  onFormChange({ ...form, apiKey: e.target.value })
                }
              />
            </div>
          )}
          {form.providerType === 'volcengine' && (
            <div className="grid gap-2">
              <Label htmlFor="add-endpoint">{t('providers.endpoint')} *</Label>
              <Input
                id="add-endpoint"
                placeholder="ep-xxxxx (Required for Volcengine)"
                value={form.endpoint}
                onChange={(e) =>
                  onFormChange({ ...form, endpoint: e.target.value })
                }
              />
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="add-baseUrl">{t('providers.baseUrl')}</Label>
            <Input
              id="add-baseUrl"
              value={form.baseUrl}
              onChange={(e) =>
                onFormChange({ ...form, baseUrl: e.target.value })
              }
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={onSubmit} disabled={adding}>
            {adding ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            {t('common.add')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}