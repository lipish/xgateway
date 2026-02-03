import { useCallback, useEffect, useMemo, useState } from "react"
import { PageHeader } from "@/components/layout/page-header"
import { TwoPanelLayout } from "@/components/layout/two-panel-layout"
import { DetailPanel } from "@/components/layout/detail-panel"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { t, useI18n } from "@/lib/i18n"
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api"
import { cn, formatDateTime } from "@/lib/utils"
import { ApiKeyCreateDialog } from "@/components/services/ApiKeyCreateDialog"
import { DeleteApiKeyConfirmDialog } from "@/components/services/DeleteApiKeyConfirmDialog"
import { ServiceBindingsSection } from "@/components/services/ServiceBindingsSection"
import { Select } from "@/components/ui/select"
import { STRATEGY_OPTIONS, type ApiKey, type ApiResponse, type Provider } from "@/components/services/types"
import { BadgeCheck, Copy, Eye, EyeOff, KeyRound, Power, RotateCcw, Trash2 } from "lucide-react"

export function ServicesPage() {
  const { language } = useI18n()
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
  const [copiedApiKeyId, setCopiedApiKeyId] = useState<number | null>(null)
  const [showKeyId, setShowKeyId] = useState<number | null>(null)

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

  const boundProviderIdSet = useMemo(() => {
    const ids = (selectedApiKey?.provider_ids || []).filter((value): value is number => typeof value === "number")
    return new Set(ids)
  }, [selectedApiKey])


  const selectedApiKeyModels = useMemo(() => {
    if (!selectedApiKey) return []
    const ids = (selectedApiKey.provider_ids || []).filter((value): value is number => typeof value === "number")
    return providers
      .filter((provider) => ids.includes(provider.id))
      .map((provider) => {
        try {
          const config = JSON.parse(provider.config || "{}")
          return config.model || provider.endpoint || provider.name
        } catch {
          return provider.endpoint || provider.name
        }
      })
      .filter((value) => value && String(value).trim().length > 0)
  }, [providers, selectedApiKey])

  const selectedProtocolLabel = useMemo(() => {
    if (!selectedApiKey) return null
    return selectedApiKey.protocol === "anthropic" ? t("services.protocolAnthropic") : t("services.protocolOpenAI")
  }, [selectedApiKey])

  const selectedStrategyLabel = useMemo(() => {
    if (!selectedApiKey) return null
    const option = STRATEGY_OPTIONS.find((strategy) => strategy.value === selectedApiKey.strategy)
    return option ? t(option.labelKey) : selectedApiKey.strategy
  }, [selectedApiKey])

  const selectedStrategyDescription = useMemo(() => {
    if (!selectedApiKey) return null
    const option = STRATEGY_OPTIONS.find((strategy) => strategy.value === selectedApiKey.strategy)
    return option ? t(option.descriptionKey) : null
  }, [selectedApiKey])

  const maskKey = (key?: string | null) => {
    if (!key) return "-"
    if (key.length <= 8) return key
    return `${key.slice(0, 4)}**********${key.slice(-4)}`
  }

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
    <div className="flex-1 min-h-0 h-full flex flex-col page-transition p-6 scrollbar-hide">
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

      <div className="max-w-[1400px] mx-auto w-full flex flex-col flex-1 min-h-0 h-full">
        <div className="flex-1 min-h-0 flex flex-col gap-4 h-full">
          <TwoPanelLayout
            left={
              <div className={cn("w-full md:w-[280px] lg:w-[320px] shrink-0", apiKeys.length === 0 && "min-w-0")}>
                <div className="rounded-2xl bg-white p-4 h-full border border-border">
                  <div className="flex items-center gap-2 text-sm font-semibold mb-3">
                    <KeyRound className="h-4 w-4 text-muted-foreground" />
                    {t("services.listTitle")}
                  </div>
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
                    <div className="space-y-3">
                      {apiKeys.map((key) => (
                        <button
                          key={key.id}
                          type="button"
                          onClick={() => setSelectedApiKeyId(key.id)}
                          className={cn(
                            "w-full text-left rounded-2xl border border-transparent px-3 py-3 transition-colors",
                            selectedApiKeyId === key.id
                              ? "bg-violet-50"
                              : "hover:bg-muted/40"
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
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="rounded-2xl bg-muted/70 border border-border/60 p-5 space-y-3">
                          <div className="text-sm font-semibold">{t("services.strategy")}</div>
                          <div>
                            <Select
                              value={selectedApiKey.strategy || "Priority"}
                              onChange={(value) => handleInlineUpdate({ strategy: value })}
                              options={STRATEGY_OPTIONS.map((option) => ({ value: option.value, label: t(option.labelKey) }))}
                              triggerClassName={cn("h-10 px-4", inlineSaving ? "opacity-60 pointer-events-none" : undefined)}
                            />
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {selectedStrategyDescription
                              || selectedStrategyLabel
                              || t("services.strategyDescriptions.priority")}
                          </div>
                        </div>
                        <div className="rounded-2xl bg-muted/70 border border-border/60 p-5 space-y-3">
                          <div className="text-sm font-semibold">{t("services.supportedModels")}</div>
                          {selectedApiKeyModels.length > 0 ? (
                            <div className="space-y-2 text-sm text-muted-foreground">
                              <div className="flex flex-wrap gap-2">
                                {selectedApiKeyModels.map((model) => (
                                  <span key={model} className="rounded-full bg-violet-100 px-3 py-1 text-xs text-violet-700">
                                    {model}
                                  </span>
                                ))}
                              </div>
                              <div className="text-xs">{t("services.supportedModelsHint")}</div>
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground">{t("services.supportedModelsEmpty")}</div>
                          )}
                        </div>
                      </div>
                        <div className="rounded-2xl bg-muted/70 border border-border/60 p-5 space-y-4">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-sm font-semibold">{t("apiKeys.keyContent")}</div>
                            <TooltipProvider>
                              <div className="flex items-center gap-2">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => selectedApiKey && toggleApiKeyStatus(selectedApiKey.id)}
                                    disabled={apiKeyStatusUpdatingId === selectedApiKey.id}
                                    aria-label={selectedApiKey.status === "active" ? t("apiKeys.disable") : t("apiKeys.enable")}
                                  >
                                    <Power className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {selectedApiKey.status === "active" ? t("apiKeys.disable") : t("apiKeys.enable")}
                                </TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => selectedApiKey && rotateApiKey(selectedApiKey.id)}
                                    disabled={rotatingKeyId === selectedApiKey.id}
                                    aria-label={t("apiKeys.resetKey")}
                                  >
                                    <RotateCcw className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>{t("apiKeys.resetKey")}</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => selectedApiKey && setApiKeyToDelete(selectedApiKey.id)}
                                    aria-label={t("common.delete")}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>{t("common.delete")}</TooltipContent>
                              </Tooltip>
                            </div>
                          </TooltipProvider>
                        </div>
                          <div className="grid gap-4 md:grid-cols-2 items-center">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1.5 flex-1">
                                <div className="flex-1 rounded-xl bg-muted/20 px-0 py-2 text-sm font-mono text-left">
                                  {showKeyId === selectedApiKey.id ? selectedApiKey.key_hash : maskKey(selectedApiKey.key_hash)}
                                </div>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7 p-0"
                                        onClick={() =>
                                          setShowKeyId((current) => (current === selectedApiKey.id ? null : selectedApiKey.id))
                                        }
                                        aria-label={t("apiKeys.copy")}
                                      >
                                        {showKeyId === selectedApiKey.id ? (
                                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                                        ) : (
                                          <Eye className="h-4 w-4 text-muted-foreground" />
                                        )}
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {showKeyId === selectedApiKey.id ? t("apiKeys.hideKey") : t("apiKeys.showKey")}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7 p-0"
                                        onClick={async () => {
                                          if (!selectedApiKey.key_hash) return
                                          try {
                                            await navigator.clipboard.writeText(selectedApiKey.key_hash)
                                            setCopiedApiKeyId(selectedApiKey.id)
                                            window.setTimeout(() => setCopiedApiKeyId(null), 1500)
                                          } catch {
                                            setCopiedApiKeyId(null)
                                          }
                                        }}
                                        aria-label={t("apiKeys.copy")}
                                      >
                                        {copiedApiKeyId === selectedApiKey.id ? (
                                          <BadgeCheck className="h-4 w-4 text-muted-foreground" />
                                        ) : (
                                          <Copy className="h-4 w-4 text-muted-foreground" />
                                        )}
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {copiedApiKeyId === selectedApiKey.id ? t("apiKeys.copiedToClipboard") : t("apiKeys.copy")}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </div>
                            <div className="flex items-center justify-end gap-3">
                              <div className="w-60">
                                <Select
                                  value={selectedApiKey.protocol || "openai"}
                                  onChange={(value) => handleInlineUpdate({ protocol: value })}
                                  options={[
                                    { value: "openai", label: t("services.protocolOpenAI") },
                                    { value: "anthropic", label: t("services.protocolAnthropic") },
                                  ]}
                                  triggerClassName={cn("h-10 px-4", inlineSaving ? "opacity-60 pointer-events-none" : undefined)}
                                />
                              </div>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground text-right">{t("services.protocolHint")}</div>
                        {apiKeyError && (
                          <p className="text-sm text-destructive font-medium">
                            {t("apiKeys.error")}: {apiKeyError}
                          </p>
                        )}
                        {rotateError && (
                          <p className="text-sm text-destructive font-medium">
                            {t("apiKeys.rotateError")}: {rotateError}
                          </p>
                        )}
                        {rotatedApiKey && (
                          <div className="rounded-xl bg-muted/30 p-3">
                            <div className="text-xs text-muted-foreground">{t("apiKeys.key")}</div>
                            <div className="mt-2 text-sm font-mono break-all leading-5">{maskKey(rotatedApiKey)}</div>
                          </div>
                        )}
                      </div>
                      <div className="rounded-2xl bg-muted/70 border border-border/60 p-5">
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
                      </div>
                      <div className="rounded-2xl bg-muted/70 border border-border/60 p-5 space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-semibold">{t("services.usageTitle")}</div>
                          <a href="/help" className="text-xs text-primary hover:underline">
                            {t("services.usageGuideLink")}
                          </a>
                        </div>
                        <div className="space-y-2 text-xs text-muted-foreground">
                          <div>{t("services.usageAuth")}</div>
                          <div>{t("services.usageBaseUrl")}</div>
                          <div>
                            {selectedApiKey.protocol === "anthropic"
                              ? t("services.protocolEndpointsAnthropic")
                              : t("services.protocolEndpointsOpenAI")}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                              {selectedProtocolLabel || t("services.protocolOpenAI")}
                            </span>
                          </div>
                        </div>
                        <div className="rounded-xl bg-background/70 border border-border/60 px-3 py-2 text-xs font-mono text-muted-foreground whitespace-pre-wrap">
                          {selectedApiKey.protocol === "anthropic"
                            ? `curl -X POST http://localhost:3000/v1/messages \\\n  -H "Authorization: Bearer {API_KEY}" \\\n  -H "Content-Type: application/json" \\\n  -d '{\"model\":\"claude-3-5-sonnet-20241022\",\"messages\":[{\"role\":\"user\",\"content\":\"Hello\"}]}'`
                            : `curl -X POST http://localhost:3000/v1/chat/completions \\\n  -H "Authorization: Bearer {API_KEY}" \\\n  -H "Content-Type: application/json" \\\n  -d '{\"model\":\"gpt-4\",\"messages\":[{\"role\":\"user\",\"content\":\"Hello\"}]}'`}
                        </div>
                      </div>

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
      </div>
    </div>
  )
}
