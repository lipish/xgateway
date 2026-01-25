import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { t } from "@/lib/i18n"
import { formatDate } from "@/lib/utils"
import { Plus, Server, Trash2, User as UserIcon } from "lucide-react"
import type { Provider, User, UserInstance } from "./types"

interface UserDetailCardProps {
  user: User | null
  providers: Provider[]
  userInstances: UserInstance[]
  organizations: { id: number; name: string }[]
  onOpenGrantDialog: () => void
  onRevokeInstance: (providerId: number) => void
}

export function UserDetailCard({
  user,
  providers,
  userInstances,
  organizations,
  onOpenGrantDialog,
  onRevokeInstance,
}: UserDetailCardProps) {
  const orgName = (() => {
    if (!user?.org_id) return "-"
    const org = organizations.find((item) => item.id === user.org_id)
    if (!org) return "-"
    return org.id === 1 && org.name === "default" ? t("organizations.defaultName") : org.name
  })()

  return (
    <div className="rounded-lg bg-background">
      <div className="p-4">
        {user ? (
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-xl font-semibold truncate">{user.username}</div>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary">{t(`users.role.${user.role_id}`)}</Badge>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <UserIcon className="h-16 w-16 mb-4 opacity-20" />
            <p>{t("users.selectUser")}</p>
          </div>
        )}
      </div>

      {user && (
        <>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md bg-muted/60 p-3">
                <div className="text-xs text-muted-foreground">{t("users.createdAt")}</div>
                <div className="mt-1 text-sm font-medium">{formatDate(user.created_at)}</div>
              </div>
              <div className="rounded-md bg-muted/60 p-3">
                <div className="text-xs text-muted-foreground">{t("users.userId")}</div>
                <div className="mt-1 text-sm font-medium">{user.id}</div>
              </div>
            </div>
            <div className="rounded-md bg-muted/60 p-3">
              <div className="text-xs text-muted-foreground">{t("users.orgLabel")}</div>
              <div className="mt-1 text-sm font-medium">{orgName}</div>
            </div>

            {user.role_id === "user" && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-medium">{t("users.grantedInstances")}</div>
                  <Button size="sm" variant="outline" onClick={onOpenGrantDialog}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t("users.grantInstance")}
                  </Button>
                </div>
                <div className="rounded-lg divide-y">
                  {userInstances.length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground">
                      <Server className="h-10 w-10 mx-auto mb-2 opacity-20" />
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
                                {t("users.grantedOn")} {formatDate(ui.granted_at)}
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
        </>
      )}
    </div>
  )
}
