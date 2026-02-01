import { useCallback, useEffect, useMemo, useState } from "react"
import { PageHeader } from "@/components/layout/page-header"
import { TwoPanelLayout } from "@/components/layout/two-panel-layout"
import { DetailPanel } from "@/components/layout/detail-panel"
import { Button } from "@/components/ui/button"
import { t } from "@/lib/i18n"
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api"
import { cn } from "@/lib/utils"
import { ApiKeyCreateDialog } from "@/components/services/ApiKeyCreateDialog"
import { DeleteApiKeyConfirmDialog } from "@/components/services/DeleteApiKeyConfirmDialog"
import { ServiceApiKeysSection } from "@/components/services/ServiceApiKeysSection"
import { ServiceBindingsSection } from "@/components/services/ServiceBindingsSection"
import { Select } from "@/components/ui/select"
import { STRATEGY_OPTIONS, type ApiKey, type ApiResponse, type Provider } from "@/components/services/types"

export function ServicesPage() {
  const [providers, setProviders] = useState<Provider[]>([])
  const [selectedApiKeyId, setSelectedApiKeyId] = useState<number | null>(null)
  const [inlineSaving, setInlineSaving] = useState(false)

  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [apiKeyLoading, setApiKeyLoading] = useState(false)
  const [apiKeyError, setApiKeyError] = useState<string | null>(null)

  const [loading, setLoading] = useState(true)

  const [bindingBusyId, setBindingBusyId] = useState<number | null>(null)
  const [fallbackBusy, setFallbackBusy] = useState(false)

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
  const [apiKeyCreateForm, setApiKeyCreateForm] = useState({
    name: "",
    provider_ids: [] as number[],
    strategy: "Priority",
    fallback_chain: "",
    qps_limit: 100,
    concurrency_limit: 50,
  })

  const selectedApiKey = useMemo(
    () => apiKeys.find((key) => key.id === selectedApiKeyId) || null,
    [apiKeys, selectedApiKeyId]
  )

  const boundProviderIdSet = useMemo(() => {
    const ids = (selectedApiKey?.provider_ids || []).filter((value): value is number => typeof value === "number")
    return new Set(ids)
  }, [selectedApiKey])

  const selectedStrategy = useMemo(() => {
    if (!selectedApiKey) return null
    const option = STRATEGY_OPTIONS.find((strategy) => strategy.value === selectedApiKey.strategy)
    return option ? t(option.labelKey) : selectedApiKey.strategy
  }, [selectedApiKey])

  const fetchProviders = useCallback(async () => {
    try {
      const data = await apiGet<ApiResponse<Provider[]>>("/api/instances")
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
  }, [])

  const fetchApiKeys = useCallback(async () => {
    try {
      setApiKeyLoading(true)
      setApiKeyError(null)
      const data = await apiGet<ApiResponse<ApiKey[]>>("/api/api-keys")
      if (!data.success) {
        setApiKeyError(data.message || t("common.networkError"))
        setApiKeys([])
        return
      }
      setApiKeys(data.data || [])
    } catch {
      setApiKeyError(t("common.networkError"))
      setApiKeys([])
    } finally {
      setApiKeyLoading(false)
    }
  }, [])

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true)
        setError(null)
        await Promise.all([fetchProviders(), fetchApiKeys()])
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [fetchProviders, fetchApiKeys])

  useEffect(() => {
    if (!selectedApiKeyId && apiKeys.length > 0) {
      setSelectedApiKeyId(apiKeys[0].id)
    }
    if (apiKeys.length === 0) {
      setSelectedApiKeyId(null)
    }
  }, [apiKeys, selectedApiKeyId])

  const openCreateApiKey = () => {
    setApiKeyCreateForm({
      name: "",
      provider_ids: [],
      strategy: "Priority",
      fallback_chain: "",
      qps_limit: 100,
      concurrency_limit: 50,
    })
    setApiKeyCreateError(null)
    setCreatedApiKey(null)
    setRotatedApiKey(null)
    setRotateError(null)
    setShowCreateApiKeyDialog(true)
  }

  const handleCreateApiKey = async () => {
    try {
      setApiKeySaving(true)
      setApiKeyCreateError(null)

      const payload = {
        name: apiKeyCreateForm.name,
        scope: "instance",
        provider_ids: apiKeyCreateForm.provider_ids,
        strategy: apiKeyCreateForm.strategy,
        fallback_chain: apiKeyCreateForm.fallback_chain.trim() ? apiKeyCreateForm.fallback_chain.trim() : null,
        qps_limit: Number(apiKeyCreateForm.qps_limit) || 0,
        concurrency_limit: Math.floor(Number(apiKeyCreateForm.concurrency_limit) || 0),
      }

      const data = await apiPost<ApiResponse<{ full_key?: string }>>("/api/api-keys", payload)
      if (!data.success) {
        setApiKeyCreateError(data.message || t('common.networkError'))
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
      const data = await apiPost<ApiResponse<unknown>>(`/api/api-keys/${id}/toggle`)
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
  const data = await apiPost<ApiResponse<{ full_key?: string }>>(`/api/api-keys/${id}/rotate`)
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
      const data = await apiDelete<ApiResponse<unknown>>(`/api/api-keys/${apiKeyToDelete}`)
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

  const setBinding = async (providerId: number, nextBound: boolean) => {
    if (!selectedApiKey) return
    try {
      setBindingBusyId(providerId)
      const currentIds = (selectedApiKey.provider_ids || []).filter((value): value is number => typeof value === "number")
      const idSet = new Set(currentIds)
      if (nextBound) {
        idSet.add(providerId)
      } else {
        idSet.delete(providerId)
      }
      const nextIds = Array.from(idSet)
      const payload = {
        name: selectedApiKey.name,
        scope: selectedApiKey.scope,
        provider_ids: nextIds,
        strategy: selectedApiKey.strategy ?? "Priority",
        fallback_chain: selectedApiKey.fallback_chain ?? null,
        qps_limit: selectedApiKey.qps_limit,
        concurrency_limit: selectedApiKey.concurrency_limit,
      }
      const data = await apiPut<ApiResponse<unknown>>(`/api/api-keys/${selectedApiKey.id}`, payload)
      if (!data.success) {
        setError(data.message || t("common.networkError"))
        return
      }
      await fetchApiKeys()
    } catch {
      setError(t("common.networkError"))
    } finally {
      setBindingBusyId(null)
    }
  }

  const updateFallbackChain = async (nextChain: string) => {
    if (!selectedApiKey) return
    try {
      setFallbackBusy(true)
      const payload = {
        name: selectedApiKey.name,
        scope: selectedApiKey.scope,
        provider_ids: selectedApiKey.provider_ids ?? [],
        strategy: selectedApiKey.strategy ?? "Priority",
        fallback_chain: nextChain.length > 0 ? nextChain : null,
        qps_limit: selectedApiKey.qps_limit,
        concurrency_limit: selectedApiKey.concurrency_limit,
      }
      const data = await apiPut<ApiResponse<unknown>>(`/api/api-keys/${selectedApiKey.id}`, payload)
      if (!data.success) {
        setError(data.message || t("common.networkError"))
        return
      }
      await fetchApiKeys()
    } catch {
      setError(t("common.networkError"))
    } finally {
      setFallbackBusy(false)
    }
  }

  const handleInlineUpdate = async (updates: Partial<ApiKey>) => {
    if (!selectedApiKey) return
    try {
      setInlineSaving(true)
      const payload = {
        name: updates.name ?? selectedApiKey.name,
        scope: updates.scope ?? selectedApiKey.scope,
        provider_ids: updates.provider_ids ?? selectedApiKey.provider_ids ?? [],
        strategy: updates.strategy ?? selectedApiKey.strategy ?? "Priority",
        fallback_chain: updates.fallback_chain ?? selectedApiKey.fallback_chain ?? null,
        qps_limit: updates.qps_limit ?? selectedApiKey.qps_limit,
        concurrency_limit: updates.concurrency_limit ?? selectedApiKey.concurrency_limit,
      }
      const data = await apiPut<ApiResponse<unknown>>(`/api/api-keys/${selectedApiKey.id}`, payload)
      if (!data.success) {
        setError(data.message || t("common.networkError"))
        return
      }
      await fetchApiKeys()
    } catch {
      setError(t("common.networkError"))
    } finally {
      setInlineSaving(false)
    }
  }

  return (
    <div className="flex-1 min-h-0 h-full flex flex-col page-transition p-6 scrollbar-hide">
      <PageHeader
        title={t("services.title")}
        subtitle={t("services.description")}
        action={
          <Button size="sm" onClick={openCreateApiKey} className="bg-primary hover:bg-primary/90">
            {t("apiKeys.create")}
          </Button>
        }
      />

      <div className="max-w-[1400px] mx-auto w-full flex flex-col flex-1 min-h-0 h-full">
        <div className="flex-1 min-h-0 flex flex-col gap-4 h-full">
          <TwoPanelLayout
            left={
              <div className={apiKeys.length === 0 ? "flex-1 min-w-0" : undefined}>
                <div className="rounded-lg bg-background p-4 h-full border border-border">
                  {loading || apiKeyLoading ? (
                    <div className="flex flex-col gap-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-10 w-full bg-muted animate-pulse rounded" />
                      ))}
                    </div>
                  ) : apiKeys.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center text-muted-foreground">
                        <p className="text-lg font-medium mb-2">{t("services.empty")}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {apiKeys.map((key) => (
                        <button
                          key={key.id}
                          type="button"
                          onClick={() => setSelectedApiKeyId(key.id)}
                          className={cn(
                            "w-full text-left rounded-md border border-border px-3 py-2 transition-colors",
                            selectedApiKeyId === key.id
                              ? "border-violet-300 bg-violet-50"
                              : "hover:border-muted hover:bg-muted/40"
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-sm font-medium truncate">{key.name}</div>
                            <div
                              className={cn(
                                "text-xs font-medium px-2 py-0.5 rounded-full",
                                key.status === "active" ? "bg-green-50 text-green-700" : "bg-muted text-muted-foreground"
                              )}
                            >
                              {key.status === "active" ? t("services.enabled") : t("services.disabled")}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            }
            right={
              apiKeys.length === 0 ? null : (
                <DetailPanel>
                  {!selectedApiKey ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      <span>{t("services.select")}</span>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="rounded-lg bg-background p-5 space-y-3">
                        <div className="text-sm font-semibold">{t("services.strategy")}</div>
                        <Select
                          value={selectedApiKey.strategy || "Priority"}
                          onChange={(value) => handleInlineUpdate({ strategy: value })}
                          options={STRATEGY_OPTIONS.map((option) => ({ value: option.value, label: t(option.labelKey) }))}
                          triggerClassName={inlineSaving ? "opacity-60 pointer-events-none" : undefined}
                        />
                        <div className="text-sm text-muted-foreground">
                          {selectedStrategy || t("services.strategyOptions.priority")}
                        </div>
                      </div>
                      <ServiceBindingsSection
                        fallbackChain={selectedApiKey.fallback_chain ?? null}
                        providers={providers}
                        boundProviderIdSet={boundProviderIdSet}
                        bindingBusyId={bindingBusyId}
                        fallbackBusy={fallbackBusy}
                        onUpdateFallbackChain={updateFallbackChain}
                        onToggleBinding={setBinding}
                        error={error}
                      />

                      <ServiceApiKeysSection
                        apiKeys={apiKeys}
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
              )
            }
          />

            <ApiKeyCreateDialog
              open={showCreateApiKeyDialog}
              onOpenChange={(open) => {
                setShowCreateApiKeyDialog(open)
                if (!open) {
                setApiKeyCreateForm({
                  name: "",
                  provider_ids: [],
                  strategy: "Priority",
                  fallback_chain: "",
                  qps_limit: 100,
                  concurrency_limit: 50,
                })
                setApiKeyCreateError(null)
                setCreatedApiKey(null)
              }
              }}
              form={apiKeyCreateForm}
              onFormChange={setApiKeyCreateForm}
              providers={providers}
              bindingBusyId={bindingBusyId}
              fallbackBusy={fallbackBusy}
              onSave={handleCreateApiKey}
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
