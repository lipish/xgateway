import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface PageContainerProps {
  children: ReactNode
  className?: string
}

export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <div className={cn("max-w-[1400px] mx-auto w-full flex flex-col flex-1 min-h-0 h-full", className)}>
      {children}
    </div>
  )
}
