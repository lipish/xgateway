import { useState, useMemo } from "react"
import { t } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { BadgeCheck, Copy, Eye, EyeOff, Power, RotateCcw, Trash2 } from "lucide-react"
import { type ApiKey, type Provider, STRATEGY_OPTIONS } from "@/components/services/types"
import { ServiceBindingsSection } from "@/components/services/ServiceBindingsSection"

interface ApiKeyDetailProps {
  apiKey: ApiKey | null
  providers: Provider[]
  onUpdate: (updates: Partial<ApiKey>) => Promise<void>
  onToggleStatus: (id: number) => Promise<void>
  onRotate: (id: number) => Promise<void>
  onDelete: (id: number) => void
  onUpdateFallbackChain: (chain: string) => Promise<void>
  onToggleBinding: (providerId: number, bound: boolean) => Promise<void>
  
  // Loading/Busy states
  statusUpdatingId: number | null
  rotatingId: number | null
  bindingBusyId: number | null
  fallbackBusy: boolean
  inlineSaving: boolean
  
  // Error/Success states from parent if needed, or handled internally
  rotatedApiKey: string | null
  rotateError: string | null
  error: string | null
}

export function ApiKeyDetail({
  apiKey,
  providers,
  onUpdate,
  onToggleStatus,
  onRotate,
  onDelete,
  onUpdateFallbackChain,
  onToggleBinding,
  statusUpdatingId,
  rotatingId,
  bindingBusyId,
  fallbackBusy,
  inlineSaving,
  rotatedApiKey,
  rotateError,
  error,
}: ApiKeyDetailProps) {
  const [showKeyId, setShowKeyId] = useState<number | null>(null)
  const [copiedApiKeyId, setCopiedApiKeyId] = useState<number | null>(null)

  const selectedApiKeyModels = useMemo(() => {
    if (!apiKey) return []
    const ids = (apiKey.provider_ids || []).filter((value): value is number => typeof value === "number")
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
  }, [providers, apiKey])

  const selectedProtocolLabel = useMemo(() => {
    if (!apiKey) return null
    return apiKey.protocol === "anthropic" ? t("services.protocolAnthropic") : t("services.protocolOpenAI")
  }, [apiKey])

  const selectedStrategyLabel = useMemo(() => {
    if (!apiKey) return null
    const option = STRATEGY_OPTIONS.find((strategy) => strategy.value === apiKey.strategy)
    return option ? t(option.labelKey) : apiKey.strategy
  }, [apiKey])

  const selectedStrategyDescription = useMemo(() => {
    if (!apiKey) return null
    const option = STRATEGY_OPTIONS.find((strategy) => strategy.value === apiKey.strategy)
    return option ? t(option.descriptionKey) : null
  }, [apiKey])

  const maskKey = (key?: string | null) => {
    if (!key) return "-"
    if (key.length <= 8) return key
    return `${key.slice(0, 4)}**********${key.slice(-4)}`
  }

  const boundProviderIdSet = useMemo(() => {
    const ids = (apiKey?.provider_ids || []).filter((value): value is number => typeof value === "number")
    return new Set(ids)
  }, [apiKey])

  if (!apiKey) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <span>{t("services.select")}</span>
      </div>
    )
  }

  return (
    <div className="space-y-4 h-full overflow-y-auto pr-1 pb-4">
      {/* Top Row: Strategy & Models */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Strategy Card */}
        <div className="rounded-2xl bg-white border border-border p-5 space-y-3 shadow-sm">
          <div className="text-sm font-semibold text-foreground/80">{t("services.strategy")}</div>
          <div>
            <Select
              value={apiKey.strategy || "Priority"}
              onChange={(value) => onUpdate({ strategy: value })}
              options={STRATEGY_OPTIONS.map((option) => ({ value: option.value, label: t(option.labelKey) }))}
              triggerClassName={cn("h-9 px-3 w-full", inlineSaving ? "opacity-60 pointer-events-none" : undefined)}
            />
          </div>
          <div className="text-xs text-muted-foreground leading-relaxed">
            {selectedStrategyDescription || selectedStrategyLabel || t("services.strategyDescriptions.priority")}
          </div>
        </div>

        {/* Supported Models Card */}
        <div className="rounded-2xl bg-white border border-border p-5 space-y-3 shadow-sm flex flex-col">
          <div className="text-sm font-semibold text-foreground/80">{t("services.supportedModels")}</div>
          {selectedApiKeyModels.length > 0 ? (
            <div className="flex flex-wrap gap-2 content-start">
              {selectedApiKeyModels.map((model) => (
                <span key={model} className="rounded-md bg-violet-50 px-2 py-1 text-xs font-medium text-violet-700 border border-violet-100">
                  {model}
                </span>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground italic">{t("services.supportedModelsEmpty")}</div>
          )}
          <div className="mt-auto text-xs text-muted-foreground pt-2">{t("services.supportedModelsHint")}</div>
        </div>
      </div>

      {/* Key Content Card */}
      <div className="rounded-2xl bg-white border border-border p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-semibold text-foreground/80">{t("apiKeys.keyContent")}</div>
          
          <div className="flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 hover:bg-muted text-muted-foreground"
                    onClick={() => onToggleStatus(apiKey.id)}
                    disabled={statusUpdatingId === apiKey.id}
                  >
                    <Power className={cn("h-4 w-4", apiKey.status === "active" ? "text-green-600" : "text-muted-foreground")} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {apiKey.status === "active" ? t("apiKeys.disable") : t("apiKeys.enable")}
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 hover:bg-muted text-muted-foreground"
                    onClick={() => onRotate(apiKey.id)}
                    disabled={rotatingId === apiKey.id}
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
                    className="h-8 w-8 hover:bg-muted text-muted-foreground hover:text-destructive"
                    onClick={() => onDelete(apiKey.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("common.delete")}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 flex items-center gap-2 bg-muted/30 rounded-lg border border-border px-3 h-10">
            <div className="flex-1 font-mono text-sm truncate text-foreground/90">
              {showKeyId === apiKey.id ? apiKey.key_hash : maskKey(apiKey.key_hash)}
            </div>
            
            <div className="flex items-center gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowKeyId((current) => (current === apiKey.id ? null : apiKey.id))}
                    >
                      {showKeyId === apiKey.id ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {showKeyId === apiKey.id ? t("apiKeys.hideKey") : t("apiKeys.showKey")}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      onClick={async () => {
                        if (!apiKey.key_hash) return
                        try {
                          await navigator.clipboard.writeText(apiKey.key_hash)
                          setCopiedApiKeyId(apiKey.id)
                          window.setTimeout(() => setCopiedApiKeyId(null), 1500)
                        } catch {
                          setCopiedApiKeyId(null)
                        }
                      }}
                    >
                      {copiedApiKeyId === apiKey.id ? <BadgeCheck className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {copiedApiKeyId === apiKey.id ? t("apiKeys.copiedToClipboard") : t("apiKeys.copy")}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          <div className="w-[140px] shrink-0">
            <Select
              value={apiKey.protocol || "openai"}
              onChange={(value) => onUpdate({ protocol: value })}
              options={[
                { value: "openai", label: t("services.protocolOpenAI") },
                { value: "anthropic", label: t("services.protocolAnthropic") },
              ]}
              triggerClassName={cn("h-10 px-3", inlineSaving ? "opacity-60 pointer-events-none" : undefined)}
            />
          </div>
        </div>
        
        <div className="text-xs text-muted-foreground">{t("services.protocolHint")}</div>

        {rotateError && (
          <p className="text-sm text-destructive font-medium bg-destructive/10 p-2 rounded-md">
            {t("apiKeys.rotateError")}: {rotateError}
          </p>
        )}
        
        {rotatedApiKey && (
          <div className="rounded-xl bg-yellow-50 border border-yellow-200 p-4 animate-in fade-in slide-in-from-top-2">
            <div className="text-xs font-semibold text-yellow-800 uppercase tracking-wider mb-1">{t("apiKeys.key")} (New)</div>
            <div className="text-sm font-mono break-all text-yellow-900 selection:bg-yellow-200">{rotatedApiKey}</div>
            <div className="text-xs text-yellow-700 mt-2">Make sure to copy this key now. It won't be shown again in full.</div>
          </div>
        )}
      </div>

      {/* Bindings & Fallback */}
      <div className="rounded-2xl bg-white border border-border p-5 shadow-sm">
        <ServiceBindingsSection
          fallbackChain={apiKey.fallback_chain ?? null}
          providers={providers}
          boundProviderIdSet={boundProviderIdSet}
          bindingBusyId={bindingBusyId}
          fallbackBusy={fallbackBusy}
          onUpdateFallbackChain={onUpdateFallbackChain}
          onToggleBinding={onToggleBinding}
          error={error}
        />
      </div>

      {/* Usage Example */}
      <div className="rounded-2xl bg-white border border-border p-5 space-y-3 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-foreground/80">{t("services.usageTitle")}</div>
          <a href="/help" className="text-xs text-primary hover:underline font-medium">
            {t("services.usageGuideLink")}
          </a>
        </div>
        
        <div className="rounded-xl bg-zinc-950 border border-zinc-800 px-4 py-3 text-xs font-mono text-zinc-300 whitespace-pre-wrap overflow-x-auto">
          {apiKey.protocol === "anthropic"
            ? `curl -X POST http://localhost:3000/v1/messages \\
  -H "Authorization: Bearer {API_KEY}" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"claude-3-5-sonnet-20241022","messages":[{"role":"user","content":"Hello"}]}'`
            : `curl -X POST http://localhost:3000/v1/chat/completions \\
  -H "Authorization: Bearer {API_KEY}" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"gpt-4","messages":[{"role":"user","content":"Hello"}]}'`}
        </div>
        
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
            <span>{t("services.usageAuth")}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
            <span>{selectedProtocolLabel || t("services.protocolOpenAI")}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
