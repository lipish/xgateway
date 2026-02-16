import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Select } from "@/components/ui/select"
import { t } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { Check, ChevronsUpDown, Copy, Loader2 } from "lucide-react"
import { useState } from "react"
import type { Provider } from "./types"
import { STRATEGY_OPTIONS } from "./types"

interface ApiKeyCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  form: {
    name: string
    project_id: string
    protocol: string
    provider_ids: number[]
    strategy: string
    fallback_chain: string
    qps_limit: number
    concurrency_limit: number
  }
  onFormChange: (next: ApiKeyCreateDialogProps["form"]) => void
  projectOptions: { value: string; label: string }[]
  providers: Provider[]
  bindingBusyId: number | null
  fallbackBusy: boolean
  onSave: () => void
  saving: boolean
  error: string | null
  createdApiKey: string | null
}

export function ApiKeyCreateDialog({
  open,
  onOpenChange,
  form,
  onFormChange,
  projectOptions,
  providers,
  bindingBusyId,
  fallbackBusy,
  onSave,
  saving,
  error,
  createdApiKey,
}: ApiKeyCreateDialogProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const copied = copiedKey === createdApiKey && createdApiKey !== null
  const boundProviderIdSet = new Set(form.provider_ids)
  const strategyOption = STRATEGY_OPTIONS.find((option) => option.value === form.strategy)
  const selectedNames = providers.filter((p) => boundProviderIdSet.has(p.id)).map((p) => p.name)
  const fallbackChainValue = form.fallback_chain.trim()
  const fallbackIds = fallbackChainValue.split(",").map((value) => value.trim()).filter((value) => value.length > 0)
  const fallbackLabel = fallbackIds
    .map((id) => providers.find((provider) => String(provider.id) === id)?.name || id)
    .filter((label) => label.length > 0)
    .join(", ")
  const fallbackIdSet = new Set(fallbackIds)
  const fallbackOptions = providers

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden border">
        <div className="p-6 space-y-5">
          <DialogHeader className="space-y-1.5 mb-0">
            <DialogTitle className="text-xl font-semibold tracking-tight">{t("apiKeys.create")}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-5 py-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t("apiKeys.name")}</Label>
              <Input
                autoFocus
                value={form.name}
                onChange={(e) => onFormChange({ ...form, name: e.target.value })}
                placeholder={t("apiKeys.enterName")}
                className="h-10"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t("apiKeys.project")}</Label>
                <Select
                  value={form.project_id}
                  onChange={(value) => onFormChange({ ...form, project_id: value })}
                  options={projectOptions}
                  placeholder={t("apiKeys.selectProject")}
                  triggerClassName="h-10"
                />
                {projectOptions.length === 0 && (
                  <p className="text-xs text-muted-foreground">{t("projects.empty")}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t("services.protocolTitle")}</Label>
                <Select
                  value={form.protocol}
                  onChange={(value) => onFormChange({ ...form, protocol: value })}
                  options={[
                    { value: "openai", label: t("services.protocolOpenAI") },
                    { value: "anthropic", label: t("services.protocolAnthropic") },
                  ]}
                  triggerClassName="h-10"
                />
                <p className="text-xs text-muted-foreground">{t("services.protocolHint")}</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-semibold">{t("services.bindings")}</div>
              <Popover modal={false}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="h-10 w-full justify-between font-normal" type="button">
                    <span className="flex-1 truncate text-left">
                      {selectedNames.length > 0 ? selectedNames.join(", ") : t("services.bindingsPlaceholder")}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[20rem] p-0" align="start">
                  <Command>
                    <CommandInput placeholder={t("common.search")} />
                    <CommandList>
                      <CommandEmpty>{t("providers.empty")}</CommandEmpty>
                      <CommandGroup>
                        {providers.map((provider) => {
                          const checked = boundProviderIdSet.has(provider.id)
                          const busy = bindingBusyId === provider.id
                          return (
                            <CommandItem
                              key={provider.id}
                              value={`${provider.name} ${provider.provider_type}`}
                              onSelect={() => {
                                if (busy) return
                                const next = checked
                                  ? form.provider_ids.filter((id) => id !== provider.id)
                                  : [...form.provider_ids, provider.id]
                                onFormChange({ ...form, provider_ids: next })
                              }}
                              className={cn(busy && "opacity-70")}
                            >
                              <Check className={cn("mr-2 h-4 w-4", checked ? "opacity-100" : "opacity-0")} />
                              <span className="truncate">{provider.name}</span>
                              <span className="ml-auto text-xs text-muted-foreground">{provider.provider_type}</span>
                              {busy && <Loader2 className="ml-2 h-4 w-4 animate-spin text-muted-foreground" />}
                            </CommandItem>
                          )
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="text-sm font-semibold">{t("services.strategy")}</div>
                <div className="relative">
                  <Select
                    value={form.strategy}
                    onChange={(value) => onFormChange({ ...form, strategy: value })}
                    options={STRATEGY_OPTIONS.map((option) => ({ value: option.value, label: t(option.labelKey) }))}
                    menuSide="top"
                  />
                </div>
                {strategyOption && <div className="text-sm text-muted-foreground">{t(strategyOption.descriptionKey)}</div>}
              </div>
              <div className="space-y-2">
                <div className="text-sm font-semibold">{t("services.fallbackChain")}</div>
                <Popover modal={false}>
                  <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="h-10 w-full justify-between font-normal" type="button">
                      <span className="flex-1 truncate text-left">
                        {fallbackLabel || t("services.fallbackChainPlaceholder")}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                <PopoverContent className="w-[20rem] p-0" align="start" side="top">
                    <Command>
                      <CommandInput placeholder={t("common.search")} />
                      <CommandList>
                        <CommandEmpty>{t("services.empty")}</CommandEmpty>
                        <CommandGroup>
                          {fallbackOptions.map((provider) => (
                            <CommandItem
                              key={provider.id}
                              value={`${provider.name} ${provider.id}`}
                              onSelect={() => {
                                if (fallbackBusy) return
                                const providerId = String(provider.id)
                                const exists = fallbackIdSet.has(providerId)
                                const next = exists ? fallbackIds.filter((id) => id !== providerId) : [...fallbackIds, providerId]
                                onFormChange({ ...form, fallback_chain: next.join(",") })
                              }}
                              className={cn(fallbackBusy && "opacity-70")}
                            >
                              <Check className={cn("mr-2 h-4 w-4", fallbackIdSet.has(String(provider.id)) ? "opacity-100" : "opacity-0")} />
                              <span className="truncate">{provider.name}</span>
                              <span className="ml-auto text-xs text-muted-foreground">{provider.id}</span>
                              {fallbackBusy && <Loader2 className="ml-2 h-4 w-4 animate-spin text-muted-foreground" />}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t("apiKeys.qps")}</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.qps_limit}
                  onChange={(e) => onFormChange({ ...form, qps_limit: Number(e.target.value) })}
                  placeholder={t("apiKeys.enterRateLimit")}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t("apiKeys.concurrency")}</Label>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={form.concurrency_limit}
                  onChange={(e) => onFormChange({ ...form, concurrency_limit: Number(e.target.value) })}
                  placeholder={t("apiKeys.enterConcurrency")}
                  className="h-10"
                />
              </div>
            </div>

            {error && <p className="text-sm text-destructive mt-1 font-medium">{error}</p>}
            {createdApiKey && (
              <div className="rounded-md border bg-muted/30 p-3">
                <div className="text-xs text-muted-foreground">{t("apiKeys.saveKeyHint")}</div>
                <div className="mt-2 flex items-start gap-2">
                  <div className="text-sm font-mono break-all flex-1">{createdApiKey}</div>
                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(createdApiKey)
                        setCopiedKey(createdApiKey)
                        window.setTimeout(() => setCopiedKey(null), 1500)
                      } catch {
                        setCopiedKey(null)
                      }
                    }}
                  >
                    {copied ? <span className="text-[10px]">{t("apiKeys.copiedToClipboard")}</span> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 mt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="h-10 px-10">
              {t("common.cancel")}
            </Button>
            <Button
              onClick={createdApiKey ? () => onOpenChange(false) : onSave}
              disabled={saving}
              className="h-10 px-10 bg-purple-600 hover:bg-purple-700 text-white border-0"
            >
              {createdApiKey ? t("common.confirm") : saving ? (t("common.saving") || t("common.save")) : t("common.save")}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
