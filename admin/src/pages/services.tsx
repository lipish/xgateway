import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/layout/page-header"
import { TwoPanelLayout } from "@/components/layout/two-panel-layout"
import { DetailPanel } from "@/components/layout/detail-panel"
import { t } from "@/lib/i18n"
import { useAuth } from "@/lib/auth"
import { Plus } from "lucide-react"
import { ApiKeyCreateDialog } from "@/components/services/ApiKeyCreateDialog"
import { DeleteApiKeyConfirmDialog } from "@/components/services/DeleteApiKeyConfirmDialog"
import { DeleteServiceConfirmDialog } from "@/components/services/DeleteServiceConfirmDialog"
import { ServiceApiKeysSection } from "@/components/services/ServiceApiKeysSection"
import { ServiceBindingsSection } from "@/components/services/ServiceBindingsSection"
import { ServiceCreateDialog } from "@/components/services/ServiceCreateDialog"
import { ServiceDetailCard } from "@/components/services/ServiceDetailCard"
import { ServiceEditDialog } from "@/components/services/ServiceEditDialog"
import { ServiceListCard } from "@/components/services/ServiceListCard"
import type { ApiKey, ApiResponse, Provider, Service } from "@/components/services/types"

export function ServicesPage() {
  const { user } = useAuth()
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
  })

  const [createForm, setCreateForm] = useState({
    name: "",
    enabled: true,
    strategy: "Priority",
    fallback_chain: "",
    bound_provider_ids: [] as number[],
    qps_limit: 100,
    concurrency_limit: 50,
    max_queue_size: 100,
    max_queue_wait_ms: 30000,
  })

  const [editForm, setEditForm] = useState({
    name: "",
    enabled: true,
    strategy: "Priority",
    fallback_chain: "",
    qps_limit: 100,
    concurrency_limit: 50,
    max_queue_size: 100,
    max_queue_wait_ms: 30000,
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

  const isAdmin = user?.role_id === "admin"

  const exportServicesAndApiKeys = async () => {
    try {
      const exported = services.map((svc) => {
        const keys = apiKeys
          .filter((k) => k.scope === "instance")
          .filter((k) => {
            const ids = (k.service_ids || []).filter((v): v is string => typeof v === "string" && v.length > 0)
            return ids.includes(svc.id)
          })
          .map((k) => ({
            id: k.id,
            name: k.name,
            api_key: k.key_hash || null,
          }))

        return {
          service_id: svc.id,
          service_name: svc.name,
          api_keys: keys,
        }
      })

      const blob = new Blob([JSON.stringify(exported, null, 2)], { type: "application/json;charset=utf-8" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "services-api-keys.json"
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      setError(t("common.networkError"))
    }
  }

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
    setApiKeyCreateForm({ name: "" })
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
        provider_id: null,
        provider_ids: null,
      }

      const resp = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const raw = await resp.text().catch(() => "")
      let data: any = null
      if (raw) {
        try {
          data = JSON.parse(raw)
        } catch {
          data = null
        }
      }

      if (!resp.ok || !data?.success) {
        const fallback = `HTTP ${resp.status} ${resp.statusText}`
        const details = data && typeof data === 'object' ? JSON.stringify(data) : raw
        setApiKeyCreateError(data?.message || (details ? `${fallback}: ${details}` : fallback) || t('common.saveFailed'))
        return
      }

      setCreatedApiKey(data?.data?.full_key || null)
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
    setError(null)
    setCreateForm({
      name: "",
      enabled: true,
      strategy: "Priority",
      fallback_chain: "",
      bound_provider_ids: [],
      qps_limit: 100,
      concurrency_limit: 50,
      max_queue_size: 100,
      max_queue_wait_ms: 30000,
    })
    setShowCreateDialog(true)
  }

  const openEdit = (svc: Service) => {
    setEditingServiceId(svc.id)
    setEditForm({
      name: svc.name,
      enabled: svc.enabled,
      strategy: svc.strategy || "Priority",
      fallback_chain: svc.fallback_chain || "",
      qps_limit: svc.qps_limit ?? 100,
      concurrency_limit: svc.concurrency_limit ?? 50,
      max_queue_size: svc.max_queue_size ?? 100,
      max_queue_wait_ms: svc.max_queue_wait_ms ?? 30000,
    })
    setEditError(null)
    setShowEditDialog(true)
  }

  const handleCreate = async () => {
    try {
      setSaving(true)
      setError(null)

      if (!createForm.bound_provider_ids || createForm.bound_provider_ids.length === 0) {
        setError(t("services.bindingsRequired"))
        return
      }

      const qpsLimit = Number(createForm.qps_limit)
      const concurrencyLimit = Number(createForm.concurrency_limit)
      const maxQueueSize = Number(createForm.max_queue_size)
      const maxQueueWaitMs = Number(createForm.max_queue_wait_ms)

      if (
        !Number.isFinite(qpsLimit) ||
        !Number.isFinite(concurrencyLimit) ||
        !Number.isFinite(maxQueueSize) ||
        !Number.isFinite(maxQueueWaitMs) ||
        qpsLimit < 0 ||
        concurrencyLimit < 0 ||
        maxQueueSize < 0 ||
        maxQueueWaitMs < 0
      ) {
        setError(t("services.invalidLimits"))
        return
      }

      const payload = {
        name: createForm.name,
        enabled: createForm.enabled,
        strategy: createForm.strategy,
        fallback_chain: createForm.fallback_chain || null,
        bound_provider_ids: createForm.bound_provider_ids,
        qps_limit: qpsLimit,
        concurrency_limit: Math.floor(concurrencyLimit),
        max_queue_size: Math.floor(maxQueueSize),
        max_queue_wait_ms: Math.floor(maxQueueWaitMs),
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

      const createdId = data.data?.id
      if (!createdId) {
        setError(t("common.saveFailed"))
        return
      }

      setShowCreateDialog(false)
      await fetchServices()
      setSelectedServiceId(createdId)
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

      const qpsLimit = Number(editForm.qps_limit)
      const concurrencyLimit = Number(editForm.concurrency_limit)
      const maxQueueSize = Number(editForm.max_queue_size)
      const maxQueueWaitMs = Number(editForm.max_queue_wait_ms)

      if (
        !Number.isFinite(qpsLimit) ||
        !Number.isFinite(concurrencyLimit) ||
        !Number.isFinite(maxQueueSize) ||
        !Number.isFinite(maxQueueWaitMs) ||
        qpsLimit < 0 ||
        concurrencyLimit < 0 ||
        maxQueueSize < 0 ||
        maxQueueWaitMs < 0
      ) {
        setEditError(t("services.invalidLimits"))
        return
      }

      const payload = {
        name: editForm.name,
        enabled: editForm.enabled,
        strategy: editForm.strategy,
        fallback_chain: editForm.fallback_chain || null,
        qps_limit: qpsLimit,
        concurrency_limit: Math.floor(concurrencyLimit),
        max_queue_size: Math.floor(maxQueueSize),
        max_queue_wait_ms: Math.floor(maxQueueWaitMs),
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
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button size="sm" variant="outline" onClick={exportServicesAndApiKeys}>
                {t("logs.export")}
              </Button>
            )}
            <Button size="sm" onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              {t("services.create")}
            </Button>
          </div>
        }
      />

      <div className="max-w-[1400px] mx-auto w-full flex flex-col flex-1 min-h-0 h-full">
        <div className="flex-1 min-h-0 flex flex-col gap-4 h-full">
          <ServiceCreateDialog
            open={showCreateDialog}
            onOpenChange={setShowCreateDialog}
            services={services}
            providers={providers}
            form={createForm}
            onFormChange={(next) => setCreateForm(() => next)}
            onSave={handleCreate}
            saving={saving}
            error={error}
          />

          <ServiceEditDialog
            open={showEditDialog}
            onOpenChange={setShowEditDialog}
            services={services}
            providers={providers}
            boundProviderIdSet={boundProviderIdSet}
            bindingBusyId={bindingBusyId}
            onToggleBinding={setBinding}
            currentServiceId={editingServiceId}
            form={editForm}
            onFormChange={(next) => setEditForm(() => next)}
            onSave={handleUpdate}
            saving={saving}
            error={editError}
          />

          <TwoPanelLayout
            left={
              <ServiceListCard
                loading={loading}
                services={services}
                selectedServiceId={selectedServiceId}
                onSelectServiceId={setSelectedServiceId}
                onEdit={openEdit}
                onRequestDelete={setServiceToDelete}
              />
            }
            right={
              <DetailPanel>
                {!selectedService ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <span>{t("services.select")}</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <ServiceDetailCard
                      service={selectedService}
                      toggleBusy={toggleBusy}
                      onToggleEnabled={toggleServiceEnabled}
                    />

                    <ServiceBindingsSection
                      providers={providers}
                      boundProviderIdSet={boundProviderIdSet}
                      bindingBusyId={bindingBusyId}
                      onToggleBinding={setBinding}
                      error={error}
                    />

                    <ServiceApiKeysSection
                      selectedServiceId={selectedServiceId}
                      apiKeys={apiKeysForSelectedService}
                      loading={apiKeyLoading}
                      apiKeyError={apiKeyError}
                      rotateError={rotateError}
                      rotatedApiKey={rotatedApiKey}
                      apiKeyStatusUpdatingId={apiKeyStatusUpdatingId}
                      rotatingKeyId={rotatingKeyId}
                      onOpenCreate={openCreateApiKey}
                      onToggleStatus={toggleApiKeyStatus}
                      onRotate={rotateApiKey}
                      onRequestDelete={setApiKeyToDelete}
                      onClearRotatedApiKey={() => setRotatedApiKey(null)}
                    />
                  </div>
                )}
              </DetailPanel>
            }
          />

          <DeleteServiceConfirmDialog serviceId={serviceToDelete} onServiceIdChange={setServiceToDelete} onConfirm={handleDelete} />

          <ApiKeyCreateDialog
            open={showCreateApiKeyDialog}
            onOpenChange={(open) => {
              setShowCreateApiKeyDialog(open)
              if (!open) {
                setApiKeyCreateForm({ name: "" })
                setApiKeyCreateError(null)
                setCreatedApiKey(null)
              }
            }}
            serviceName={selectedService?.name}
            form={apiKeyCreateForm}
            onFormChange={setApiKeyCreateForm}
            onSave={handleCreateApiKeyForService}
            saving={apiKeySaving}
            error={apiKeyCreateError}
            createdApiKey={createdApiKey}
          />

          <DeleteApiKeyConfirmDialog apiKeyId={apiKeyToDelete} onApiKeyIdChange={setApiKeyToDelete} onConfirm={handleDeleteApiKey} />
        </div>
      </div>
    </div>
  )
}
