import { ConfirmAlertDialog } from "@/components/ui/confirm-alert-dialog"
import { t } from "@/lib/i18n"

interface DeleteApiKeyConfirmDialogProps {
  apiKeyId: number | null
  onApiKeyIdChange: (id: number | null) => void
  onConfirm: () => void
}

export function DeleteApiKeyConfirmDialog({ apiKeyId, onApiKeyIdChange, onConfirm }: DeleteApiKeyConfirmDialogProps) {
  return (
    <ConfirmAlertDialog
      open={apiKeyId != null}
      onOpenChange={(open) => !open && onApiKeyIdChange(null)}
      title={t("common.delete")}
      description={t("apiKeys.confirmDelete")}
      cancelText={t("common.cancel")}
      confirmText={t("common.delete")}
      onConfirm={onConfirm}
      confirmClassName="bg-destructive text-destructive-foreground hover:bg-destructive/90"
    />
  )
}
