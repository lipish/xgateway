import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ConfirmAlertDialog } from "@/components/ui/confirm-alert-dialog"
import { PageHeader } from "@/components/layout/page-header"
import { TwoPanelLayout } from "@/components/layout/two-panel-layout"
import { DetailPanel } from "@/components/layout/detail-panel"
import { t } from "@/lib/i18n"
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api"
import { Plus } from "lucide-react"
import { ApiKeyCreateDialog } from "@/components/api-keys/ApiKeyCreateDialog"
import { ApiKeyEditDialog } from "@/components/api-keys/ApiKeyEditDialog"
import { ApiKeyRotateResultDialog } from "@/components/api-keys/ApiKeyRotateResultDialog"
import { ApiKeysListCard } from "@/components/api-keys/ApiKeysListCard"
import { ApiKeyDetailCard } from "@/components/api-keys/ApiKeyDetailCard"
import type { ApiKey, Provider, Service } from "@/components/api-keys/types"

type ApiResponse<T> = {
  success: boolean
  data?: T
  message: string
}

type ApiKeyFullKeyResult = {
  full_key: string
}

export function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [providers, setProviders] = useState<Provider[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedApiKeyId, setSelectedApiKeyId] = useState<number | null>(null)
  const [statusUpdatingId, setStatusUpdatingId] = useState<number | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingApiKeyId, setEditingApiKeyId] = useState<number | null>(null)
  const [dialogKey, setDialogKey] = useState(0)
  const [newKeyData, setNewKeyData] = useState({
    name: "",
    scope: "global",
    service_ids: [] as string[],
  })
  const [editKeyData, setEditKeyData] = useState({
    name: "",
    scope: "global",
    service_ids: [] as string[],
  })
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [rotatedKey, setRotatedKey] = useState<string | null>(null)
  const [rotateError, setRotateError] = useState<string | null>(null)
  const [rotatingId, setRotatingId] = useState<number | null>(null)
  const [apiKeyToDelete, setApiKeyToDelete] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editError, setEditError] = useState<string | null>(null)
  const [editSaving, setEditSaving] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)
  const [migratingKeyId, setMigratingKeyId] = useState<number | null>(null)
  const [bindingUpdatingId, setBindingUpdatingId] = useState<number | null>(null)

  useEffect(() => {
    fetchApiKeys()
    fetchProviders()
    fetchServices()
  }, [])

  const rotateApiKey = async (id: number) => {
    try {
      setRotatingId(id)
      setRotateError(null)
      setRotatedKey(null)

      const data = await apiPost<ApiResponse<ApiKeyFullKeyResult>>(`/api/api-keys/${id}/rotate`)
      if (data.success) {
        setRotatedKey(data.data?.full_key || null)
      } else {
        setRotateError(data.message || t('common.networkError'))
      }
    } catch {
      setRotateError(t('common.networkError'))
    } finally {
      setRotatingId((current) => (current === id ? null : current))
    }
  }

  const getLegacyProviderIds = (key: ApiKey): number[] => {
    return [key.provider_id, ...(key.provider_ids || [])].filter(
      (v): v is number => typeof v === 'number'
    )
  }

  const getLegacyServiceIds = (key: ApiKey): string[] => {
    const providerIds = getLegacyProviderIds(key)
    if (providerIds.length === 0) return []
    return providerIds
      .map((id) => providers.find((p) => p.id === id)?.name)
      .filter((v): v is string => !!v)
  }

  const hasLegacyBindingButNoServiceIds = (key: ApiKey): boolean => {
    const hasServiceIds = (key.service_ids || []).length > 0
    if (hasServiceIds) return false
    return getLegacyProviderIds(key).length > 0
  }

  const fetchServices = async () => {
    try {
      const data = await apiGet<ApiResponse<Service[]>>('/api/services')
      if (data.success) {
        setServices(data.data || [])
      } else {
        setError(data.message || t('common.networkError'))
        setServices([])
      }
    } catch {
      setError(t('common.networkError'))
      setServices([])
    }
  }

  useEffect(() => {
    if (apiKeys.length === 0) {
      setSelectedApiKeyId(null)
      return
    }
    if (selectedApiKeyId == null || !apiKeys.some((k) => k.id === selectedApiKeyId)) {
      setSelectedApiKeyId(apiKeys[0].id)
    }
  }, [apiKeys, selectedApiKeyId])

  const selectedApiKey = apiKeys.find((k) => k.id === selectedApiKeyId) || null

  const getScopeLabel = (scope: string): string => {
    if (scope === 'global') return t('apiKeys.global')
    if (scope === 'instance') return t('apiKeys.instance')
    return scope
  }

  const getBoundServices = (key: ApiKey): Service[] => {
    const ids = (key.service_ids || []).filter((v): v is string => typeof v === 'string' && v.length > 0)
    if (ids.length > 0) {
      return ids
        .map((id) => services.find((s) => s.id === id))
        .filter((s): s is Service => !!s)
    }

    const legacyProviderIds = [key.provider_id, ...(key.provider_ids || [])].filter(
      (v): v is number => typeof v === 'number'
    )
    if (legacyProviderIds.length === 0) return []

    const legacyServiceIds = legacyProviderIds
      .map((id) => providers.find((p) => p.id === id)?.name)
      .filter((v): v is string => !!v)

    if (legacyServiceIds.length === 0) return []
    return legacyServiceIds
      .map((id) => services.find((s) => s.id === id))
      .filter((s): s is Service => !!s)
  }

  const fetchApiKeys = async () => {
    try {
      setLoading(true)
      const data = await apiGet<ApiResponse<ApiKey[]>>('/api/api-keys')
      if (data.success) {
        console.log('API Keys Response:', data.data)
        setApiKeys(data.data || [])
      } else {
        setError(data.message || t('apiKeys.fetchFailed'))
        setApiKeys([])
      }
    } catch {
      setError(t('common.networkError'))
      setApiKeys([])
    } finally {
      setLoading(false)
    }
  }

  const openEditDialog = (key: ApiKey) => {
    const serviceIds = key.scope === 'instance'
      ? ((key.service_ids && key.service_ids.length > 0) ? key.service_ids : getLegacyServiceIds(key))
      : []

    setEditingApiKeyId(key.id)
    setEditKeyData({
      name: key.name,
      scope: key.scope || 'global',
      service_ids: serviceIds,
    })
    setEditError(null)
    setShowEditDialog(true)
  }

  const handleUpdate = async () => {
    if (!editingApiKeyId) return
    try {
      setEditSaving(true)
      setEditError(null)

      if (editKeyData.scope === 'instance' && editKeyData.service_ids.length === 0) {
        setEditError(t('apiKeys.selectServiceRequired') || t('apiKeys.selectInstance') || t('common.saveFailed'))
        return
      }

      const payload = {
        name: editKeyData.name,
        scope: editKeyData.scope,
        provider_id: null,
        provider_ids: null,
        service_ids: editKeyData.scope === 'global' ? null : editKeyData.service_ids,
      }

      const data = await apiPut<ApiResponse<unknown>>(`/api/api-keys/${editingApiKeyId}`, payload)
      if (data.success) {
        fetchApiKeys()
        setShowEditDialog(false)
      } else {
        setEditError(data.message || t('common.saveFailed'))
      }
    } catch {
      setEditError(t('common.networkError'))
    } finally {
      setEditSaving(false)
    }
  }

  const handleToggleServiceBinding = async (key: ApiKey, serviceId: string, nextBound: boolean) => {
    if (key.scope !== 'instance') return
    if (bindingUpdatingId === key.id) return

    const existingIds = (key.service_ids && key.service_ids.length > 0) ? key.service_ids : getLegacyServiceIds(key)
    const nextServiceIds = nextBound
      ? Array.from(new Set([...existingIds, serviceId]))
      : existingIds.filter((id) => id !== serviceId)

    if (nextServiceIds.length === 0) {
      setError(t('apiKeys.selectServiceRequired') || t('apiKeys.selectInstance') || t('common.saveFailed'))
      return
    }

    try {
      setBindingUpdatingId(key.id)
      setError(null)

      const payload = {
        name: key.name,
        scope: 'instance',
        provider_id: null,
        provider_ids: null,
        service_ids: nextServiceIds,
      }

      const data = await apiPut<ApiResponse<unknown>>(`/api/api-keys/${key.id}`, payload)
      if (data.success) {
        await fetchApiKeys()
      } else {
        setError(data.message || t('common.saveFailed'))
      }
    } catch {
      setError(t('common.networkError'))
    } finally {
      setBindingUpdatingId(null)
    }
  }

  const fetchProviders = async () => {
    try {
      const data = await apiGet<ApiResponse<Provider[]>>('/api/instances')
      if (data.success) {
        setProviders(data.data || [])
      } else {
        setError(data.message || t('common.networkError'))
        setProviders([])
      }
    } catch {
      setError(t('common.networkError'))
      setProviders([])
    }
  }

  const handleCreate = async () => {
    if (!newKeyData.name) return
    try {
      setError(null)

      if (newKeyData.scope === 'instance' && newKeyData.service_ids.length === 0) {
        setError(t('apiKeys.selectServiceRequired') || t('apiKeys.selectInstance') || t('common.saveFailed'))
        return
      }

      const payload = {
        ...newKeyData,
        provider_id: null,
        provider_ids: null,
        service_ids: newKeyData.scope === 'global' ? null : newKeyData.service_ids,
      }
      const data = await apiPost<ApiResponse<ApiKeyFullKeyResult>>('/api/api-keys', payload)
      if (data.success) {
        setCreatedKey(data.data?.full_key || null)
        fetchApiKeys()
      } else {
        setError(data.message || t('apiKeys.createFailed'))
      }
    } catch {
      setError(t('common.networkError'))
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopySuccess(true)
    setTimeout(() => setCopySuccess(false), 2000)
  }

  const toggleApiKeyStatus = async (id: number) => {
    try {
      setStatusUpdatingId(id)

      const data = await apiPost<ApiResponse<unknown>>(`/api/api-keys/${id}/toggle`)
      if (data.success) {
        fetchApiKeys()
      } else {
        setError(data.message || t('common.networkError'))
      }
    } catch (err) {
      console.error('Failed to toggle API key status:', err)
    } finally {
      setStatusUpdatingId((current) => (current === id ? null : current))
    }
  }

  const handleDelete = async () => {
    if (!apiKeyToDelete) return
    try {
      const data = await apiDelete<ApiResponse<unknown>>(`/api/api-keys/${apiKeyToDelete}`)
      if (data.success) {
        fetchApiKeys()
      }
    } catch (err) {
      console.error('Failed to delete API key:', err)
    } finally {
      setApiKeyToDelete(null)
    }
  }

  const migrateLegacyBinding = async (key: ApiKey) => {
    if (key.scope !== 'instance') return

    const legacyServiceIds = getLegacyServiceIds(key)
    if (legacyServiceIds.length === 0) {
      setError(t('apiKeys.migrateNoLegacy') || t('common.saveFailed'))
      return
    }

    try {
      setMigratingKeyId(key.id)
      setError(null)

      const payload = {
        name: key.name,
        scope: 'instance',
        provider_id: null,
        provider_ids: null,
        service_ids: legacyServiceIds,
      }

      const data = await apiPut<ApiResponse<unknown>>(`/api/api-keys/${key.id}`, payload)
      if (data.success) {
        await fetchApiKeys()
      } else {
        setError(data.message || t('common.networkError'))
      }
    } catch {
      setError(t('common.networkError'))
    } finally {
      setMigratingKeyId(null)
    }
  }

  return (
    <div className="flex-1 min-h-0 h-full flex flex-col page-transition p-6 scrollbar-hide">
      <PageHeader
        title={t("apiKeys.title")}
        subtitle={t("apiKeys.description")}
        action={
          <Button
            size="sm"
            onClick={() => {
              setCreatedKey(null)
              setNewKeyData({ name: "", scope: "global", service_ids: [] })
              setError(null)
              setDialogKey((prev) => prev + 1)
              setShowCreateDialog(true)
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t("apiKeys.create")}
          </Button>
        }
      />

      <div className="max-w-[1400px] mx-auto w-full flex flex-col flex-1 min-h-0 h-full">
        <div className="flex-1 min-h-0 flex flex-col gap-4 h-full">
          <ApiKeyCreateDialog
            key={dialogKey}
            open={showCreateDialog}
            onOpenChange={(open) => {
              setShowCreateDialog(open)
              if (!open) {
                setCreatedKey(null)
                setRotatedKey(null)
                setRotateError(null)
                setNewKeyData({ name: "", scope: "global", service_ids: [] })
                setError(null)
              }
            }}
            createdKey={createdKey}
            copySuccess={copySuccess}
            onCopy={copyToClipboard}
            form={newKeyData}
            onFormChange={setNewKeyData}
            services={services}
            error={error}
            onSave={handleCreate}
            onConfirmAfterCreated={() => {
              setCreatedKey(null)
              setNewKeyData({ name: "", scope: "global", service_ids: [] })
              setError(null)
              setShowCreateDialog(false)
            }}
          />

          <ApiKeyRotateResultDialog
            open={!!rotatedKey || !!rotateError}
            onOpenChange={(open) => {
              if (!open) {
                setRotatedKey(null)
                setRotateError(null)
              }
            }}
            rotatedKey={rotatedKey}
            rotateError={rotateError}
            copySuccess={copySuccess}
            onCopy={copyToClipboard}
          />

          <ApiKeyEditDialog
            open={showEditDialog}
            onOpenChange={(open) => {
              setShowEditDialog(open)
              if (!open) {
                setEditingApiKeyId(null)
                setEditError(null)
              }
            }}
            form={editKeyData}
            onFormChange={setEditKeyData}
            services={services}
            error={editError}
            onSave={handleUpdate}
            saving={editSaving}
          />

          <TwoPanelLayout
            left={
              <ApiKeysListCard
                loading={loading}
                apiKeys={apiKeys}
                selectedApiKeyId={selectedApiKeyId}
                onSelectApiKeyId={setSelectedApiKeyId}
                getScopeLabel={getScopeLabel}
                getBoundServices={getBoundServices}
                onEdit={openEditDialog}
                onRotate={rotateApiKey}
                rotatingId={rotatingId}
                onRequestDelete={setApiKeyToDelete}
              />
            }
            right={
              <DetailPanel>
                {!selectedApiKey ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <span>{t("apiKeys.list")}</span>
                  </div>
                ) : (
                  <ApiKeyDetailCard
                    apiKey={selectedApiKey}
                    statusUpdatingId={statusUpdatingId}
                    onToggleStatus={toggleApiKeyStatus}
                    serviceBindingUpdating={bindingUpdatingId === selectedApiKey.id}
                    services={services}
                    onToggleServiceBinding={handleToggleServiceBinding}
                    getScopeLabel={getScopeLabel}
                    hasLegacyBindingButNoServiceIds={hasLegacyBindingButNoServiceIds}
                    migratingKeyId={migratingKeyId}
                    onMigrateLegacyBinding={migrateLegacyBinding}
                    getBoundServices={getBoundServices}
                  />
                )}
              </DetailPanel>
            }
          />

          <ConfirmAlertDialog
            open={apiKeyToDelete != null}
            onOpenChange={(open) => !open && setApiKeyToDelete(null)}
            title={t("apiKeys.confirmDelete")}
            description={t("apiKeys.deleteWarning") || "This action cannot be undone. This will permanently revoke the API key."}
            cancelText={t("common.cancel")}
            confirmText={t("common.delete")}
            onConfirm={handleDelete}
            confirmClassName="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          />
        </div>
      </div>
    </div>
  )
}
