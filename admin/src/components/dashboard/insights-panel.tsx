import { Badge } from "@/components/ui/badge"
import { BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { FC, SVGProps } from "react"

interface LogEntry {
  id: number
  provider_id: number
  provider_name: string
  model: string
  status: string
  latency_ms: number
  tokens_used: number
  error_message: string | null
  request_type: string
  request_content: string
  response_content: string | null
  created_at: string
}

interface InsightsPanelProps {
  logs?: LogEntry[]
}

export function InsightsPanel({ logs = [] }: InsightsPanelProps) {
  // Group logs by model and calculate metrics
  const modelStats = logs.reduce((acc, log) => {
    const modelName = log.model || 'unknown'
    if (!acc[modelName]) {
      acc[modelName] = {
        model: modelName,
        requests: 0,
        tokens: 0
      }
    }
    acc[modelName].requests++
    acc[modelName].tokens += log.tokens_used
    return acc
  }, {} as Record<string, { model: string; requests: number; tokens: number }>)

  // Convert to array and sort by requests
  const topModels = Object.values(modelStats)
    .sort((a, b) => b.requests - a.requests)
    .slice(0, 4)

  const totalTokens = topModels.reduce((sum, model) => sum + model.tokens, 0)

  const insights = topModels.map((model, index) => ({
    label: model.model,
    value: `${model.requests} requests`,
    percentage: totalTokens > 0 ? `${((model.tokens / totalTokens) * 100).toFixed(1)}%` : '0%'
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