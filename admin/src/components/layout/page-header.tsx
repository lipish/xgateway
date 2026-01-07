import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { t } from "@/lib/i18n"

interface PageHeaderProps {
    title?: string
    subtitle?: React.ReactNode
    onRefresh?: () => void
    loading?: boolean
    action?: React.ReactNode
}

export function PageHeader({ title, subtitle, onRefresh, loading, action }: PageHeaderProps) {
    return (
        <div className="mb-8 flex flex-col gap-1 md:flex-row md:items-center md:justify-between max-w-[1400px] mx-auto w-full">
            <div className="space-y-1">
                {title && (
                    <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                        {title}
                    </h1>
                )}
                {subtitle && (
                    <p className="text-muted-foreground">
                        {subtitle}
                    </p>
                )}
            </div>
            <div className="flex items-center gap-2">
                {onRefresh && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onRefresh}
                        disabled={loading}
                    >
                        <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
                        {t('common.refresh')}
                    </Button>
                )}
                {action}
            </div>
        </div>
    )
}