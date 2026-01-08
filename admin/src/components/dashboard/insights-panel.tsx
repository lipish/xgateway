import { Badge } from "@/components/ui/badge"
import { BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { FC, SVGProps } from "react"

interface InsightItem {
  icon: FC<SVGProps<SVGSVGElement>>
  label: string
  status: string
  statusColor: "green" | "yellow" | "blue"
}

interface InsightsPanelProps {
  insights: InsightItem[]
}

export function InsightsPanel({ insights }: InsightsPanelProps) {
  const getStatusBadgeClasses = (color: InsightItem["statusColor"]) => {
    switch (color) {
      case "green":
        return "bg-green-50 text-green-700 border-green-200"
      case "yellow":
        return "bg-yellow-50 text-yellow-700 border-yellow-200"
      case "blue":
        return "bg-primary/10 text-primary border-primary/20"
    }
  }

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-semibold text-foreground">Insights</h3>
        <BarChart3 className="h-4 w-4 text-muted-foreground" />
      </div>

      <div className="space-y-4">
        {insights.map((item, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-2 w-2 rounded-full bg-green-500" />
              <item.icon className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">{item.label}</span>
            </div>
            <Badge
              variant="outline"
              className={cn("text-xs", getStatusBadgeClasses(item.statusColor))}
            >
              {item.status}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  )
}