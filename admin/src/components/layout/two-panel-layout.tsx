import type { ReactNode } from "react"

interface TwoPanelLayoutProps {
  left: ReactNode
  right: ReactNode
  className?: string
}

export function TwoPanelLayout({ left, right, className }: TwoPanelLayoutProps) {
  return (
    <div className={className || "flex flex-row gap-6 flex-1 min-h-0"}>
      {left}
      {right}
    </div>
  )
}
