import { Zap, Activity, Server, Database, Circle, Clock, BarChart3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface InsightItem {
  icon: React.ReactNode;
  label: string;
  status: string;
  statusColor: "green" | "yellow" | "blue";
}

interface InsightsPanelProps {
  activeServices: number;
}

export function InsightsPanel({ activeServices }: InsightsPanelProps) {
  const insights: InsightItem[] = [
    {
      icon: <Zap className="h-4 w-4 text-primary" />,
      label: "System Load",
      status: "NORMAL",
      statusColor: "green",
    },
    {
      icon: <Activity className="h-4 w-4 text-primary" />,
      label: "Response Speed",
      status: "GOOD",
      statusColor: "green",
    },
    {
      icon: <Server className="h-4 w-4 text-muted-foreground" />,
      label: "Model Service Pool",
      status: `${activeServices} ACTIVE`,
      statusColor: "blue",
    },
    {
      icon: <Database className="h-4 w-4 text-muted-foreground" />,
      label: "Database",
      status: "CONNECTED",
      statusColor: "green",
    },
    {
      icon: <Circle className="h-4 w-4 text-muted-foreground" />,
      label: "Health Check",
      status: "PASSED",
      statusColor: "green",
    },
    {
      icon: <Clock className="h-4 w-4 text-muted-foreground" />,
      label: "Uptime",
      status: "STABLE",
      statusColor: "green",
    },
  ];

  const getStatusBadgeClasses = (color: InsightItem["statusColor"]) => {
    switch (color) {
      case "green":
        return "bg-green-100 text-green-700 border-green-200";
      case "yellow":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "blue":
        return "bg-primary/10 text-primary border-primary/20";
    }
  };

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">Insights</h3>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <BarChart3 className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-4">
        {insights.map((item, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-2 w-2 rounded-full bg-green-500" />
              {item.icon}
              <span className="text-sm font-medium text-foreground">{item.label}</span>
            </div>
            <Badge
              variant="outline"
              className={`text-xs font-medium ${getStatusBadgeClasses(item.statusColor)}`}
            >
              {item.status}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
