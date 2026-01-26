import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select } from "@/components/ui/select"
import { t } from "@/lib/i18n"
import { Check, ChevronsUpDown } from "lucide-react"
import type { Service } from "./types"

interface ApiKeyEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  form: {
    name: string
    scope: string
    service_ids: string[]
  }
  onFormChange: (next: ApiKeyEditDialogProps["form"]) => void
  services: Service[]
  error: string | null
  onSave: () => void
  saving: boolean
}

export function ApiKeyEditDialog({ open, onOpenChange, form, onFormChange, services, error, onSave, saving }: ApiKeyEditDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden border">
        <div className="p-6 space-y-5">
          <DialogHeader className="space-y-1.5 mb-0">
            <DialogTitle className="text-xl font-semibold tracking-tight">{t("common.edit") || t("providers.edit") || "Edit"}</DialogTitle>
            <DialogDescription className="text-purple-600 font-medium pb-2">{t("apiKeys.listDesc")}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name" className="text-sm font-medium">
                {t("apiKeys.name")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-name"
                value={form.name}
                onChange={(e) => onFormChange({ ...form, name: e.target.value })}
                placeholder="e.g. My App"
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">{t("apiKeys.scope")}</Label>
              <Select
                value={form.scope}
                onChange={(value) => onFormChange({ ...form, scope: value, service_ids: value === "global" ? [] : form.service_ids })}
                options={[
                  { value: "global", label: t("apiKeys.global") },
                  { value: "instance", label: t("apiKeys.instance") },
                ]}
                triggerClassName="h-10"
              />
            </div>

            {form.scope === "instance" && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t("apiKeys.selectService") || t("apiKeys.selectInstance")}</Label>
                <Popover modal={false}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="h-10 w-full justify-between font-normal" type="button">
                      <span className="flex-1 truncate text-left">
                        {form.service_ids.length > 0
                          ? services
                            .filter((service) => form.service_ids.includes(service.id))
                            .map((service) => service.name)
                            .join(", ")
                          : t("services.bindingsPlaceholder")}
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
                          {services.map((service) => {
                            const checked = form.service_ids.includes(service.id)
                            return (
                              <CommandItem
                                key={service.id}
                                value={`${service.name} ${service.id}`}
                                onSelect={() => {
                                  onFormChange({ ...form, service_ids: [service.id] })
                                }}
                              >
                                <Check className={checked ? "mr-2 h-4 w-4 opacity-100" : "mr-2 h-4 w-4 opacity-0"} />
                                <span className="truncate">{service.name}</span>
                                <span className="ml-auto text-xs text-muted-foreground">{service.id}</span>
                              </CommandItem>
                            )
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            )}

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
