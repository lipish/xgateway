import { useEffect, useMemo, useState } from "react"
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api"
import { t } from "@/lib/i18n"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import { ConfirmAlertDialog } from "@/components/ui/confirm-alert-dialog"
import { PageHeader } from "@/components/layout/page-header"
import { toast } from "sonner"
import { cn, formatDate } from "@/lib/utils"
import { TwoPanelLayout } from "@/components/layout/two-panel-layout"
import { MoreVertical, Pencil, Plus, Trash2 } from "lucide-react"
import { DetailPanel } from "@/components/layout/detail-panel"

type ApiResponse<T> = {
  success: boolean
  data?: T
  message: string
}

type Organization = {
  id: number
  name: string
  status: string
  created_at: string
  updated_at: string
}

type OrgUser = {
  id: number
  username: string
  role_id: string
  status: string
  created_at: string
  updated_at: string
}

export function OrganizationsPage() {
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [createName, setCreateName] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null)
  const [memberDialogOpen, setMemberDialogOpen] = useState(false)

  const [orgUsers, setOrgUsers] = useState<OrgUser[]>([])
  const [orgUsersLoading, setOrgUsersLoading] = useState(false)
  const [addUserId, setAddUserId] = useState("")
  const [addRole, setAddRole] = useState<"admin" | "member">("member")
  const [removeUserId, setRemoveUserId] = useState<number | null>(null)

  const selectedOrg = useMemo(() => orgs.find((o) => o.id === selectedId) || null, [orgs, selectedId])

  const getOrgDisplayName = (o: Organization) => {
    if (o.id === 1 && o.name === "default") return t("organizations.defaultName")
    return o.name
  }

  useEffect(() => {
    fetchOrgs()
  }, [])

  useEffect(() => {
    if (orgs.length === 0) {
      setSelectedId(null)
      return
    }
    if (!selectedId || !orgs.some((o) => o.id === selectedId)) {
      setSelectedId(orgs[0].id)
    }
  }, [orgs, selectedId])

  useEffect(() => {
    if (!selectedOrg) {
      setOrgUsers([])
      return
    }
    fetchOrgUsers(selectedOrg.id)
  }, [selectedOrg?.id])

  const fetchOrgs = async () => {
    try {
      setLoading(true)
      setError(null)
      const resp = await apiGet<ApiResponse<Organization[]>>("/api/organizations")
      if (!resp.success) {
        setOrgs([])
        setError(resp.message || t("common.networkError"))
        return
      }
      setOrgs(resp.data || [])
    } catch (e) {
      setOrgs([])
      const msg = e instanceof Error ? e.message : null
      setError(msg || t("common.networkError"))
    } finally {
      setLoading(false)
    }
  }

  const fetchOrgUsers = async (orgId: number) => {
    try {
      setOrgUsersLoading(true)
      setError(null)
      const resp = await apiGet<ApiResponse<OrgUser[]>>(`/api/organizations/${orgId}/users`)
      if (!resp.success) {
        setOrgUsers([])
        setError(resp.message || t("common.networkError"))
        return
      }
      setOrgUsers(resp.data || [])
    } catch (e) {
      setOrgUsers([])
      const msg = e instanceof Error ? e.message : null
      setError(msg || t("common.networkError"))
    } finally {
      setOrgUsersLoading(false)
    }
  }

  const handleAddOrgUser = async () => {
    if (!selectedOrg) return
    const userId = Number(addUserId)
    if (!Number.isFinite(userId) || userId <= 0) return
    try {
      setSaving(true)
      setError(null)
      const resp = await apiPost<ApiResponse<unknown>>(`/api/organizations/${selectedOrg.id}/users`, {
        user_id: userId,
        role: addRole,
      })
      if (!resp.success) {
        setError(resp.message || t("common.saveFailed"))
        return
      }
      setAddUserId("")
      await fetchOrgUsers(selectedOrg.id)
    } catch (e) {
      const msg = e instanceof Error ? e.message : null
      setError(msg || t("common.networkError"))
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveOrgUser = async () => {
    if (!selectedOrg || !removeUserId) return
    try {
      setSaving(true)
      setError(null)
      const resp = await apiDelete<ApiResponse<unknown>>(`/api/organizations/${selectedOrg.id}/users/${removeUserId}`)
      if (!resp.success) {
        setError(resp.message || t("common.saveFailed"))
        return
      }
      setRemoveUserId(null)
      await fetchOrgUsers(selectedOrg.id)
    } catch (e) {
      const msg = e instanceof Error ? e.message : null
      setError(msg || t("common.networkError"))
    } finally {
      setSaving(false)
    }
  }

  const handleCreate = async () => {
    const name = createName.trim()
    if (!name) return
    const isEdit = Boolean(editingOrg)
    try {
      setSaving(true)
      setError(null)
      const resp = isEdit
        ? await apiPut<ApiResponse<Organization>>(`/api/organizations/${editingOrg!.id}`, { name })
        : await apiPost<ApiResponse<Organization>>("/api/organizations", { name })
      if (!resp.success) {
        setError(resp.message || t("common.saveFailed"))
        return
      }
      setCreateName("")
      setCreateDialogOpen(false)
      setEditingOrg(null)
      if (!isEdit) {
        toast.success(t("organizations.createSuccess"))
      }
      await fetchOrgs()
      if (resp.data?.id) {
        setSelectedId(resp.data.id)
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : null
      setError(msg || t("common.networkError"))
    } finally {
      setSaving(false)
    }
  }


  const openEditOrg = (org: Organization) => {
    setEditingOrg(org)
    setCreateName(org.name)
    setCreateDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      setSaving(true)
      setError(null)
      const resp = await apiDelete<ApiResponse<unknown>>(`/api/organizations/${deleteId}`)
      if (!resp.success) {
        setError(resp.message || t("common.saveFailed"))
        return
      }
      setDeleteId(null)
      await fetchOrgs()
    } catch (e) {
      const msg = e instanceof Error ? e.message : null
      setError(msg || t("common.networkError"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex-1 min-h-0 h-full flex flex-col page-transition p-6 scrollbar-hide">
      <PageHeader
        title={t("organizations.title")}
        subtitle={t("organizations.description")}
        action={
          <Button size="sm" onClick={() => setCreateDialogOpen(true)} className="bg-primary hover:bg-primary/90">
            <Plus className="mr-2 h-4 w-4" />
            {t("organizations.add") || t("organizations.create")}
          </Button>
        }
      />

      <div className="max-w-[1400px] mx-auto w-full flex flex-col flex-1 min-h-0 h-full">
        <TwoPanelLayout
          left={
            <Card className="w-[520px] shrink-0 h-full flex flex-col">
              <CardContent className="p-6 flex-1 h-full overflow-y-auto space-y-4">
                {error && <div className="text-sm text-destructive font-medium">{error}</div>}

                <div className="space-y-2">
                  <div className="text-sm font-medium">{t("organizations.list")}</div>
                  {loading ? (
                    <div className="text-sm text-muted-foreground">{t("common.loading")}</div>
                  ) : orgs.length === 0 ? (
                    <div className="text-sm text-muted-foreground">{t("organizations.empty")}</div>
                  ) : (
                    <div className="overflow-hidden rounded-lg">
                      <Table>
                        <TableHeader className="sticky top-0 bg-white">
                          <TableRow>
                            <TableHead className="text-left pl-4">{t("organizations.title")}</TableHead>
                            <TableHead className="text-center w-[120px]">{t("organizations.label")}</TableHead>
                            <TableHead className="text-center w-[80px]">{t("organizations.id")}</TableHead>
                            <TableHead className="text-center w-[64px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {orgs.map((o) => {
                            const active = o.id === selectedId
                            return (
                              <TableRow
                                key={o.id}
                                className={cn(
                                  "cursor-pointer transition-colors",
                                  active ? "bg-violet-50 border-l-2 border-l-violet-400" : "hover:bg-muted/40"
                                )}
                                onClick={() => setSelectedId(o.id)}
                              >
                                <TableCell className="text-left pl-4">
                                  <span className="font-medium text-sm">{getOrgDisplayName(o)}</span>
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge
                                    variant="outline"
                                    className={o.status === "active" ? "bg-violet-50 text-violet-700 border border-violet-200" : "bg-muted text-muted-foreground border-0"}
                                  >
                                    {t(`organizations.labelText.${o.status}`)}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-center text-xs text-muted-foreground">{o.id}</TableCell>
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
                                      <DropdownMenuItem onClick={() => openEditOrg(o)}>
                                        <Pencil className="h-4 w-4 mr-2" />
                                        {t("common.edit")}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => setDeleteId(o.id)}
                                        disabled={o.id === 1 || saving}
                                        className="text-destructive focus:text-destructive"
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        {t("common.delete")}
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          }
          right={
            <DetailPanel>
              {!selectedOrg ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">{t("organizations.select")}</div>
              ) : (
                <div className="space-y-5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="space-y-1">
                      <div className="text-xl font-semibold">{getOrgDisplayName(selectedOrg)}</div>
                      <div className="text-sm text-muted-foreground">{t("organizations.id")}: {selectedOrg.id}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-md bg-muted p-3">
                      <div className="text-xs text-muted-foreground">{t("organizations.label")}</div>
                      <div className="mt-1 text-sm font-medium">{t(`organizations.labelText.${selectedOrg.status}`)}</div>
                    </div>
                    <div className="rounded-md bg-muted p-3">
                      <div className="text-xs text-muted-foreground">{t("organizations.updatedAt")}</div>
                      <div className="mt-1 text-sm font-medium">{formatDate(selectedOrg.updated_at)}</div>
                    </div>
                  </div>


                  <Card>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-medium">{t("organizations.membersTitle")}</div>
                        <Button size="sm" variant="outline" onClick={() => setMemberDialogOpen(true)}>
                          <Plus className="mr-2 h-4 w-4" />
                          {t("organizations.addMember")}
                        </Button>
                      </div>

                      {orgUsersLoading ? (
                        <div className="text-sm text-muted-foreground">{t("common.loading")}</div>
                      ) : orgUsers.length === 0 ? (
                        <div className="text-sm text-muted-foreground">{t("organizations.membersEmpty")}</div>
                      ) : (
                        <div className="overflow-hidden rounded-lg">
                          <Table>
                            <TableHeader className="sticky top-0 bg-white">
                              <TableRow>
                                <TableHead className="text-left pl-4">{t("users.username")}</TableHead>
                                <TableHead className="text-center w-[120px]">{t("users.roleLabel")}</TableHead>
                                <TableHead className="text-center w-[120px]">{t("users.statusLabel")}</TableHead>
                                <TableHead className="text-center w-[80px]">{t("common.idLabel")}</TableHead>
                                <TableHead className="text-center w-[64px]"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {orgUsers.map((u) => (
                                <TableRow key={u.id} className="hover:bg-muted/50">
                                  <TableCell className="text-left pl-4">
                                    <div className="text-sm font-medium truncate">{u.username}</div>
                                  </TableCell>
                                  <TableCell className="text-center text-xs">{t(`users.role.${u.role_id}`)}</TableCell>
                                  <TableCell className="text-center text-xs">{t(`users.status.${u.status}`)}</TableCell>
                                  <TableCell className="text-center text-xs text-muted-foreground">{u.id}</TableCell>
                                  <TableCell className="text-center">
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
                                        <DropdownMenuItem
                                          onClick={() => setRemoveUserId(u.id)}
                                          disabled={saving}
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
                </div>
              )}
            </DetailPanel>
          }
        />


        <Dialog open={createDialogOpen} onOpenChange={(open) => {
          if (!open) {
            setCreateName("")
            setEditingOrg(null)
            setError(null)
          }
          setCreateDialogOpen(open)
        }}>
          <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden border">
            <div className="p-6 space-y-5">
              <DialogHeader className="space-y-1.5 mb-0">
                <DialogTitle className="text-xl font-semibold tracking-tight">{editingOrg ? t("organizations.edit") : t("organizations.add")}</DialogTitle>
                <DialogDescription className="text-purple-600 font-medium pb-2">
                  {editingOrg ? t("organizations.editDesc") : t("organizations.addDesc")}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-5 py-2">
                <div className="space-y-2">
                  <Label htmlFor="org-name" className="text-sm font-medium">
                    {t("organizations.name")} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="org-name"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    placeholder={t("organizations.namePlaceholder")}
                    className="h-10"
                  />
                </div>
                {error && <p className="text-sm text-destructive font-medium">{error}</p>}
              </div>

              <DialogFooter className="gap-2 mt-2">
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)} className="h-10 px-10">
                  {t("common.cancel")}
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={saving || !createName.trim()}
                  className="h-10 px-10 bg-purple-600 hover:bg-purple-700 text-white border-0"
                >
                  {saving ? t("common.saving") || t("common.save") : editingOrg ? t("common.save") : t("common.confirm")}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={memberDialogOpen} onOpenChange={(open) => {
          if (!open) {
            setAddUserId("")
            setAddRole("member")
            setError(null)
          }
          setMemberDialogOpen(open)
        }}>
          <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden border">
            <div className="p-6 space-y-5">
              <DialogHeader className="space-y-1.5 mb-0">
                <DialogTitle className="text-xl font-semibold tracking-tight">{t("organizations.addMemberTitle")}</DialogTitle>
                <DialogDescription className="text-purple-600 font-medium pb-2">
                  {t("organizations.addMemberDesc")}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-5 py-2">
                <div className="space-y-2">
                  <Label htmlFor="org-user-id" className="text-sm font-medium">
                    {t("organizations.memberUserId")} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="org-user-id"
                    value={addUserId}
                    onChange={(e) => setAddUserId(e.target.value)}
                    placeholder={t("organizations.userIdPlaceholder")}
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="org-user-role" className="text-sm font-medium">
                    {t("organizations.memberRole")}
                  </Label>
                  <select
                    id="org-user-role"
                    value={addRole}
                    onChange={(e) => setAddRole(e.target.value as "admin" | "member")}
                    className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="member">{t("organizations.roleMember")}</option>
                    <option value="admin">{t("organizations.roleAdmin")}</option>
                  </select>
                </div>
                {error && <p className="text-sm text-destructive font-medium">{error}</p>}
              </div>

              <DialogFooter className="gap-2 mt-2">
                <Button variant="outline" onClick={() => setMemberDialogOpen(false)} className="h-10 px-10">
                  {t("common.cancel")}
                </Button>
                <Button
                  onClick={handleAddOrgUser}
                  disabled={saving || !addUserId.trim()}
                  className="h-10 px-10 bg-purple-600 hover:bg-purple-700 text-white border-0"
                >
                  {saving ? t("common.saving") || t("common.save") : editingOrg ? t("common.save") : t("common.confirm")}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
        <ConfirmAlertDialog
          open={!!deleteId}
          onOpenChange={(open) => {
            if (!open) setDeleteId(null)
          }}
          title={t("organizations.confirmDelete")}
          description={t("organizations.deleteWarning")}
          cancelText={t("common.cancel")}
          confirmText={t("common.delete")}
          onConfirm={handleDelete}
        />

        <ConfirmAlertDialog
          open={removeUserId != null}
          onOpenChange={(open) => {
            if (!open) setRemoveUserId(null)
          }}
          title={t("organizations.confirmRemoveMember")}
          description={t("organizations.removeMemberWarning")}
          cancelText={t("common.cancel")}
          confirmText={t("common.delete")}
          onConfirm={handleRemoveOrgUser}
        />
      </div>
    </div>
  )
}
