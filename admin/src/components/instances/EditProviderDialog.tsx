import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
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
  }
  onFormChange: (form: any) => void
  onSubmit: () => void
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
  onSubmit,
  saving,
  error,
}: EditProviderDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('providers.editProvider')}</DialogTitle>
        </DialogHeader>
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">{t('providers.name')}</Label>
              <Input
                id="edit-name"
                value={form.name}
                onChange={(e) =>
                  onFormChange({ ...form, name: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-model">{t('providers.model')}</Label>
              {providerTypeConfig?.models && providerTypeConfig.models.length > 0 ? (
                <Select
                  id="edit-model"
                  value={form.model}
                  onChange={(value) => onFormChange({ ...form, model: value })}
                  options={providerTypeConfig.models.map((m) => ({
                    value: m.id,
                    label: m.name,
                  }))}
                  placeholder={t('providers.selectModel')}
                />
              ) : (
                <Input
                  id="edit-model"
                  value={form.model}
                  onChange={(e) =>
                    onFormChange({ ...form, model: e.target.value })
                  }
                />
              )}
            </div>
          </div>
          {providerType === 'tencent' ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-secretId">Secret ID</Label>
                <Input
                  id="edit-secretId"
                  type="text"
                  value={form.secretId}
                  placeholder="Enter new Secret ID or leave masked"
                  onChange={(e) =>
                    onFormChange({ ...form, secretId: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-secretKey">Secret Key</Label>
                <Input
                  id="edit-secretKey"
                  type="text"
                  value={form.secretKey}
                  placeholder="Enter new Secret Key or leave masked"
                  onChange={(e) =>
                    onFormChange({ ...form, secretKey: e.target.value })
                  }
                />
              </div>
            </div>
          ) : (
            <div className="grid gap-2">
              <Label htmlFor="edit-apiKey">API Key</Label>
              <Input
                id="edit-apiKey"
                type="text"
                value={form.apiKey}
                placeholder="Enter new API key or leave masked to keep current"
                onChange={(e) =>
                  onFormChange({ ...form, apiKey: e.target.value })
                }
              />
            </div>
          )}
          {providerType === 'volcengine' && (
            <div className="grid gap-2">
              <Label htmlFor="edit-endpoint">{t('providers.endpoint')} *</Label>
              <Input
                id="edit-endpoint"
                placeholder="ep-xxxxx (Required for Volcengine)"
                value={form.endpoint}
                onChange={(e) =>
                  onFormChange({ ...form, endpoint: e.target.value })
                }
              />
            </div>
          )}
          <div className="grid gap-4" style={{ gridTemplateColumns: '1fr auto' }}>
            <div className="grid gap-2">
              <Label htmlFor="edit-baseUrl">{t('providers.baseUrl')}</Label>
              <Input
                id="edit-baseUrl"
                value={form.baseUrl}
                onChange={(e) =>
                  onFormChange({ ...form, baseUrl: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2" style={{ width: '120px' }}>
              <Label htmlFor="edit-priority">{t('providers.priority')}</Label>
              <Input
                id="edit-priority"
                type="number"
                value={form.priority}
                onChange={(e) =>
                  onFormChange({ ...form, priority: e.target.value })
                }
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={onSubmit} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            {t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}