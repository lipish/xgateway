import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { t } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { Plus, Server, Trash2, User as UserIcon } from "lucide-react"
import type { Provider, User, UserInstance } from "./types"

interface UserDetailCardProps {
  user: User | null
  providers: Provider[]
  userInstances: UserInstance[]
  onToggleStatus: (user: User) => void
  onRequestDelete: (userId: number) => void
  onOpenGrantDialog: () => void
  onRevokeInstance: (providerId: number) => void
}

export function UserDetailCard({
  user,
  providers,
  userInstances,
  onToggleStatus,
  onRequestDelete,
  onOpenGrantDialog,
  onRevokeInstance,
}: UserDetailCardProps) {
  return (
    <Card className="flex-1 flex flex-col overflow-hidden">
      <CardContent className="p-6 flex-1 overflow-y-auto">
        {/* User Detail */}
        {user ? (
          <div className="space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold">{user.username}</h2>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary">{t(`users.role.${user.role_id}`)}</Badge>
                  <Badge
                    className={cn(
                      "cursor-pointer",
                      user.status === "active"
                        ? "bg-violet-50 text-violet-700 border border-violet-200"
                        : "bg-muted text-muted-foreground border-0"
                    )}
                    onClick={() => onToggleStatus(user)}
                  >
                    {t(`users.status.${user.status}`)}
                  </Badge>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRequestDelete(user.id)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="border rounded-lg p-4 bg-muted/30">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">{t("users.createdAt")}</div>
                  <div className="font-medium mt-1">{new Date(user.created_at).toLocaleDateString()}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">{t("users.userId")}</div>
                  <div className="font-medium mt-1">{user.id}</div>
                </div>
              </div>
            </div>

            {user.role_id === "user" && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">{t("users.grantedInstances")}</h3>
                  <Button size="sm" variant="outline" onClick={onOpenGrantDialog}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t("users.grantInstance")}
                  </Button>
                </div>
                <div className="border rounded-lg divide-y">
                  {userInstances.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <Server className="h-12 w-12 mx-auto mb-2 opacity-20" />
                      <p>{t("users.noInstancesGranted")}</p>
                    </div>
                  ) : (
                    userInstances.map((ui) => {
                      const provider = providers.find((p) => p.id === ui.provider_id)
                      return (
                        <div key={ui.id} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <Server className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <div className="font-medium">{provider?.name || `Instance #${ui.provider_id}`}</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {t("users.grantedOn")} {new Date(ui.granted_at).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => onRevokeInstance(ui.provider_id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <UserIcon className="h-16 w-16 mb-4 opacity-20" />
            <p>{t("users.selectUser")}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
