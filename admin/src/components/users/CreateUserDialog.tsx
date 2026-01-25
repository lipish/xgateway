import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { t } from "@/lib/i18n"
import { RefreshCw } from "lucide-react"

interface CreateUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  newUser: { username: string; password: string; role_id: string }
  onNewUserChange: (next: CreateUserDialogProps["newUser"]) => void
  error: string | null
  creating: boolean
  onCreate: () => void
}

export function CreateUserDialog({ open, onOpenChange, newUser, onNewUserChange, error, creating, onCreate }: CreateUserDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden border">
        <div className="p-6 space-y-5">
          <DialogHeader className="space-y-1.5 mb-0">
            <DialogTitle className="text-xl font-semibold tracking-tight">{t("users.create")}</DialogTitle>
            <DialogDescription className="text-purple-600 font-medium pb-2">
              {t("users.createDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-2">
            <div className="grid grid-cols-[1fr_200px] gap-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium">
                  {t("users.username")} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="username"
                  value={newUser.username}
                  onChange={(e) => onNewUserChange({ ...newUser, username: e.target.value })}
                  placeholder={t("users.usernamePlaceholder")}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role" className="text-sm font-medium">
                  {t("users.roleLabel")}
                </Label>
                <Select
                  id="role"
                  value={newUser.role_id}
                  onChange={(value) => onNewUserChange({ ...newUser, role_id: value })}
                  options={[
                    { value: "user", label: t("users.roleUser") },
                    { value: "admin", label: t("users.roleAdmin") },
                  ]}
                  triggerClassName="h-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                {t("users.password")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="password"
                type="password"
                value={newUser.password}
                onChange={(e) => onNewUserChange({ ...newUser, password: e.target.value })}
                placeholder={t("users.passwordPlaceholder")}
                className="h-10"
              />
            </div>
            {error && <p className="text-sm text-destructive font-medium">{error}</p>}
          </div>

          <DialogFooter className="gap-2 mt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="h-10 px-10">
              {t("common.cancel")}
            </Button>
            <Button
              onClick={onCreate}
              disabled={creating}
              className="h-10 px-10 bg-purple-600 hover:bg-purple-700 text-white border-0"
            >
              {creating && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
              {t("common.confirm")}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
