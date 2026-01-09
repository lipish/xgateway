import { TrendingUp, TrendingDown } from "lucide-react"
import type { FC, SVGProps } from "react"

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
    <div className="rounded-xl border bg-card p-4 h-32 flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</span>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>

      <div className="text-left -mt-3">
        <div className="text-2xl font-bold text-foreground">{value}</div>
      </div>

      <div className="flex justify-start -mt-3">
        {trend ? (
          <span className={`text-xs font-medium flex items-center gap-1 ${trend.isPositive ? 'text-green-600' : 'text-red-500'}`}>
            {trend.isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {trend.value} <span className="text-muted-foreground font-normal">{trend.label}</span>
          </span>
        ) : subtitle ? (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
    </div>
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