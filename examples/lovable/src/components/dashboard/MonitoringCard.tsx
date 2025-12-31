import { Activity, Zap, Shield, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricItem {
  icon: React.ElementType;
  label: string;
  value: string;
  status: "good" | "warning" | "error";
  trend?: string;
}

const metrics: MetricItem[] = [
  { icon: Activity, label: "系统负载", value: "23%", status: "good", trend: "↓ 5%" },
  { icon: Zap, label: "响应速度", value: "128ms", status: "good", trend: "↑ 12%" },
  { icon: Shield, label: "成功率", value: "99.8%", status: "good" },
  { icon: BarChart3, label: "并发连接", value: "42", status: "good" },
];

const statusColors = {
  good: "bg-emerald-500",
  warning: "bg-amber-500",
  error: "bg-red-500",
};

export function MonitoringCard() {
  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-5 animate-fade-in h-full flex flex-col" style={{ animationDelay: "250ms" }}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground">综合监控</h3>
        <p className="text-sm text-muted-foreground">实时系统状态概览</p>
      </div>

      <div className="space-y-3 flex-1">
        {metrics.map((metric, idx) => (
          <div
            key={metric.label}
            className={cn(
              "flex items-center justify-between px-4 py-3 rounded-lg",
              "bg-secondary/50",
              "animate-slide-in"
            )}
            style={{ animationDelay: `${350 + idx * 50}ms` }}
          >
            <div className="flex items-center gap-3">
              <div className={cn("w-2 h-2 rounded-full", statusColors[metric.status])} />
              <metric.icon className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">{metric.label}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">{metric.value}</span>
              {metric.trend && (
                <span className={cn(
                  "text-xs",
                  metric.trend.startsWith("↓") ? "text-emerald-600" : "text-amber-600"
                )}>
                  {metric.trend}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
