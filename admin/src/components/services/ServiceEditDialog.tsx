import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { t } from "@/lib/i18n"
import { STRATEGY_OPTIONS } from "./types"
import type { Provider, Service } from "./types"
import { cn } from "@/lib/utils"
import { Check, ChevronsUpDown } from "lucide-react"

interface ServiceEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  services: Service[]
  providers: Provider[]
  boundProviderIdSet: Set<number>
  bindingBusyId: number | null
  onToggleBinding: (providerId: number, nextBound: boolean) => void
  currentServiceId: string | null
  form: {
    name: string
    enabled: boolean
    strategy: string
    fallback_chain: string
    qps_limit: number
    concurrency_limit: number
    max_queue_size: number
    max_queue_wait_ms: number
  }
  onFormChange: (next: ServiceEditDialogProps["form"]) => void
  onSave: () => void
  saving: boolean
  error: string | null
}

function parseFallbackIds(chain: string): string[] {
  return chain
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

function formatFallbackChain(ids: string[]): string {
  return ids.join(",")
}

export function ServiceEditDialog({
  open,
  onOpenChange,
  services,
  providers,
  boundProviderIdSet,
  bindingBusyId,
  onToggleBinding,
  currentServiceId,
  form,
  onFormChange,
  onSave,
  saving,
  error,
}: ServiceEditDialogProps) {
  const selected = parseFallbackIds(form.fallback_chain)
  const selectedSet = new Set(selected)
  const options = services.filter((s) => (currentServiceId ? s.id !== currentServiceId : true))
  const selectedStrategy = STRATEGY_OPTIONS.find((o) => o.value === form.strategy) || STRATEGY_OPTIONS[0]
  const selectedLabels = selected
    .map((id) => options.find((s) => s.id === id) || services.find((s) => s.id === id))
    .filter((s): s is Service => Boolean(s))
    .map((s) => s.name)

  const selectedProviderNames = providers.filter((p) => boundProviderIdSet.has(p.id)).map((p) => p.name)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden border">
        <div className="p-6 space-y-5">
          <DialogHeader className="space-y-1.5 mb-0">
            <DialogTitle className="text-xl font-semibold tracking-tight">{t("common.edit")}</DialogTitle>
            <DialogDescription className="text-purple-600 font-medium pb-2">{t("services.editDesc")}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t("services.name")}</Label>
              <Input value={form.name} onChange={(e) => onFormChange({ ...form, name: e.target.value })} className="h-10" />
            </div>

            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t("services.strategy")}</Label>
                <Select
                  value={form.strategy}
                  onChange={(value) => onFormChange({ ...form, strategy: value })}
                  options={STRATEGY_OPTIONS.map((o) => ({ value: o.value, label: t(o.labelKey) }))}
                  triggerClassName="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t("services.enabled")}</Label>
                <div className="h-10 flex items-center">
                  <Switch checked={form.enabled} onCheckedChange={(v) => onFormChange({ ...form, enabled: v })} />
                </div>
              </div>
            </div>

            <div className="-mt-2 text-xs text-muted-foreground">{t(selectedStrategy.descriptionKey)}</div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">{t("services.fallbackChain")}</Label>
              <Popover modal={false}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="h-10 w-full justify-between font-normal"
                    type="button"
                  >
                    <span className="flex-1 truncate text-left">
                      {selectedLabels.length > 0 ? selectedLabels.join(", ") : t("services.fallbackChainPlaceholder")}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[24rem] p-0" align="start">
                  <Command>
                    <CommandInput placeholder={t("common.search")} />
                    <CommandList>
                      <CommandEmpty>{t("services.empty")}</CommandEmpty>
                      <CommandGroup>
                        {options.map((s) => (
                          <CommandItem
                            key={s.id}
                            value={`${s.name} ${s.id}`}
                            onSelect={() => {
                              const exists = selectedSet.has(s.id)
                              const next = exists ? selected.filter((id) => id !== s.id) : [...selected, s.id]
                              onFormChange({ ...form, fallback_chain: formatFallbackChain(next) })
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", selectedSet.has(s.id) ? "opacity-100" : "opacity-0")} />
                            <span className="truncate">{s.name}</span>
                            <span className="ml-auto text-xs text-muted-foreground">{s.id}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">{t("services.bindings")}</Label>
              <Popover modal={false}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="h-10 w-full justify-between font-normal" type="button">
                    <span className="flex-1 truncate text-left">
                      {selectedProviderNames.length > 0 ? selectedProviderNames.join(", ") : t("services.bindingsPlaceholder")}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[24rem] p-0" align="start">
                  <Command>
                    <CommandInput placeholder={t("common.search")} />
                    <CommandList>
                      <CommandEmpty>{t("providers.empty")}</CommandEmpty>
                      <CommandGroup>
                        {providers.map((p) => {
                          const checked = boundProviderIdSet.has(p.id)
                          const busy = bindingBusyId === p.id
                          return (
                            <CommandItem
                              key={p.id}
                              value={`${p.name} ${p.provider_type}`}
                              onSelect={() => {
                                if (busy) return
                                onToggleBinding(p.id, !checked)
                              }}
                              className={cn(busy && "opacity-70")}
                            >
                              <Check className={cn("mr-2 h-4 w-4", checked ? "opacity-100" : "opacity-0")} />
                              <span className="truncate">{p.name}</span>
                              <span className="ml-auto text-xs text-muted-foreground">{p.provider_type}</span>
                            </CommandItem>
                          )
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="pt-1 grid gap-4 grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t("services.qpsLimit")}</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.qps_limit}
                  onChange={(e) => onFormChange({ ...form, qps_limit: Number.isFinite(e.currentTarget.valueAsNumber) ? e.currentTarget.valueAsNumber : 0 })}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t("services.concurrencyLimit")}</Label>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={form.concurrency_limit}
                  onChange={(e) => onFormChange({ ...form, concurrency_limit: Number.isFinite(e.currentTarget.valueAsNumber) ? e.currentTarget.valueAsNumber : 0 })}
                  className="h-10"
                />
              </div>
            </div>
            <div className="-mt-1 text-xs text-muted-foreground">{t("services.qpsConcurrencyHelp")}</div>

            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t("services.maxQueueSize")}</Label>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={form.max_queue_size}
                  onChange={(e) => onFormChange({ ...form, max_queue_size: Number.isFinite(e.currentTarget.valueAsNumber) ? e.currentTarget.valueAsNumber : 0 })}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t("services.maxQueueWaitMs")}</Label>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={form.max_queue_wait_ms}
                  onChange={(e) => onFormChange({ ...form, max_queue_wait_ms: Number.isFinite(e.currentTarget.valueAsNumber) ? e.currentTarget.valueAsNumber : 0 })}
                  className="h-10"
                />
              </div>
            </div>

            {error && <p className="text-sm text-destructive mt-1 font-medium">{error}</p>}
          </div>

          <DialogFooter className="gap-2 mt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="h-10 px-10">
              {t("common.cancel")}
            </Button>
            <Button
              onClick={onSave}
              disabled={saving}
              className="h-10 px-10 bg-purple-600 hover:bg-purple-700 text-white border-0"
            >
              {saving ? (t("common.saving") || t("common.save")) : t("common.save")}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
