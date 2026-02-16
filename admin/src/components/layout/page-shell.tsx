import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface PageShellProps {
  children: ReactNode
  className?: string
}

export function PageShell({ children, className }: PageShellProps) {
  return (
    <div className={cn("flex-1 min-h-0 flex flex-col page-transition p-6 scrollbar-hide", className)}>
      {children}
    </div>
  )
}
