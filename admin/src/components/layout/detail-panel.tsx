import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface DetailPanelProps {
  children: ReactNode
  className?: string
  contentClassName?: string
  scroll?: boolean
}

export function DetailPanel({ children, className, contentClassName, scroll = true }: DetailPanelProps) {
  return (
    <div className={cn("flex-1 h-full flex flex-col min-w-0", className)}>
      <div
        className={cn(
          "flex-1 h-full p-6 rounded-lg border border-border bg-white",
          scroll ? "overflow-y-auto" : "overflow-hidden",
          contentClassName
        )}
      >
        {children}
      </div>
    </div>
  )
}
