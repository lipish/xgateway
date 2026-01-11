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

interface ApiKey {
  id: number
  name: string
  scope: string
  service_ids?: string[] | null
  qps_limit: number
  concurrency_limit: number
  status: string
  expires_at: string | null
  created_at: string
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

  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [apiKeyLoading, setApiKeyLoading] = useState(false)
  const [apiKeyError, setApiKeyError] = useState<string | null>(null)

  const [loading, setLoading] = useState(true)
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null)

  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [serviceToDelete, setServiceToDelete] = useState<string | null>(null)
  const [bindingBusyId, setBindingBusyId] = useState<number | null>(null)
  const [toggleBusy, setToggleBusy] = useState(false)

  const [showCreateApiKeyDialog, setShowCreateApiKeyDialog] = useState(false)
  const [apiKeyCreateError, setApiKeyCreateError] = useState<string | null>(null)
  const [apiKeySaving, setApiKeySaving] = useState(false)
  const [createdApiKey, setCreatedApiKey] = useState<string | null>(null)
  const [rotatingKeyId, setRotatingKeyId] = useState<number | null>(null)
  const [rotatedApiKey, setRotatedApiKey] = useState<string | null>(null)
  const [rotateError, setRotateError] = useState<string | null>(null)
  const [apiKeyToDelete, setApiKeyToDelete] = useState<number | null>(null)
  const [apiKeyStatusUpdatingId, setApiKeyStatusUpdatingId] = useState<number | null>(null)

  const [error, setError] = useState<string | null>(null)
  const [editError, setEditError] = useState<string | null>(null)

  const [apiKeyCreateForm, setApiKeyCreateForm] = useState({
    name: "",
    qps_limit: 10,
    concurrency_limit: 5,
  })

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

  const apiKeysForSelectedService = useMemo(() => {
    if (!selectedServiceId) return [] as ApiKey[]
    return apiKeys.filter((k) => {
      if (k.scope === 'global') return true
      const ids = (k.service_ids || []).filter((v): v is string => typeof v === 'string' && v.length > 0)
      return ids.includes(selectedServiceId)
    })
  }, [apiKeys, selectedServiceId])

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

  useEffect(() => {
    if (!selectedServiceId) return
    fetchApiKeys()
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

  const fetchApiKeys = async () => {
    try {
      setApiKeyLoading(true)
      setApiKeyError(null)
      const resp = await fetch('/api/api-keys')
      if (!resp.ok) {
        setApiKeyError(`Failed to fetch API keys: ${resp.status} ${resp.statusText}`)
        setApiKeys([])
        return
      }
      const data = await resp.json()
      if (!data.success) {
        setApiKeyError(data.message || t('common.networkError'))
        setApiKeys([])
        return
      }
      setApiKeys(data.data || [])
    } catch {
      setApiKeyError(t('common.networkError'))
      setApiKeys([])
    } finally {
      setApiKeyLoading(false)
    }
  }

  const openCreateApiKey = () => {
    setApiKeyCreateForm({ name: "", qps_limit: 10, concurrency_limit: 5 })
    setApiKeyCreateError(null)
    setCreatedApiKey(null)
    setRotatedApiKey(null)
    setRotateError(null)
    setShowCreateApiKeyDialog(true)
  }

  const handleCreateApiKeyForService = async () => {
    if (!selectedServiceId) return
    try {
      setApiKeySaving(true)
      setApiKeyCreateError(null)

      const payload = {
        name: apiKeyCreateForm.name,
        scope: 'instance',
        service_ids: [selectedServiceId],
        qps_limit: apiKeyCreateForm.qps_limit,
        concurrency_limit: apiKeyCreateForm.concurrency_limit,
        provider_id: null,
        provider_ids: null,
      }

      const resp = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await resp.json()
      if (!data.success) {
        setApiKeyCreateError(data.message || t('common.saveFailed'))
        return
      }
      setCreatedApiKey(data.data?.full_key || null)
      await fetchApiKeys()
    } catch {
      setApiKeyCreateError(t('common.networkError'))
    } finally {
      setApiKeySaving(false)
    }
  }

  const toggleApiKeyStatus = async (id: number) => {
    try {
      setApiKeyStatusUpdatingId(id)
      const resp = await fetch(`/api/api-keys/${id}/toggle`, { method: 'POST' })
      const data = await resp.json()
      if (!data.success) {
        setApiKeyError(data.message || t('common.networkError'))
        return
      }
      await fetchApiKeys()
    } catch {
      setApiKeyError(t('common.networkError'))
    } finally {
      setApiKeyStatusUpdatingId((cur) => (cur === id ? null : cur))
    }
  }

  const rotateApiKey = async (id: number) => {
    try {
      setRotatingKeyId(id)
      setRotateError(null)
      setRotatedApiKey(null)
      const resp = await fetch(`/api/api-keys/${id}/rotate`, { method: 'POST' })
      const data = await resp.json()
      if (!data.success) {
        setRotateError(data.message || t('common.networkError'))
        return
      }
      setRotatedApiKey(data.data?.full_key || null)
      await fetchApiKeys()
    } catch {
      setRotateError(t('common.networkError'))
    } finally {
      setRotatingKeyId((cur) => (cur === id ? null : cur))
    }
  }

  const handleDeleteApiKey = async () => {
    if (!apiKeyToDelete) return
    try {
      const resp = await fetch(`/api/api-keys/${apiKeyToDelete}`, { method: 'DELETE' })
      const data = await resp.json()
      if (!data.success) {
        setApiKeyError(data.message || t('common.networkError'))
        return
      }
      await fetchApiKeys()
    } catch {
      setApiKeyError(t('common.networkError'))
    } finally {
      setApiKeyToDelete(null)
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

                    <div className="rounded-lg border bg-background p-5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-semibold">{t('apiKeys.title')}</div>
                        <Button size="sm" onClick={openCreateApiKey} disabled={!selectedServiceId}>
                          <Plus className="mr-2 h-4 w-4" />
                          {t('apiKeys.create')}
                        </Button>
                      </div>

                      <div className="mt-3 border rounded-md overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[220px]">{t('apiKeys.name')}</TableHead>
                              <TableHead className="w-[120px]">{t('apiKeys.scope')}</TableHead>
                              <TableHead className="w-[120px]">{t('apiKeys.status')}</TableHead>
                              <TableHead className="w-[90px]">{t('apiKeys.qps')}</TableHead>
                              <TableHead className="w-[110px]">{t('apiKeys.concurrency')}</TableHead>
                              <TableHead className="w-[220px]">{t('apiKeys.createdAt')}</TableHead>
                              <TableHead className="w-[200px]"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {apiKeyLoading ? (
                              <TableRow>
                                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                                  <div className="inline-flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>{t('common.loading')}</span>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ) : apiKeysForSelectedService.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                                  {t('apiKeys.noKeys')}
                                </TableCell>
                              </TableRow>
                            ) : (
                              apiKeysForSelectedService.map((k) => (
                                <TableRow key={k.id}>
                                  <TableCell className="font-medium">{k.name}</TableCell>
                                  <TableCell className="text-muted-foreground text-sm">
                                    {k.scope === 'global' ? t('apiKeys.global') : t('apiKeys.instance')}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={k.status === 'active' ? 'success' : 'outline'}>
                                      {k.status === 'active' ? t('apiKeys.enabled') : t('apiKeys.disabled')}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>{k.qps_limit}</TableCell>
                                  <TableCell>{k.concurrency_limit}</TableCell>
                                  <TableCell className="text-muted-foreground text-sm">
                                    {new Date(k.created_at).toLocaleString()}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center justify-end gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => toggleApiKeyStatus(k.id)}
                                        disabled={apiKeyStatusUpdatingId === k.id}
                                      >
                                        {apiKeyStatusUpdatingId === k.id ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : k.status === 'active' ? (
                                          t('apiKeys.disable')
                                        ) : (
                                          t('apiKeys.enable')
                                        )}
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => rotateApiKey(k.id)}
                                        disabled={rotatingKeyId === k.id}
                                      >
                                        {rotatingKeyId === k.id ? <Loader2 className="h-4 w-4 animate-spin" /> : t('common.refresh')}
                                      </Button>
                                      <Button variant="outline" size="sm" className="text-destructive" onClick={() => setApiKeyToDelete(k.id)}>
                                        {t('common.delete')}
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>

                      {apiKeyError && <p className="text-sm text-destructive mt-3 font-medium">{apiKeyError}</p>}
                      {rotateError && <p className="text-sm text-destructive mt-2 font-medium">{rotateError}</p>}
                      {rotatedApiKey && (
                        <div className="mt-3 rounded-md border bg-muted/30 p-3">
                          <div className="text-xs text-muted-foreground">{t('apiKeys.key')}</div>
                          <div className="mt-1 text-sm font-mono break-all">{rotatedApiKey}</div>
                        </div>
                      )}
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

          <Dialog open={showCreateApiKeyDialog} onOpenChange={setShowCreateApiKeyDialog}>
            <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden border">
              <div className="p-6 space-y-5">
                <DialogHeader className="space-y-1.5 mb-0">
                  <DialogTitle className="text-xl font-semibold tracking-tight">{t('apiKeys.create')}</DialogTitle>
                  <DialogDescription className="text-purple-600 font-medium pb-2">{selectedService?.name}</DialogDescription>
                </DialogHeader>

                <div className="grid gap-5 py-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">{t('apiKeys.name')}</Label>
                    <Input
                      value={apiKeyCreateForm.name}
                      onChange={(e) => setApiKeyCreateForm({ ...apiKeyCreateForm, name: e.target.value })}
                      placeholder={t('apiKeys.enterName')}
                      className="h-10"
                    />
                  </div>

                  <div className="grid gap-4 grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">{t('apiKeys.qps')}</Label>
                      <Input
                        type="number"
                        value={apiKeyCreateForm.qps_limit}
                        onChange={(e) => setApiKeyCreateForm({ ...apiKeyCreateForm, qps_limit: Number(e.target.value) })}
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">{t('apiKeys.concurrency')}</Label>
                      <Input
                        type="number"
                        value={apiKeyCreateForm.concurrency_limit}
                        onChange={(e) => setApiKeyCreateForm({ ...apiKeyCreateForm, concurrency_limit: Number(e.target.value) })}
                        className="h-10"
                      />
                    </div>
                  </div>

                  {apiKeyCreateError && <p className="text-sm text-destructive mt-1 font-medium">{apiKeyCreateError}</p>}
                  {createdApiKey && (
                    <div className="rounded-md border bg-muted/30 p-3">
                      <div className="text-xs text-muted-foreground">{t('apiKeys.saveKeyHint')}</div>
                      <div className="mt-2 text-sm font-mono break-all">{createdApiKey}</div>
                    </div>
                  )}
                </div>

                <DialogFooter className="gap-2 mt-2">
                  <Button variant="outline" onClick={() => setShowCreateApiKeyDialog(false)} className="h-10 px-10">
                    {t('common.cancel')}
                  </Button>
                  <Button
                    onClick={handleCreateApiKeyForService}
                    disabled={apiKeySaving}
                    className="h-10 px-10 bg-purple-600 hover:bg-purple-700 text-white border-0"
                  >
                    {apiKeySaving ? (t('common.saving') || t('common.save')) : t('common.save')}
                  </Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>

          <AlertDialog open={apiKeyToDelete != null} onOpenChange={(open) => !open && setApiKeyToDelete(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('common.delete')}</AlertDialogTitle>
                <AlertDialogDescription>{t('apiKeys.confirmDelete')}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteApiKey} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  {t('common.delete')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  )
}
