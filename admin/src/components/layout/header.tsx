import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"

interface HeaderProps {
  title: string
  description?: string
  onRefresh?: () => void
  actions?: React.ReactNode
}

export function Header({ title, description, onRefresh, actions }: HeaderProps) {
  return (
    <header className="sticky top-0 z-10 h-14 border-b bg-background">
      <div className="flex h-full items-center gap-4 px-6 max-w-[1600px] mx-auto">
        <div className="flex-1">
          <h1 className="text-lg font-semibold">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="mr-2 h-4 w-4" />
              刷新
            </Button>
          )}
          {actions}
        </div>
      </div>
    </header>
  )
}
