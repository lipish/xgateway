import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { cn } from "@/lib/utils"
import { ChevronDown, Check } from "lucide-react"
import { t } from "@/lib/i18n"

interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  value?: string
  onChange?: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  className?: string
  triggerClassName?: string
  icon?: React.ReactNode
  id?: string
  menuSide?: "top" | "bottom"
  emptyText?: string
}

const Select = ({
  value,
  onChange,
  options,
  placeholder = t('common.selectPlaceholder') || "Please select...",
  className,
  triggerClassName,
  icon,
  id,
  menuSide = "bottom",
  emptyText,
}: SelectProps) => {
  const selectedOption = options.find(opt => opt.value === value)

  return (
    <SelectPrimitive.Root value={value} onValueChange={onChange}>
      <div className={cn("relative", className)}>
        <SelectPrimitive.Trigger
          id={id}
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            triggerClassName
          )}
        >
          <div className="flex min-w-0 items-center gap-1">
            {icon}
            <SelectPrimitive.Value
              placeholder={placeholder}
              className={cn("truncate", selectedOption ? "" : "text-muted-foreground")}
            >
              {selectedOption?.label}
            </SelectPrimitive.Value>
          </div>
          <SelectPrimitive.Icon asChild>
            <ChevronDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
      </div>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          side={menuSide}
          position="popper"
          className="z-[60] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-md border bg-popover shadow-md"
        >
          <SelectPrimitive.Viewport className="max-h-60 p-1">
            {options.length === 0 ? (
              <div className="px-2 py-2 text-sm text-muted-foreground">
                {emptyText || t("common.empty") || "No options"}
              </div>
            ) : (
              options.map((option) => (
                <SelectPrimitive.Item
                  key={option.value}
                  value={option.value}
                  className="relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground"
                >
                  <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator className="absolute right-2 inline-flex items-center">
                    <Check className="h-4 w-4" />
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              ))
            )}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}

export { Select }
export type { SelectOption }
