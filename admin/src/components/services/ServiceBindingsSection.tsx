import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { t } from "@/lib/i18n"
import type { Provider, Service } from "./types"

interface ServiceBindingsSectionProps {
  service: Service
  services: Service[]
  providers: Provider[]
  boundProviderIdSet: Set<number>
  bindingBusyId: number | null
  fallbackBusy: boolean
  onUpdateFallbackChain: (nextChain: string) => void
  onToggleBinding: (providerId: number, nextBound: boolean) => void
  error: string | null
}

export function ServiceBindingsSection({
  service,
  services,
  providers,
  boundProviderIdSet,
  bindingBusyId,
  fallbackBusy,
  onUpdateFallbackChain,
  onToggleBinding,
  error,
}: ServiceBindingsSectionProps) {
  const selectedNames = providers.filter((p) => boundProviderIdSet.has(p.id)).map((p) => p.name)
  const fallbackChain = service.fallback_chain?.trim() || ""
  const fallbackLabel = fallbackChain
    ? fallbackChain.split(",").map((value) => value.trim()).filter((value) => value.length > 0).join(", ")
    : ""
  const fallbackIds = fallbackChain.split(",").map((value) => value.trim()).filter((value) => value.length > 0)
  const fallbackIdSet = new Set(fallbackIds)
  const fallbackOptions = services.filter((s) => s.id !== service.id)

  return (
    <div className="rounded-lg bg-background p-5">
      <div className="grid gap-4 md:grid-cols-2">
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
        <div className="space-y-2">
          <div className="text-sm font-semibold">{t("services.fallbackChain")}</div>
          <Popover modal={false}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" className="h-10 w-full justify-between font-normal text-xs" type="button">
                <span className="flex-1 truncate text-left">
                  {fallbackLabel || t("services.fallbackChainPlaceholder")}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[20rem] p-0" align="start">
              <Command>
                <CommandInput placeholder={t("common.search")} />
                <CommandList>
                  <CommandEmpty>{t("services.empty")}</CommandEmpty>
                  <CommandGroup>
                    {fallbackOptions.map((s) => (
                      <CommandItem
                        key={s.id}
                        value={`${s.name} ${s.id}`}
                        onSelect={() => {
                          if (fallbackBusy) return
                          const exists = fallbackIdSet.has(s.id)
                          const next = exists ? fallbackIds.filter((id) => id !== s.id) : [...fallbackIds, s.id]
                          onUpdateFallbackChain(next.join(","))
                        }}
                        className={cn(fallbackBusy && "opacity-70")}
                      >
                        <Check className={cn("mr-2 h-4 w-4", fallbackIdSet.has(s.id) ? "opacity-100" : "opacity-0")} />
                        <span className="truncate">{s.name}</span>
                        <span className="ml-auto text-xs text-muted-foreground">{s.id}</span>
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

      {error && <p className="text-sm text-destructive mt-3 font-medium">{error}</p>}
    </div>
  )
}
