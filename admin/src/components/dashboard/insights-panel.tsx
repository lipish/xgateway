import { Badge } from "@/components/ui/badge"
import { BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { FC, SVGProps } from "react"

interface ModelUsage {
  model: string
  requests: number
  tokens: number
}

interface InsightsPanelProps {
  topModels?: ModelUsage[]
}

export function InsightsPanel({ topModels = [] }: InsightsPanelProps) {
  const insights = topModels.slice(0, 4).map((model, index) => ({
    label: model.model,
    value: `${model.requests} requests`,
    percentage: ((model.tokens / (topModels.reduce((sum, m) => sum + m.tokens, 0) || 1)) * 100).toFixed(1) + '%'
  }))

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-semibold text-foreground">Top Models</h3>
        <BarChart3 className="h-4 w-4 text-muted-foreground" />
      </div>

      <div className="space-y-4">
        {insights.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <div className="text-sm">No model data available</div>
          </div>
        ) : (
          insights.map((item, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={`flex h-2 w-2 rounded-full ${
                  index === 0 ? 'bg-purple-500' :
                  index === 1 ? 'bg-blue-500' :
                  index === 2 ? 'bg-orange-500' : 'bg-teal-500'
                }`} />
                <span className="text-sm font-medium text-foreground truncate">{item.label}</span>
              </div>
              <div className="text-right">
                <div className="text-xs font-medium text-foreground">{item.value}</div>
                <div className="text-xs text-muted-foreground">{item.percentage}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}