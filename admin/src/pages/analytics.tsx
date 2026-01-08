import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { t } from "@/lib/i18n"
import {
  Activity,
  Clock,
  Zap,
  TrendingUp,
  TrendingDown,
  MoreHorizontal,
  AlertCircle,
  BarChart3,
  Search
} from "lucide-react"
import { PageHeader } from "@/components/layout/page-header"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import {
  Select,
} from "@/components/ui/select"

export function AnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState("24h")

  useEffect(() => {
    // Initial loading simulation
    const timer = setTimeout(() => setLoading(false), 800)
    return () => clearTimeout(timer)
  }, [])

  const stats = [
    { label: "TOTAL REQUESTS", value: "15,847", change: "+12%", trend: "up", icon: Activity },
    { label: "SUCCESS RATE", value: "96%", change: "+2%", trend: "up", icon: TrendingUp },
    { label: "AVG LATENCY", value: "245ms", change: "-5%", trend: "down", icon: Clock },
    { label: "TOKENS USED", value: "1,847,293", change: "+18%", trend: "up", icon: Zap },
  ]

  const models = [
    { name: "GPT-4 Turbo", tokens: "112K tokens", requests: "1,046 requests", rank: 1, color: "bg-purple-100 text-purple-600" },
    { name: "GPT-4o", tokens: "198K tokens", requests: "3,833 requests", rank: 2, color: "bg-blue-100 text-blue-600" },
    { name: "Claude 3 Sonnet", tokens: "443K tokens", requests: "1,017 requests", rank: 3, color: "bg-orange-100 text-orange-600" },
    { name: "Gemini Pro", tokens: "272K tokens", requests: "8,887 requests", rank: 4, color: "bg-teal-100 text-teal-600" },
  ]

  const errors = [
    { type: "Error", model: "gpt-4-turbo", time: "09:46 AM", status: "destructive" },
    { type: "Error", model: "claude-3-sonnet", time: "09:45 AM", status: "destructive" },
    { type: "Error", model: "gemini-pro", time: "09:38 AM", status: "destructive" },
    { type: "Rate Limited", model: "claude-3-sonnet", time: "09:32 AM", status: "warning" },
  ]

  const latencyData = [
    { model: "gpt-4o", p50: 245, p95: 1200, p99: 2100 },
    { model: "claude-3-sonnet", p50: 320, p95: 1500, p99: 2800 },
    { model: "gemini-pro", p50: 180, p95: 900, p99: 1600 },
    { model: "mistral-large", p50: 290, p95: 1100, p99: 1900 },
  ]

  return (
    <div className="flex-1 min-h-0 flex flex-col page-transition overflow-y-auto p-6 scrollbar-hide">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Analytics</h2>
          <p className="text-muted-foreground text-sm">Monitor gateway performance and usage patterns</p>
        </div>
        <Select
          value={timeRange}
          onChange={setTimeRange}
          options={[
            { value: "1h", label: "Last hour" },
            { value: "24h", label: "Last 24h" },
            { value: "7d", label: "Last 7 days" },
            { value: "30d", label: "Last 30 days" },
          ]}
          triggerClassName="w-[140px] h-9"
        />
      </div>

      <div className="flex-1 space-y-6 max-w-[1400px] mx-auto w-full">
        {/* Top Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, i) => (
            <Card key={i} className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{stat.label}</CardTitle>
                <div className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center">
                  <stat.icon className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight">{stat.value}</div>
                <div className="mt-1 flex items-center gap-1">
                  {stat.trend === "up" ? (
                    <TrendingUp className="h-3 w-3 text-emerald-500" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-rose-500" />
                  )}
                  <span className={cn("text-[10px] font-bold", stat.trend === "up" ? "text-emerald-500" : "text-rose-500")}>
                    {stat.change}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-medium ml-1">vs yesterday</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Request Volume Chart */}
          <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-sm font-semibold tracking-tight">Request Volume</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px] w-full flex items-end justify-between gap-1 px-2 pt-4">
                {[40, 60, 45, 30, 70, 50, 20, 35, 45, 80, 75, 55, 30, 20, 65, 55, 25, 40, 45, 10, 35, 30, 20, 15].map((h, i) => (
                  <div key={i} className="flex-1 flex flex-col justify-end group">
                    <div
                      className="w-full bg-purple-600/20 group-hover:bg-purple-600/40 transition-colors rounded-sm"
                      style={{ height: `${h}%` }}
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-4 text-[10px] font-medium text-muted-foreground px-1">
                <span>00:00</span>
                <span>06:00</span>
                <span>12:00</span>
                <span>18:00</span>
                <span>23:00</span>
              </div>
            </CardContent>
          </Card>

          {/* Latency Distribution */}
          <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold tracking-tight">Latency Distribution</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {latencyData.map((item, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-bold">
                    <span className="text-muted-foreground uppercase">{item.model}</span>
                    <span className="text-muted-foreground">p50: {item.p50}ms</span>
                  </div>
                  <div className="h-2 w-full bg-muted/30 rounded-full overflow-hidden flex">
                    <div className="h-full bg-blue-500" style={{ width: '30%' }} />
                    <div className="h-full bg-purple-500" style={{ width: '45%' }} />
                    <div className="h-full bg-teal-500" style={{ width: '15%' }} />
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-center gap-6 pt-2">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">p50</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-purple-500" />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">p95</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-teal-500" />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">p99</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Top Models by Usage */}
          <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-sm font-semibold tracking-tight">Top Models by Usage</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/50">
                {models.map((model, i) => (
                  <div key={i} className="flex items-center justify-between px-6 py-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-bold text-muted-foreground w-4">{model.rank}</span>
                      <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center font-bold text-xs", model.color)}>
                        {model.name[0]}
                      </div>
                      <div>
                        <div className="text-sm font-semibold">{model.name}</div>
                        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{model.requests}</div>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-muted text-[10px] font-bold uppercase tracking-wider border-none px-2 h-6">
                      {model.tokens}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Errors */}
          <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold tracking-tight">Recent Errors</CardTitle>
              <Badge variant="destructive" className="h-5 text-[10px] font-bold uppercase tracking-wider px-2">4 errors</Badge>
            </CardHeader>
            <CardContent className="p-0 flex-1">
              <div className="divide-y divide-border/50">
                {errors.map((error, i) => (
                  <div key={i} className="flex items-center justify-between px-6 py-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={error.status === "destructive" ? "destructive" : "outline"}
                        className={cn(
                          "h-5 text-[9px] font-bold uppercase tracking-wider border-none px-2",
                          error.status === "warning" && "bg-amber-100 text-amber-600"
                        )}
                      >
                        {error.type}
                      </Badge>
                      <span className="text-sm font-semibold tabular-nums">{error.model}</span>
                    </div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{error.time}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}