import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { t } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { MoreVertical, Pencil, Trash2, User as UserIcon } from "lucide-react"
import type { User } from "./types"

interface UserListCardProps {
  users: User[]
  organizations: { id: number; name: string }[]
  selectedUserId: number | null
  onSelectUser: (user: User) => void
  onRequestEdit: (user: User) => void
  onRequestDelete: (userId: number) => void
}

export function UserListCard({ users, organizations, selectedUserId, onSelectUser, onRequestEdit, onRequestDelete }: UserListCardProps) {
  const getOrgName = (orgId?: number) => {
    if (!orgId) return "-"
    const org = organizations.find((item) => item.id === orgId)
    if (!org) return "-"
    return org.id === 1 && org.name === "default" ? t("organizations.defaultName") : org.name
  }

  return (
    <Card className="w-[520px] shrink-0 h-full flex flex-col">
      <CardContent className="p-6 flex-1 h-full overflow-y-auto">
        {users.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <div className="text-center text-muted-foreground">
              <UserIcon className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">{t("users.noUsers")}</p>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader className="sticky top-0 bg-white">
                <TableRow>
                  <TableHead className="text-left pl-4">{t("users.username")}</TableHead>
                  <TableHead className="text-left w-[180px]">{t("users.orgLabel")}</TableHead>
                  <TableHead className="text-center w-[120px]">{t("users.roleLabel")}</TableHead>
                  <TableHead className="text-center w-[64px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow
                    key={user.id}
                    className={cn(
                      "cursor-pointer hover:bg-muted/50",
                      selectedUserId === user.id ? "bg-violet-50 border-l-2 border-l-violet-400" : ""
                    )}
                    onClick={() => onSelectUser(user)}
                  >
                    <TableCell className="text-left pl-4">
                      <span className="font-medium text-sm">{user.username}</span>
                    </TableCell>
                    <TableCell className="text-left text-sm text-muted-foreground">
                      {getOrgName(user.org_id)}
                    </TableCell>
                    <TableCell className="text-center">
                      {t(`users.role.${user.role_id}`)}
                    </TableCell>
                    <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            aria-label={t("common.actions") || "Actions"}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onRequestEdit(user)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            {t("common.edit")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onRequestDelete(user.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t("common.delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
