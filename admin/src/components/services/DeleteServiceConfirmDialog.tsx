import { ConfirmAlertDialog } from "@/components/ui/confirm-alert-dialog"
import { t } from "@/lib/i18n"

interface DeleteServiceConfirmDialogProps {
  serviceId: string | null
  onServiceIdChange: (id: string | null) => void
  onConfirm: () => void
}

export function DeleteServiceConfirmDialog({ serviceId, onServiceIdChange, onConfirm }: DeleteServiceConfirmDialogProps) {
  return (
    <ConfirmAlertDialog
      open={!!serviceId}
      onOpenChange={(open) => !open && onServiceIdChange(null)}
      title={t("services.confirmDelete")}
      description={t("services.deleteWarning")}
      cancelText={t("common.cancel")}
      confirmText={t("common.delete")}
      onConfirm={onConfirm}
      confirmClassName="bg-destructive text-destructive-foreground hover:bg-destructive/90"
    />
  )
}
