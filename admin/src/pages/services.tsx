import { useEffect, useMemo, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { PageHeader } from "@/components/layout/page-header"
import { cn } from "@/lib/utils"
import { t } from "@/lib/i18n"
import { Loader2, Plus, Trash2, Pencil } from "lucide-react"

interface Service {
  id: string
  name: string
  enabled: boolean
  strategy: string
  fallback_chain?: string | null
  created_at: string
  updated_at: string
}

interface Provider {
  id: number
  name: string
  provider_type: string
  enabled: boolean
  priority?: number
}

interface ApiResponse<T> {
  success: boolean
  data?: T
  message: string
}

const STRATEGY_OPTIONS = [
  { value: "Priority", label: "Priority" },
  { value: "RoundRobin", label: "RoundRobin" },
  { value: "LeastConnections", label: "LeastConnections" },
  { value: "LatencyBased", label: "LatencyBased" },
  { value: "LowestPrice", label: "LowestPrice" },
  { value: "QuotaAware", label: "QuotaAware" },
  { value: "Random", label: "Random" },
]

export function ServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [providers, setProviders] = useState<Provider[]>([])
  const [boundProviders, setBoundProviders] = useState<Provider[]>([])

  const [loading, setLoading] = useState(true)
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null)

  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [serviceToDelete, setServiceToDelete] = useState<string | null>(null)
  const [bindingBusyId, setBindingBusyId] = useState<number | null>(null)
  const [toggleBusy, setToggleBusy] = useState(false)

  const [error, setError] = useState<string | null>(null)
  const [editError, setEditError] = useState<string | null>(null)

  const [createForm, setCreateForm] = useState({
    id: "",
    name: "",
    enabled: true,
    strategy: "Priority",
    fallback_chain: "",
  })

  const [editForm, setEditForm] = useState({
    name: "",
    enabled: true,
    strategy: "Priority",
    fallback_chain: "",
  })

  const selectedService = useMemo(
    () => services.find((s) => s.id === selectedServiceId) || null,
    [services, selectedServiceId]
  )

  const boundProviderIdSet = useMemo(() => {
    return new Set(boundProviders.map((p) => p.id))
  }, [boundProviders])

  useEffect(() => {
    fetchAll()
  }, [])

  useEffect(() => {
    if (services.length === 0) {
      setSelectedServiceId(null)
      setBoundProviders([])
      return
    }
    if (!selectedServiceId || !services.some((s) => s.id === selectedServiceId)) {
      setSelectedServiceId(services[0].id)
    }
  }, [services, selectedServiceId])

  useEffect(() => {
    if (!selectedServiceId) return
    fetchServiceModelServices(selectedServiceId)
  }, [selectedServiceId])

  const fetchAll = async () => {
    try {
      setLoading(true)
      setError(null)
      await Promise.all([fetchServices(), fetchProviders()])
    } finally {
      setLoading(false)
    }
  }

  const fetchServices = async () => {
    try {
      const resp = await fetch("/api/services")
      const data = (await resp.json()) as ApiResponse<Service[]>
      if (!data.success) {
        setServices([])
        setError(data.message || t("common.networkError"))
        return
      }
      setServices(data.data || [])
    } catch {
      setServices([])
      setError(t("common.networkError"))
    }
  }

  const fetchProviders = async () => {
    try {
      const resp = await fetch("/api/instances")
      const data = await resp.json()
      if (!data.success) {
        setProviders([])
        setError(data.message || t("common.networkError"))
        return
      }
      setProviders(data.data || [])
    } catch {
      setProviders([])
      setError(t("common.networkError"))
    }
  }

  const fetchServiceModelServices = async (serviceId: string) => {
    try {
      const resp = await fetch(`/api/services/${serviceId}/model-services`)
      const data = (await resp.json()) as ApiResponse<Provider[]>
      if (!data.success) {
        setBoundProviders([])
        return
      }
      setBoundProviders(data.data || [])
    } catch {
      setBoundProviders([])
    }
  }

  const openCreate = () => {
    setCreateForm({
      id: "",
      name: "",
      enabled: true,
      strategy: "Priority",
      fallback_chain: "",
    })
    setError(null)
    setShowCreateDialog(true)
  }

  const openEdit = (svc: Service) => {
    setEditingServiceId(svc.id)
    setEditForm({
      name: svc.name,
      enabled: svc.enabled,
      strategy: svc.strategy || "Priority",
      fallback_chain: svc.fallback_chain || "",
    })
    setEditError(null)
    setShowEditDialog(true)
  }

  const handleCreate = async () => {
    try {
      setSaving(true)
      setError(null)

      const payload = {
        id: createForm.id,
        name: createForm.name,
        enabled: createForm.enabled,
        strategy: createForm.strategy,
        fallback_chain: createForm.fallback_chain || null,
      }

      const resp = await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = (await resp.json()) as ApiResponse<Service>
      if (!data.success) {
        setError(data.message || t("common.saveFailed"))
        return
      }

      setShowCreateDialog(false)
      await fetchServices()
      setSelectedServiceId(payload.id)
    } catch {
      setError(t("common.networkError"))
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async () => {
    if (!editingServiceId) return
    try {
      setSaving(true)
      setEditError(null)

      const payload = {
        name: editForm.name,
        enabled: editForm.enabled,
        strategy: editForm.strategy,
        fallback_chain: editForm.fallback_chain || null,
      }

      const resp = await fetch(`/api/services/${editingServiceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = (await resp.json()) as ApiResponse<Service>
      if (!data.success) {
        setEditError(data.message || t("common.saveFailed"))
        return
      }

      setShowEditDialog(false)
      setEditingServiceId(null)
      await fetchServices()
    } catch {
      setEditError(t("common.networkError"))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!serviceToDelete) return
    try {
      const resp = await fetch(`/api/services/${serviceToDelete}`, { method: "DELETE" })
      const data = (await resp.json()) as ApiResponse<unknown>
      if (data.success) {
        if (selectedServiceId === serviceToDelete) {
          setSelectedServiceId(null)
          setBoundProviders([])
        }
        await fetchServices()
      } else {
        setError(data.message || t("common.networkError"))
      }
    } catch {
      setError(t("common.networkError"))
    } finally {
      setServiceToDelete(null)
    }
  }

  const toggleServiceEnabled = async () => {
    if (!selectedService) return
    try {
      setToggleBusy(true)
      const resp = await fetch(`/api/services/${selectedService.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !selectedService.enabled }),
      })
      const data = (await resp.json()) as ApiResponse<Service>
      if (!data.success) {
        setError(data.message || t("common.networkError"))
        return
      }
      await fetchServices()
    } catch {
      setError(t("common.networkError"))
    } finally {
      setToggleBusy(false)
    }
  }

  const setBinding = async (providerId: number, nextBound: boolean) => {
    if (!selectedService) return
    try {
      setBindingBusyId(providerId)
      if (nextBound) {
        const resp = await fetch(`/api/services/${selectedService.id}/model-services`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider_id: providerId }),
        })
        const data = await resp.json()
        if (!data.success) {
          setError(data.message || t("common.networkError"))
          return
        }
      } else {
        const resp = await fetch(`/api/services/${selectedService.id}/model-services/${providerId}`, {
          method: "DELETE",
        })
        const data = await resp.json()
        if (!data.success) {
          setError(data.message || t("common.networkError"))
          return
        }
      }

      await fetchServiceModelServices(selectedService.id)
    } catch {
      setError(t("common.networkError"))
    } finally {
      setBindingBusyId(null)
    }
  }

  return (
    <div className="flex-1 min-h-0 h-full flex flex-col page-transition p-6 scrollbar-hide">
      <PageHeader
        title={t("services.title")}
        subtitle={t("services.description")}
        action={
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            {t("services.create")}
          </Button>
        }
      />

      <div className="max-w-[1400px] mx-auto w-full flex flex-col flex-1 min-h-0 h-full">
        <div className="flex-1 min-h-0 flex flex-col gap-4 h-full">
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden border">
              <div className="p-6 space-y-5">
                <DialogHeader className="space-y-1.5 mb-0">
                  <DialogTitle className="text-xl font-semibold tracking-tight">{t("services.create")}</DialogTitle>
                  <DialogDescription className="text-purple-600 font-medium pb-2">{t("services.createDesc")}</DialogDescription>
                </DialogHeader>

                <div className="grid gap-5 py-2">
                  <div className="grid gap-4 grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">{t("services.id")}</Label>
                      <Input
                        value={createForm.id}
                        onChange={(e) => setCreateForm({ ...createForm, id: e.target.value })}
                        placeholder="e.g. deepseek"
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">{t("services.name")}</Label>
                      <Input
                        value={createForm.name}
                        onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                        placeholder="e.g. DeepSeek"
                        className="h-10"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">{t("services.strategy")}</Label>
                      <Select
                        value={createForm.strategy}
                        onChange={(value) => setCreateForm({ ...createForm, strategy: value })}
                        options={STRATEGY_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                        triggerClassName="h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">{t("services.enabled")}</Label>
                      <div className="h-10 flex items-center">
                        <Switch checked={createForm.enabled} onCheckedChange={(v) => setCreateForm({ ...createForm, enabled: v })} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">{t("services.fallbackChain")}</Label>
                    <Input
                      value={createForm.fallback_chain}
                      onChange={(e) => setCreateForm({ ...createForm, fallback_chain: e.target.value })}
                      placeholder={t("services.fallbackChainPlaceholder")}
                      className="h-10"
                    />
                  </div>

                  {error && <p className="text-sm text-destructive mt-1 font-medium">{error}</p>}
                </div>

                <DialogFooter className="gap-2 mt-2">
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="h-10 px-10">
                    {t("common.cancel")}
                  </Button>
                  <Button
                    onClick={handleCreate}
                    disabled={saving}
                    className="h-10 px-10 bg-purple-600 hover:bg-purple-700 text-white border-0"
                  >
                    {saving ? (t("common.saving") || t("common.save")) : t("common.save")}
                  </Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
            <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden border">
              <div className="p-6 space-y-5">
                <DialogHeader className="space-y-1.5 mb-0">
                  <DialogTitle className="text-xl font-semibold tracking-tight">{t("common.edit")}</DialogTitle>
                  <DialogDescription className="text-purple-600 font-medium pb-2">{t("services.editDesc")}</DialogDescription>
                </DialogHeader>

                <div className="grid gap-5 py-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">{t("services.name")}</Label>
                    <Input
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="h-10"
                    />
                  </div>

                  <div className="grid gap-4 grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">{t("services.strategy")}</Label>
                      <Select
                        value={editForm.strategy}
                        onChange={(value) => setEditForm({ ...editForm, strategy: value })}
                        options={STRATEGY_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                        triggerClassName="h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">{t("services.enabled")}</Label>
                      <div className="h-10 flex items-center">
                        <Switch checked={editForm.enabled} onCheckedChange={(v) => setEditForm({ ...editForm, enabled: v })} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">{t("services.fallbackChain")}</Label>
                    <Input
                      value={editForm.fallback_chain}
                      onChange={(e) => setEditForm({ ...editForm, fallback_chain: e.target.value })}
                      placeholder={t("services.fallbackChainPlaceholder")}
                      className="h-10"
                    />
                  </div>

                  {editError && <p className="text-sm text-destructive mt-1 font-medium">{editError}</p>}
                </div>

                <DialogFooter className="gap-2 mt-2">
                  <Button variant="outline" onClick={() => setShowEditDialog(false)} className="h-10 px-10">
                    {t("common.cancel")}
                  </Button>
                  <Button
                    onClick={handleUpdate}
                    disabled={saving}
                    className="h-10 px-10 bg-purple-600 hover:bg-purple-700 text-white border-0"
                  >
                    {saving ? (t("common.saving") || t("common.save")) : t("common.save")}
                  </Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>

          <div className="flex flex-row gap-6 flex-1 min-h-0">
            <Card className="w-[520px] shrink-0 h-full flex flex-col">
              <CardContent className="flex-1 h-full overflow-y-auto p-6">
                {loading ? (
                  <div className="flex flex-col gap-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-10 w-full bg-muted animate-pulse rounded" />
                    ))}
                  </div>
                ) : services.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-muted-foreground">
                      <p className="text-lg font-medium mb-2">{t("services.empty")}</p>
                    </div>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("services.name")}</TableHead>
                        <TableHead>{t("services.id")}</TableHead>
                        <TableHead>{t("services.status")}</TableHead>
                        <TableHead className="w-[80px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {services.map((svc) => (
                        <TableRow
                          key={svc.id}
                          className={cn("cursor-pointer", selectedServiceId === svc.id && "bg-muted/60")}
                          onClick={() => setSelectedServiceId(svc.id)}
                        >
                          <TableCell className="font-medium">{svc.name}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{svc.id}</TableCell>
                          <TableCell>
                            <Badge variant={svc.enabled ? "success" : "outline"}>
                              {svc.enabled ? t("services.enabled") : t("services.disabled")}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openEdit(svc)
                                }}
                                aria-label={t("common.edit")}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setServiceToDelete(svc.id)
                                }}
                                aria-label={t("common.delete")}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card className="flex-1 h-full flex flex-col min-w-0">
              <CardContent className="flex-1 h-full overflow-y-auto p-6">
                {!selectedService ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <span>{t("services.select")}</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-lg border bg-background">
                      <div className="p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="text-xl font-semibold truncate">{selectedService.name}</div>
                              <Badge variant={selectedService.enabled ? "success" : "outline"} className="shrink-0">
                                {selectedService.enabled ? t("services.enabled") : t("services.disabled")}
                              </Badge>
                              <Badge variant="secondary" className="shrink-0">
                                {selectedService.strategy || "Priority"}
                              </Badge>
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">{selectedService.id}</div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <Switch
                              checked={selectedService.enabled}
                              disabled={toggleBusy}
                              onCheckedChange={toggleServiceEnabled}
                              className={toggleBusy ? "opacity-80" : undefined}
                            />
                            {toggleBusy && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                          </div>
                        </div>
                      </div>

                      <div className="border-t" />

                      <div className="p-5">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="rounded-md bg-muted/30 p-4">
                            <div className="text-xs text-muted-foreground">{t("services.strategy")}</div>
                            <div className="mt-1 text-sm font-medium">{selectedService.strategy || "Priority"}</div>
                          </div>
                          <div className="rounded-md bg-muted/30 p-4">
                            <div className="text-xs text-muted-foreground">{t("services.updatedAt")}</div>
                            <div className="mt-1 text-sm font-medium">{new Date(selectedService.updated_at).toLocaleString()}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border bg-background p-5">
                      <div className="text-sm font-semibold">{t("services.bindings")}</div>
                      <div className="mt-3 border rounded-md p-2 max-h-64 overflow-y-auto space-y-1 bg-background">
                        {providers.length === 0 ? (
                          <div className="text-sm text-muted-foreground">-</div>
                        ) : (
                          providers.map((p) => {
                            const checked = boundProviderIdSet.has(p.id)
                            const busy = bindingBusyId === p.id
                            return (
                              <label
                                key={p.id}
                                className={cn(
                                  "flex items-center gap-2 p-2 hover:bg-accent rounded-md cursor-pointer transition-colors",
                                  busy && "opacity-70 cursor-not-allowed"
                                )}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  disabled={busy}
                                  onChange={(e) => setBinding(p.id, e.target.checked)}
                                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <span className="text-sm font-medium">{p.name}</span>
                                <span className="text-xs text-muted-foreground">{p.provider_type}</span>
                                {!p.enabled && <Badge variant="outline">{t("providers.disabled")}</Badge>}
                                {busy && <Loader2 className="ml-auto h-4 w-4 animate-spin text-muted-foreground" />}
                              </label>
                            )
                          })
                        )}
                      </div>

                      {error && <p className="text-sm text-destructive mt-3 font-medium">{error}</p>}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <AlertDialog open={!!serviceToDelete} onOpenChange={(open) => !open && setServiceToDelete(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("services.confirmDelete")}</AlertDialogTitle>
                <AlertDialogDescription>{t("services.deleteWarning")}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  {t("common.delete")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  )
}
