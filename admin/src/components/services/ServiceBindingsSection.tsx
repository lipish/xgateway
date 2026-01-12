import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { t } from "@/lib/i18n"
import type { Provider } from "./types"

interface ServiceBindingsSectionProps {
  providers: Provider[]
  boundProviderIdSet: Set<number>
  bindingBusyId: number | null
  onToggleBinding: (providerId: number, nextBound: boolean) => void
  error: string | null
}

export function ServiceBindingsSection({
  providers,
  boundProviderIdSet,
  bindingBusyId,
  onToggleBinding,
  error,
}: ServiceBindingsSectionProps) {
  const selectedNames = providers.filter((p) => boundProviderIdSet.has(p.id)).map((p) => p.name)

  return (
    <div className="rounded-lg border bg-background p-5">
      <div className="text-sm font-semibold">{t("services.bindings")}</div>
      <div className="mt-3">
        <Popover modal={false}>
          <PopoverTrigger asChild>
            <Button variant="outline" role="combobox" className="h-10 w-full justify-between font-normal" type="button">
              <span className="flex-1 truncate text-left">
                {selectedNames.length > 0 ? selectedNames.join(", ") : t("services.bindingsPlaceholder")}
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

      {error && <p className="text-sm text-destructive mt-3 font-medium">{error}</p>}
    </div>
  )
}
