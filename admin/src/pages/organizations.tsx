import { useEffect, useMemo, useState } from "react"
import { apiDelete, apiGet, apiPost } from "@/lib/api"
import { t } from "@/lib/i18n"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { ConfirmAlertDialog } from "@/components/ui/confirm-alert-dialog"
import { PageHeader } from "@/components/layout/page-header"
import { TwoPanelLayout } from "@/components/layout/two-panel-layout"
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
    try {
      setSaving(true)
      setError(null)
      const resp = await apiPost<ApiResponse<Organization>>("/api/organizations", { name })
      if (!resp.success) {
        setError(resp.message || t("common.saveFailed"))
        return
      }
      setCreateName("")
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
      <PageHeader title={t("organizations.title")} subtitle={t("organizations.description")} onRefresh={fetchOrgs} loading={loading} />

      <div className="max-w-[1400px] mx-auto w-full flex flex-col flex-1 min-h-0 h-full">
        <TwoPanelLayout
          left={
            <Card className="w-[420px] max-w-full min-h-0 overflow-hidden">
              <CardContent className="p-4 space-y-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium">{t("organizations.create")}</div>
                  <div className="flex gap-2">
                    <Input value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder={t("organizations.namePlaceholder")} className="h-10" />
                    <Button onClick={handleCreate} disabled={saving || !createName.trim()} className="h-10 px-4">
                      {t("common.save")}
                    </Button>
                  </div>
                </div>

                {error && <div className="text-sm text-destructive font-medium">{error}</div>}

                <div className="space-y-2">
                  <div className="text-sm font-medium">{t("organizations.list")}</div>
                  {loading ? (
                    <div className="text-sm text-muted-foreground">{t("common.loading")}</div>
                  ) : orgs.length === 0 ? (
                    <div className="text-sm text-muted-foreground">{t("organizations.empty")}</div>
                  ) : (
                    <div className="space-y-1">
                      {orgs.map((o) => {
                        const active = o.id === selectedId
                        return (
                          <button
                            key={o.id}
                            type="button"
                            onClick={() => setSelectedId(o.id)}
                            className={`w-full text-left px-3 py-2 rounded-md border transition-colors ${active ? "bg-accent" : "bg-background hover:bg-accent/50"}`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="truncate font-medium text-sm">{getOrgDisplayName(o)}</div>
                              <div className="text-xs text-muted-foreground">#{o.id}</div>
                            </div>
                          </button>
                        )
                      })}
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
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="space-y-1">
                      <div className="text-xl font-semibold">{getOrgDisplayName(selectedOrg)}</div>
                      <div className="text-sm text-muted-foreground">{t("organizations.id")}: {selectedOrg.id}</div>
                    </div>
                    <Button variant="destructive" onClick={() => setDeleteId(selectedOrg.id)} disabled={saving || selectedOrg.id === 1}>
                      {t("common.delete")}
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardContent className="p-4 space-y-1">
                        <div className="text-xs text-muted-foreground">{t("organizations.status")}</div>
                        <div className="text-sm font-medium">{selectedOrg.status}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 space-y-1">
                        <div className="text-xs text-muted-foreground">{t("organizations.updatedAt")}</div>
                        <div className="text-sm font-medium">{selectedOrg.updated_at}</div>
                      </CardContent>
                    </Card>
                  </div>

                  {selectedOrg.id === 1 && (
                    <div className="text-sm text-muted-foreground">{t("organizations.defaultOrgHint")}</div>
                  )}

                  <Card>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-medium">{t("organizations.membersTitle")}</div>
                        <Button variant="outline" onClick={() => fetchOrgUsers(selectedOrg.id)} disabled={orgUsersLoading || saving}>
                          {t("common.refresh")}
                        </Button>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <Input
                          value={addUserId}
                          onChange={(e) => setAddUserId(e.target.value)}
                          placeholder={t("organizations.userIdPlaceholder")}
                          className="h-10"
                        />
                        <select
                          value={addRole}
                          onChange={(e) => setAddRole(e.target.value as "admin" | "member")}
                          className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                          <option value="member">{t("organizations.roleMember")}</option>
                          <option value="admin">{t("organizations.roleAdmin")}</option>
                        </select>
                        <Button onClick={handleAddOrgUser} disabled={saving || !addUserId.trim()} className="h-10">
                          {t("organizations.addMember")}
                        </Button>
                      </div>

                      {orgUsersLoading ? (
                        <div className="text-sm text-muted-foreground">{t("common.loading")}</div>
                      ) : orgUsers.length === 0 ? (
                        <div className="text-sm text-muted-foreground">{t("organizations.membersEmpty")}</div>
                      ) : (
                        <div className="space-y-2">
                          {orgUsers.map((u) => (
                            <div key={u.id} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
                              <div className="min-w-0">
                                <div className="text-sm font-medium truncate">{u.username}</div>
                                <div className="text-xs text-muted-foreground">#{u.id} · {u.status} · {u.role_id}</div>
                              </div>
                              <Button variant="outline" size="sm" onClick={() => setRemoveUserId(u.id)} disabled={saving}>
                                {t("common.delete")}
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </DetailPanel>
          }
        />

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
