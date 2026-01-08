import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp } from "lucide-react"

export function AnalyticsChart() {
  const data = [
    { time: "00:00", requests: 45 },
    { time: "02:00", requests: 32 },
    { time: "04:00", requests: 28 },
    { time: "06:00", requests: 58 },
    { time: "08:00", requests: 142 },
    { time: "10:00", requests: 186 },
    { time: "12:00", requests: 210 },
    { time: "14:00", requests: 195 },
    { time: "16:00", requests: 168 },
    { time: "18:00", requests: 124 },
    { time: "20:00", requests: 89 },
    { time: "22:00", requests: 62 },
  ]

  const maxValue = Math.max(...data.map(d => d.requests))

  return (
    <Card className="rounded-xl border bg-card">
      <CardHeader className="px-6 pb-2">
        <CardTitle className="text-lg font-semibold">Request Volume</CardTitle>
        <p className="text-xs text-muted-foreground">Requests by time of day</p>
      </CardHeader>
      <CardContent className="px-6 pb-3">
        <div className="space-y-1.5">
          <div className="flex items-end justify-between gap-1 h-32">
            {data.map((item, index) => {
              const height = (item.requests / maxValue) * 100
              return (
                <div key={index} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className="w-full flex items-end justify-center h-24">
                    <div
                      className="w-full bg-gradient-to-t from-primary to-primary/60 rounded-t transition-all hover:opacity-80 cursor-pointer"
                      style={{ height: `${height}%` }}
                      title={`${item.time}: ${item.requests} requests`}
                    />
                  </div>
                  <span className="text-[9px] text-muted-foreground">{item.time}</span>
                </div>
              )
            })}
          </div>
          <div className="flex items-center justify-between pt-1.5 border-t">
            <div>
              <div className="text-xs text-muted-foreground">Total Today</div>
              <div className="text-xl font-bold text-foreground">
                {data.reduce((acc, curr) => acc + curr.requests, 0).toLocaleString()}
              </div>
            </div>
            <div className="flex items-center gap-2 text-green-600">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm font-medium">+12.5%</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}