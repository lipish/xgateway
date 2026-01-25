import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { t } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { User as UserIcon } from "lucide-react"
import type { User } from "./types"

interface UserListCardProps {
  users: User[]
  selectedUserId: number | null
  onSelectUser: (user: User) => void
}

export function UserListCard({ users, selectedUserId, onSelectUser }: UserListCardProps) {
  return (
    <Card className="w-96 flex flex-col overflow-hidden">
      <CardContent className="p-4 flex-1 overflow-y-auto">
        {/* User List */}
        {users.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <div className="text-center text-muted-foreground">
              <UserIcon className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">{t("users.noUsers")}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {users.map((user) => (
              <div
                key={user.id}
                className={cn(
                  "p-3 rounded-lg border cursor-pointer transition-all hover:border-violet-300",
                  selectedUserId === user.id ? "border-violet-400 bg-violet-50" : "border-border"
                )}
                onClick={() => onSelectUser(user)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <UserIcon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{user.username}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs font-normal">
                        {t(`users.role.${user.role_id}`)}
                      </Badge>
                      <Badge
                        className={cn(
                          "text-xs",
                          user.status === "active"
                            ? "bg-violet-50 text-violet-700 border border-violet-200"
                            : "bg-muted text-muted-foreground border-0"
                        )}
                      >
                        {t(`users.status.${user.status}`)}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
