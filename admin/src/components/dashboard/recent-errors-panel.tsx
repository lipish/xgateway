import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, XCircle, Clock } from "lucide-react"

export function RecentErrorsPanel() {
  const errors = [
    {
      time: "2 min ago",
      service: "OpenAI GPT-4",
      error: "Rate limit exceeded",
      type: "warning",
      icon: AlertTriangle,
    },
    {
      time: "15 min ago",
      service: "Anthropic Claude",
      error: "Connection timeout",
      type: "error",
      icon: Clock,
    },
    {
      time: "1 hour ago",
      service: "Google Gemini",
      error: "Invalid API key",
      type: "error",
      icon: XCircle,
    },
  ]

  return (
    <Card className="rounded-xl border bg-card">
      <CardHeader className="px-6 pb-2">
        <CardTitle className="text-lg font-semibold">Recent Errors</CardTitle>
        <p className="text-xs text-muted-foreground">Latest error logs</p>
      </CardHeader>
      <CardContent className="px-6 pb-3">
        <div className="space-y-1.5">
          {errors.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <div className="text-sm">No recent errors</div>
            </div>
          ) : (
            errors.map((error, index) => (
              <div
                key={index}
                className="flex items-start gap-2.5 p-2.5 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <error.icon
                  className={`h-4 w-4 mt-0.5 shrink-0 ${
                    error.type === "error" ? "text-red-500" : "text-yellow-500"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-sm font-medium text-foreground truncate">
                      {error.service}
                    </span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {error.time}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{error.error}</p>
                </div>
              </div>
            ))
          )}
          <div className="flex items-center justify-between pt-1.5 border-t">
            <div className="text-xs text-muted-foreground">Error Rate</div>
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              2.4%
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}