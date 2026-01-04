import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

interface HeaderProps {
  title?: string
  subtitle?: string
  onRefresh?: () => void
  loading?: boolean
  actions?: React.ReactNode
}

export function Header({ title, subtitle, onRefresh, loading, actions }: HeaderProps) {
  return (
    <header className="mb-6">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          {title && <h1 className="text-2xl font-bold tracking-tight">{title}</h1>}
          {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          {onRefresh && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onRefresh}
              disabled={loading}
              className="h-9 w-9"
              title="Refresh"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
          )}
          {actions}
        </div>
      </div>
    </header>
  )
}
