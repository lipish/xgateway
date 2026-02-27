import { useCallback, useEffect, useMemo, useState } from "react"
import { PageHeader } from "@/components/layout/page-header"
import { TwoPanelLayout } from "@/components/layout/two-panel-layout"
import { DetailPanel } from "@/components/layout/detail-panel"
import { Button } from "@/components/ui/button"
import { t } from "@/lib/i18n"
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api"
import { ApiKeyCreateDialog } from "@/components/services/ApiKeyCreateDialog"
import { DeleteApiKeyConfirmDialog } from "@/components/services/DeleteApiKeyConfirmDialog"
import { type ApiKey, type ApiResponse, type Provider } from "@/components/services/types"
import { PageShell } from "@/components/layout/page-shell"
import { PageContainer } from "@/components/layout/page-container"
import { ApiKeyList } from "@/components/api-keys/ApiKeyList"
import { ApiKeyDetail } from "@/components/api-keys/ApiKeyDetail"

export function ServicesPage() {
  const [providers, setProviders] = useState<Provider[]>([])
  const [projects, setProjects] = useState<{ id: number; name: string }[]>([])
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
    project_id: "",
    protocol: "openai",
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

  const fetchApiKeys = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false
    try {
      if (!silent) setApiKeyLoading(true)
      setApiKeyError(null)
      const data = await apiGet<ApiResponse<ApiKey[]>>("/api/api-keys")
      if (!data.success) {
        if (data.message === "forbidden_provider") {
          setApiKeyError(t("users.forbiddenProvider"))
        } else {
          setApiKeyError(data.message || t("common.networkError"))
        }
        if (!silent) setApiKeys([])
        return
      }
      setApiKeys(data.data || [])
    } catch {
      setApiKeyError(t("common.networkError"))
      if (!silent) setApiKeys([])
    } finally {
      if (!silent) setApiKeyLoading(false)
    }
  }, [])

  const fetchProjects = useCallback(async () => {
    try {
      const data = await apiGet<ApiResponse<{ id: number; name: string }[]>>("/api/projects")
      if (!data.success) {
        return
      }
      const list = data.data || []
      setProjects(list)
      if (list.length > 0) {
        setApiKeyCreateForm((prev) => ({ ...prev, project_id: prev.project_id || list[0].id.toString() }))
      }
    } catch {
      setProjects([])
    }
  }, [])

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true)
        setError(null)
        await Promise.all([fetchProviders(), fetchApiKeys(), fetchProjects()])
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [fetchProviders, fetchApiKeys, fetchProjects])

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
      project_id: projects[0]?.id?.toString() || "",
      protocol: "openai",
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
        protocol: apiKeyCreateForm.protocol,
        project_id: apiKeyCreateForm.project_id ? Number(apiKeyCreateForm.project_id) : undefined,
        provider_ids: apiKeyCreateForm.provider_ids,
        strategy: apiKeyCreateForm.strategy,
        fallback_chain: apiKeyCreateForm.fallback_chain.trim() ? apiKeyCreateForm.fallback_chain.trim() : null,
        qps_limit: Number(apiKeyCreateForm.qps_limit) || 0,
        concurrency_limit: Math.floor(Number(apiKeyCreateForm.concurrency_limit) || 0),
      }

      const data = await apiPost<ApiResponse<{ full_key?: string }>>("/api/api-keys", payload)
      if (!data.success) {
        if (data.message === "forbidden_provider") {
          setApiKeyCreateError(t("users.forbiddenProvider"))
          return
        }
        setApiKeyCreateError(data.message || t('common.networkError'))
        return
      }

      setCreatedApiKey(data.data?.full_key || null)
      await fetchApiKeys({ silent: true })
    } catch {
      setApiKeyCreateError(t('common.networkError'))
    } finally {
      setApiKeySaving(false)
    }
  }

  const toggleApiKeyStatus = async (id: number) => {
    const currentStatus = apiKeys.find((key) => key.id === id)?.status
    try {
      setApiKeyStatusUpdatingId(id)
      if (currentStatus) {
        const optimisticStatus = currentStatus === "active" ? "disabled" : "active"
        setApiKeys((current) => current.map((key) => (key.id === id ? { ...key, status: optimisticStatus } : key)))
      }
      const data = await apiPost<ApiResponse<unknown>>(`/api/api-keys/${id}/toggle`)
      if (!data.success) {
        if (data.message === "forbidden_provider") {
          setApiKeyError(t("users.forbiddenProvider"))
        } else {
          setApiKeyError(data.message || t('common.networkError'))
        }
        if (currentStatus) {
          setApiKeys((current) => current.map((key) => (key.id === id ? { ...key, status: currentStatus } : key)))
        }
        return
      }
      await fetchApiKeys({ silent: true })
    } catch {
      setApiKeyError(t('common.networkError'))
      if (currentStatus) {
        setApiKeys((current) => current.map((key) => (key.id === id ? { ...key, status: currentStatus } : key)))
      }
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
        if (data.message === "forbidden_provider") {
          setApiKeyError(t("users.forbiddenProvider"))
        } else {
          setApiKeyError(data.message || t('common.networkError'))
        }
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
        protocol: selectedApiKey.protocol ?? "openai",
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
        protocol: selectedApiKey.protocol ?? "openai",
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
    const nextApiKey = {
      ...selectedApiKey,
      ...updates,
      provider_ids: updates.provider_ids ?? selectedApiKey.provider_ids ?? [],
      strategy: updates.strategy ?? selectedApiKey.strategy ?? "Priority",
      fallback_chain: updates.fallback_chain ?? selectedApiKey.fallback_chain ?? null,
      protocol: updates.protocol ?? selectedApiKey.protocol ?? "openai",
    }
    try {
      setInlineSaving(true)
      const payload = {
        name: nextApiKey.name,
        scope: nextApiKey.scope,
        protocol: nextApiKey.protocol ?? "openai",
        provider_ids: nextApiKey.provider_ids ?? [],
        strategy: nextApiKey.strategy ?? "Priority",
        fallback_chain: nextApiKey.fallback_chain ?? null,
        qps_limit: nextApiKey.qps_limit,
        concurrency_limit: nextApiKey.concurrency_limit,
      }
      const data = await apiPut<ApiResponse<unknown>>(`/api/api-keys/${selectedApiKey.id}`, payload)
      if (!data.success) {
        setError(data.message || t("common.networkError"))
        return
      }
      setApiKeys((current) => current.map((key) => (key.id === selectedApiKey.id ? { ...key, ...nextApiKey } : key)))
    } catch {
      setError(t("common.networkError"))
    } finally {
      setInlineSaving(false)
    }
  }

  return (
    <PageShell>
      <PageHeader
        title={t("services.title")}
        subtitle={t("services.description")}
        action={
          <Button size="sm" onClick={openCreateApiKey} className="bg-primary hover:bg-primary/90">
            <span className="mr-2 text-lg leading-none">+</span>
            {t("apiKeys.create")}
          </Button>
        }
      />

      <PageContainer>
        <div className="flex-1 min-h-0 flex flex-col gap-4 h-full">
          <TwoPanelLayout
            left={
              <ApiKeyList
                apiKeys={apiKeys}
                loading={loading || apiKeyLoading}
                selectedId={selectedApiKeyId}
                onSelect={setSelectedApiKeyId}
              />
            }
            right={
              apiKeys.length === 0 ? null : (
                <DetailPanel>
                  <ApiKeyDetail
                    apiKey={selectedApiKey}
                    providers={providers}
                    onUpdate={handleInlineUpdate}
                    onToggleStatus={toggleApiKeyStatus}
                    onRotate={rotateApiKey}
                    onDelete={setApiKeyToDelete}
                    onUpdateFallbackChain={updateFallbackChain}
                    onToggleBinding={setBinding}
                    statusUpdatingId={apiKeyStatusUpdatingId}
                    rotatingId={rotatingKeyId}
                    bindingBusyId={bindingBusyId}
                    fallbackBusy={fallbackBusy}
                    inlineSaving={inlineSaving}
                    rotatedApiKey={rotatedApiKey}
                    rotateError={rotateError}
                    error={apiKeyError || error}
                  />
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
                  project_id: projects[0]?.id?.toString() || "",
                  protocol: "openai",
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
            projectOptions={projects.map((project) => ({
              value: project.id.toString(),
              label: project.id === 1 && project.name === "default" ? t("projects.defaultName") : project.name,
            }))}
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
      </PageContainer>
    </PageShell>
  )
}
