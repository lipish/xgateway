import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { t } from "@/lib/i18n"
import { Plus, Server, Trash2 } from "lucide-react"

import type { Provider, UserInstance } from "./types"

interface GrantInstanceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  username?: string
  providers: Provider[]
  userInstances: UserInstance[]
  grantData: { provider_id: string }
  onGrantDataChange: (next: { provider_id: string }) => void
  onGrant: () => void
  onRevoke: (providerId: number) => void
}

export function GrantInstanceDialog({
  open,
  onOpenChange,
  username,
  providers,
  userInstances,
  grantData,
  onGrantDataChange,
  onGrant,
  onRevoke,
}: GrantInstanceDialogProps) {
  const availableProviderOptions = providers
    .filter((p) => !userInstances.find((ui) => ui.provider_id === p.id))
    .map((p) => ({ value: p.id.toString(), label: p.name }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden border">
        <div className="p-6 space-y-5">
          <DialogHeader className="space-y-1.5 mb-0">
            <DialogTitle className="text-xl font-semibold tracking-tight">{t("users.manageInstanceAccess")}</DialogTitle>
            <DialogDescription className="text-purple-600 font-medium pb-2">
              {t("users.manageInstanceAccessFor")} <span className="text-foreground font-bold">{username}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t("users.grantNewInstance")}</Label>
              <div className="flex gap-2">
                <Select
                  value={grantData.provider_id}
                  onChange={(value) => onGrantDataChange({ provider_id: value })}
                  options={availableProviderOptions}
                  placeholder={t("users.selectInstance")}
                  triggerClassName="h-10 flex-1"
                />
                <Button
                  onClick={onGrant}
                  disabled={!grantData.provider_id}
                  className="h-10 px-6 bg-purple-600 hover:bg-purple-700 text-white border-0"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t("users.grant")}
                </Button>
              </div>
            </div>

            <div className="border rounded-md overflow-hidden bg-background">
              <div className="p-3 border-b bg-muted/30">
                <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">{t("users.grantedInstances")}</h4>
              </div>
              <div className="divide-y max-h-48 overflow-y-auto scrollbar-hide">
                {userInstances.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground text-sm">{t("users.noInstancesGranted")}</div>
                ) : (
                  userInstances.map((ui) => {
                    const provider = providers.find((p) => p.id === ui.provider_id)
                    return (
                      <div key={ui.id} className="flex items-center justify-between p-3 hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <Server className="h-4 w-4 text-purple-600" />
                          <div>
                            <div className="font-medium text-sm">{provider?.name || `Instance #${ui.provider_id}`}</div>
                            <div className="text-[10px] text-muted-foreground uppercase font-semibold mt-0.5">
                              {t("users.grantedSince")} {new Date(ui.granted_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => onRevoke(ui.provider_id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="h-10 px-10 w-full sm:w-auto">
              {t("common.cancel")}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
