import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { t } from "@/lib/i18n"
import { RefreshCw } from "lucide-react"
import type { User } from "./types"

interface OrganizationOption {
  value: string
  label: string
}

interface EditUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: User | null
  editUser: { role_id: string; password: string; org_id?: string }
  organizationOptions: OrganizationOption[]
  onEditUserChange: (next: EditUserDialogProps["editUser"]) => void
  error: string | null
  saving: boolean
  onSave: () => void
}

export function EditUserDialog({
  open,
  onOpenChange,
  user,
  editUser,
  organizationOptions,
  onEditUserChange,
  error,
  saving,
  onSave,
}: EditUserDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden border">
        <div className="p-6 space-y-5">
          <DialogHeader className="space-y-1.5 mb-0">
            <DialogTitle className="text-xl font-semibold tracking-tight">{t("users.edit")}</DialogTitle>
            <DialogDescription className="text-purple-600 font-medium pb-2">
              {t("users.editDescription")} <span className="text-foreground font-bold">{user?.username}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-organization" className="text-sm font-medium">
                  {t("organizations.title")}
                </Label>
                <Select
                  id="edit-organization"
                  value={editUser.org_id ?? (organizationOptions[0]?.value ?? "")}
                  onChange={(value) => onEditUserChange({ ...editUser, org_id: value })}
                  options={organizationOptions}
                  placeholder={t("organizations.select")}
                  triggerClassName="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-role" className="text-sm font-medium">
                  {t("users.roleLabel")}
                </Label>
                <Select
                  id="edit-role"
                  value={editUser.role_id}
                  onChange={(value) => onEditUserChange({ ...editUser, role_id: value })}
                  options={[
                    { value: "user", label: t("users.roleUser") },
                    { value: "admin", label: t("users.roleAdmin") },
                  ]}
                  triggerClassName="h-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-password" className="text-sm font-medium">
                {t("users.password")}
              </Label>
              <Input
                id="edit-password"
                type="password"
                value={editUser.password}
                onChange={(e) => onEditUserChange({ ...editUser, password: e.target.value })}
                placeholder={t("users.passwordPlaceholder")}
                className="h-10"
              />
            </div>
            {error && <p className="text-sm text-destructive font-medium">{error}</p>}
          </div>

          <DialogFooter className="gap-2 mt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="h-10 px-10">
              {t("common.close")}
            </Button>
            <Button
              onClick={onSave}
              disabled={saving}
              className="h-10 px-10 bg-purple-600 hover:bg-purple-700 text-white border-0"
            >
              {saving && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
              {t("common.save")}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
