import { TrendingUp, Key, Clock, TrendingDown, Server } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
    label?: string;
  };
}

function StatCard({ title, value, description, icon, trend }: StatCardProps) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <div className="text-3xl font-bold text-foreground">{value}</div>
      <div className="mt-1">
        {trend ? (
          <span className={`text-xs font-medium flex items-center gap-1 ${trend.isPositive ? 'text-green-600' : 'text-red-500'}`}>
            {trend.isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {trend.value} {trend.label && <span className="text-muted-foreground font-normal">{trend.label}</span>}
          </span>
        ) : description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
    </div>
  );
}

interface DashboardStatsProps {
  totalRequests: number;
  activeServices: number;
  apiKeys: number;
  avgLatency: string;
}

export function DashboardStats({ totalRequests, activeServices, apiKeys, avgLatency }: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Total Requests"
        value={totalRequests.toLocaleString()}
        icon={<TrendingUp className="h-5 w-5" />}
        trend={{ value: "12%", isPositive: true, label: "vs last hour" }}
      />
      <StatCard
        title="Active Services"
        value={activeServices}
        description="Model endpoints"
        icon={<Server className="h-5 w-5" />}
      />
      <StatCard
        title="API Keys"
        value={apiKeys}
        description="Active keys"
        icon={<Key className="h-5 w-5" />}
      />
      <StatCard
        title="Avg Latency"
        value={avgLatency}
        icon={<Clock className="h-5 w-5" />}
        trend={{ value: "5%", isPositive: true, label: "vs last hour" }}
      />
    </div>
  );
}
