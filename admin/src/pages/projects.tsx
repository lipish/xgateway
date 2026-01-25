import { useEffect, useMemo, useState } from "react"
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api"
import { t } from "@/lib/i18n"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { ConfirmAlertDialog } from "@/components/ui/confirm-alert-dialog"
import { PageHeader } from "@/components/layout/page-header"
import { cn, formatDate } from "@/lib/utils"
import { TwoPanelLayout } from "@/components/layout/two-panel-layout"
import { DetailPanel } from "@/components/layout/detail-panel"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { MoreVertical, Pencil, Trash2 } from "lucide-react"

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

type Project = {
  id: number
  org_id: number
  name: string
  status: string
  created_at: string
  updated_at: string
}

export function ProjectsPage() {
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [filterOrgId, setFilterOrgId] = useState<number | null>(null)

  const [createOrgId, setCreateOrgId] = useState<number | null>(1)
  const [createName, setCreateName] = useState("")
  const [defaultNameEditing, setDefaultNameEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)

  const selectedProject = useMemo(() => projects.find((p) => p.id === selectedId) || null, [projects, selectedId])

  const getProjectDisplayName = (p: Project) => {
    if (p.id === 1 && p.name === "default") return t("projects.defaultName")
    return p.name
  }

  const getOrgDisplayName = (o: Organization) => {
    if (o.id === 1 && o.name === "default") return t("organizations.defaultName")
    return o.name
  }

  useEffect(() => {
    fetchAll()
  }, [])

  useEffect(() => {
    if (projects.length === 0) {
      setSelectedId(null)
      return
    }
    if (!selectedId || !projects.some((p) => p.id === selectedId)) {
      setSelectedId(projects[0].id)
    }
  }, [projects, selectedId])

  const fetchAll = async () => {
    await Promise.all([fetchOrgs(), fetchProjects(filterOrgId)])
  }

  const fetchOrgs = async () => {
    try {
      const resp = await apiGet<ApiResponse<Organization[]>>("/api/organizations")
      if (resp.success) {
        const list = resp.data || []
        setOrgs(list)
        if (list.length > 0) {
          if (filterOrgId == null) {
            setFilterOrgId(list[0].id)
          }
          if (createOrgId == null) {
            setCreateOrgId(list[0].id)
          }
        }
      }
    } catch {
    }
  }

  const fetchProjects = async (orgId: number | null) => {
    try {
      setLoading(true)
      setError(null)
      const qs = orgId ? `?org_id=${orgId}` : ""
      const resp = await apiGet<ApiResponse<Project[]>>(`/api/projects${qs}`)
      if (!resp.success) {
        setProjects([])
        setError(resp.message || t("common.networkError"))
        return
      }
      setProjects(resp.data || [])
    } catch {
      setProjects([])
      setError(t("common.networkError"))
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    const name = createName.trim()
    if (!name || !createOrgId) return
    try {
      setSaving(true)
      setError(null)
      const isEdit = Boolean(editingProject)
      const payloadName = isEdit && defaultNameEditing && editingProject?.name === "default"
        ? "default"
        : name
      const resp = isEdit
        ? await apiPut<ApiResponse<Project>>(`/api/projects/${editingProject!.id}`, { org_id: createOrgId, name: payloadName })
        : await apiPost<ApiResponse<Project>>("/api/projects", { org_id: createOrgId, name: payloadName })
      if (!resp.success) {
        setError(resp.message || t("common.saveFailed"))
        return
      }
      setCreateName("")
      setCreateDialogOpen(false)
      setEditingProject(null)
      setDefaultNameEditing(false)
      await fetchProjects(filterOrgId)
      if (resp.data?.id) {
        setSelectedId(resp.data.id)
      }
    } catch {
      setError(t("common.networkError"))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      setSaving(true)
      setError(null)
      const resp = await apiDelete<ApiResponse<unknown>>(`/api/projects/${deleteId}`)
      if (!resp.success) {
        setError(resp.message || t("common.saveFailed"))
        return
      }
      setDeleteId(null)
      await fetchProjects(filterOrgId)
    } catch {
      setError(t("common.networkError"))
    } finally {
      setSaving(false)
    }
  }

  const openEditProject = (project: Project) => {
    setEditingProject(project)
    const isDefaultName = project.name === "default"
    setDefaultNameEditing(isDefaultName)
    setCreateName(isDefaultName ? t("projects.defaultName") : project.name)
    setCreateOrgId(project.org_id)
    setCreateDialogOpen(true)
  }

  const orgOptions = orgs.map((o) => ({
    value: String(o.id),
    label:
      o.id === 1 && o.name === "default"
        ? getOrgDisplayName(o)
        : `${getOrgDisplayName(o)} (${t("common.idLabel")}: ${o.id})`,
  }))
  const createOrgValue = createOrgId ? String(createOrgId) : ""
  const filterOrgValue = filterOrgId ? String(filterOrgId) : ""

  return (
    <div className="flex-1 min-h-0 h-full flex flex-col page-transition p-6 scrollbar-hide">
      <PageHeader
        title={t("projects.title")}
        subtitle={t("projects.description")}
        action={
          <Button size="sm" onClick={() => setCreateDialogOpen(true)} className="bg-primary hover:bg-primary/90">
            {t("projects.add") || t("projects.create")}
          </Button>
        }
      />

      <div className="max-w-[1400px] mx-auto w-full flex flex-col flex-1 min-h-0 h-full">
        <TwoPanelLayout
          left={
            <Card className="w-[520px] shrink-0 h-full flex flex-col">
              <CardContent className="p-6 flex-1 h-full overflow-y-auto space-y-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium">{t("projects.filterByOrg")}</div>
                  <Select
                    value={filterOrgValue}
                    onChange={(value) => {
                      const id = Number(value)
                      setFilterOrgId(id)
                      fetchProjects(id)
                    }}
                    options={orgOptions}
                    triggerClassName="h-10"
                  />
                </div>

                {error && <div className="text-sm text-destructive font-medium">{error}</div>}

                <div className="space-y-2">
                  <div className="text-sm font-medium">{t("projects.list")}</div>
                  {loading ? (
                    <div className="text-sm text-muted-foreground">{t("common.loading")}</div>
                  ) : projects.length === 0 ? (
                    <div className="text-sm text-muted-foreground">{t("projects.empty")}</div>
                  ) : (
                    <Table>
                      <TableHeader className="sticky top-0 bg-white">
                        <TableRow>
                          <TableHead className="text-left pl-4">{t("projects.name")}</TableHead>
                          <TableHead className="text-left w-[180px]">{t("projects.orgLabel") || t("organizations.title")}</TableHead>
                          <TableHead className="text-center w-[80px]">{t("projects.label")}</TableHead>
                          <TableHead className="text-center w-[64px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {projects.map((p) => {
                          const active = p.id === selectedId
                          const orgName = orgs.find((o) => o.id === p.org_id)
                          return (
                            <TableRow
                              key={p.id}
                              className={cn(
                                "cursor-pointer transition-colors",
                                active ? "bg-violet-50 border-l-2 border-l-violet-400" : "hover:bg-muted/40"
                              )}
                              onClick={() => setSelectedId(p.id)}
                            >
                              <TableCell className="text-left pl-4">
                                <span className="font-medium text-sm">{getProjectDisplayName(p)}</span>
                              </TableCell>
                              <TableCell className="text-left text-sm text-muted-foreground">
                                {orgName ? getOrgDisplayName(orgName) : `${t("organizations.title")} ${t("common.idLabel")}: ${p.org_id}`}
                              </TableCell>
                              <TableCell className="text-center text-xs text-muted-foreground">{t(`projects.labelText.${p.status}`)}</TableCell>
                              <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                                <DropdownMenu modal={false}>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                      aria-label={t("common.actions") || "Actions"}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        openEditProject(p)
                                      }}
                                    >
                                      <Pencil className="h-4 w-4 mr-2" />
                                      {t("common.edit")}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setDeleteId(p.id)
                                      }}
                                      disabled={saving || p.id === 1}
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
                  )}
                </div>
              </CardContent>
            </Card>
          }
          right={
            <DetailPanel>
              {!selectedProject ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">{t("projects.select")}</div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="space-y-1">
                      <div className="text-xl font-semibold">{getProjectDisplayName(selectedProject)}</div>
                      {!(selectedProject.id === 1 && selectedProject.name === "default") && (
                        <div className="text-sm text-muted-foreground">{t("projects.id")}: {selectedProject.id}</div>
                      )}
                      <div className="text-sm text-muted-foreground">{t("projects.orgId")}: {selectedProject.org_id}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-md bg-muted/60 p-3">
                      <div className="text-xs text-muted-foreground">{t("projects.label")}</div>
                      <div className="mt-1 text-sm font-medium">
                        {t(`projects.labelText.${selectedProject.status}`) || selectedProject.status}
                      </div>
                    </div>
                    <div className="rounded-md bg-muted/60 p-3">
                      <div className="text-xs text-muted-foreground">{t("projects.updatedAt")}</div>
                      <div className="mt-1 text-sm font-medium">{formatDate(selectedProject.updated_at)}</div>
                    </div>
                  </div>

                  {selectedProject.id === 1 && (
                    <div className="text-sm text-muted-foreground">{t("projects.defaultProjectHint")}</div>
                  )}
                </div>
              )}
            </DetailPanel>
          }
        />


        <Dialog open={createDialogOpen} onOpenChange={(open) => {
          if (!open) {
            setCreateName("")
            setEditingProject(null)
            setDefaultNameEditing(false)
            setError(null)
          }
          setCreateDialogOpen(open)
        }}>
          <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden border">
            <div className="p-6 space-y-5">
              <DialogHeader className="space-y-1.5 mb-0">
                <DialogTitle className="text-xl font-semibold tracking-tight">
                  {editingProject ? t("projects.edit") : t("projects.add")}
                </DialogTitle>
                <DialogDescription className="text-purple-600 font-medium pb-2">
                  {editingProject ? t("projects.editDesc") : t("projects.addDesc")}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-5 py-2">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">{t("projects.orgLabel")}</Label>
                  <Select
                    value={createOrgValue}
                    onChange={(value) => setCreateOrgId(Number(value))}
                    options={orgOptions}
                    triggerClassName="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="project-name" className="text-sm font-medium">
                    {t("projects.name")} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="project-name"
                    value={createName}
                    onChange={(e) => {
                      if (defaultNameEditing) setDefaultNameEditing(false)
                      setCreateName(e.target.value)
                    }}
                    placeholder={t("projects.namePlaceholder")}
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
                  disabled={saving || !createName.trim() || !createOrgId}
                  className="h-10 px-10 bg-purple-600 hover:bg-purple-700 text-white border-0"
                >
                  {saving ? t("common.saving") || t("common.save") : editingProject ? t("common.save") : t("common.confirm")}
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
          title={t("projects.confirmDelete")}
          description={t("projects.deleteWarning")}
          cancelText={t("common.cancel")}
          confirmText={t("common.delete")}
          onConfirm={handleDelete}
        />
      </div>
    </div>
  )
}
