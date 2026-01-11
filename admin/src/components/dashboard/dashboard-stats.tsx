import { TrendingUp, TrendingDown } from "lucide-react"
import type { FC, SVGProps } from "react"
import { Card, CardContent } from "@/components/ui/card"

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: FC<SVGProps<SVGSVGElement>>
  trend?: {
    value: string
    isPositive: boolean
    label?: string
  }
}

function StatCard({ title, value, subtitle, icon: Icon, trend }: StatCardProps) {
  return (
    <Card className="h-28">
      <CardContent className="px-5 py-3 h-full flex flex-col justify-center gap-1.5">
        <div className="flex items-center justify-between min-w-0">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider truncate">{title}</span>
          <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
        </div>

        <div className="text-left min-w-0">
          <div className="text-3xl font-bold text-foreground leading-none truncate">{value}</div>
        </div>

        <div className="flex justify-start min-w-0">
          {trend ? (
            <span
              className={`text-xs font-medium flex items-center gap-1 min-w-0 whitespace-nowrap ${trend.isPositive ? 'text-green-600' : 'text-red-500'}`}
            >
              {trend.isPositive ? <TrendingUp className="h-3 w-3 shrink-0" /> : <TrendingDown className="h-3 w-3 shrink-0" />}
              <span className="shrink-0">{trend.value}</span>
              <span className="text-muted-foreground font-normal truncate">{trend.label}</span>
            </span>
          ) : subtitle ? (
            <p className="text-xs text-muted-foreground truncate whitespace-nowrap">{subtitle}</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

interface DashboardStatsProps {
  stats: Array<{
    title: string
    value: string
    subtitle?: string
    icon: FC<SVGProps<SVGSVGElement>>
    trend?: {
      value: string
      isPositive: boolean
      label?: string
    }
  }>
}

export function DashboardStats({ stats }: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, i) => (
        <StatCard key={i} {...stat} />
      ))}
    </div>
  )
}