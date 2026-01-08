import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity } from "lucide-react"

export function ResponseTimeChart() {
  const services = [
    { name: "OpenAI GPT-4", latency: 245, color: "bg-blue-500" },
    { name: "Anthropic Claude", latency: 180, color: "bg-purple-500" },
    { name: "Google Gemini", latency: 320, color: "bg-green-500" },
    { name: "Cohere", latency: 165, color: "bg-orange-500" },
  ]

  const maxLatency = Math.max(...services.map(s => s.latency))

  return (
    <Card className="rounded-xl border bg-card">
      <CardHeader className="px-6 pb-2">
        <CardTitle className="text-lg font-semibold">Latency Distribution</CardTitle>
        <p className="text-xs text-muted-foreground">Average latency by service (ms)</p>
      </CardHeader>
      <CardContent className="px-6 pb-3">
        <div className="space-y-1.5">
          {services.map((service, index) => {
            const width = (service.latency / maxLatency) * 100
            return (
              <div key={index} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{service.name}</span>
                  <span className="text-sm font-bold text-foreground">{service.latency}ms</span>
                </div>
                <div className="relative h-2.5 w-full bg-secondary rounded-full overflow-hidden">
                  <div
                    className={`h-full ${service.color} transition-all rounded-full`}
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            )
          })}
          <div className="flex items-center justify-center gap-2 pt-1.5 border-t">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <div className="text-center">
              <div className="text-xl font-bold text-foreground">
                {Math.round(services.reduce((acc, curr) => acc + curr.latency, 0) / services.length)}ms
              </div>
              <div className="text-xs text-muted-foreground">Average Latency</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}