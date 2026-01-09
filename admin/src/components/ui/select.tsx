import * as React from "react"
import { useState, useRef, useEffect } from "react"
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
}

const Select = ({ value, onChange, options, placeholder = t('common.selectPlaceholder') || "Please select...", className, triggerClassName, icon, id }: SelectProps) => {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find(opt => opt.value === value)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        id={id}
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          triggerClassName
        )}
      >
        <div className="flex items-center gap-1 flex-1 min-w-0">
          {icon}
          <span className={cn("whitespace-nowrap truncate", selectedOption ? "" : "text-muted-foreground")}>
            {selectedOption?.label || placeholder}
          </span>
        </div>
        <ChevronDown className={cn("ml-auto h-3.5 w-3.5 opacity-50 transition-transform shrink-0", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
          <div className="max-h-60 overflow-auto p-1">
            {options.map((option) => (
              <div
                key={option.value}
                onClick={() => {
                  onChange?.(option.value)
                  setOpen(false)
                }}
                className={cn(
                  "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                  value === option.value && "bg-accent"
                )}
              >
                <span className="flex-1">{option.label}</span>
                {value === option.value && <Check className="h-4 w-4" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export { Select }
export type { SelectOption }