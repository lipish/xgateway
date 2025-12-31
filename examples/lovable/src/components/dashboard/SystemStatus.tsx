import { cn } from "@/lib/utils";

interface StatusItem {
  name: string;
  status: "online" | "offline" | "warning";
  detail: string;
}

const statusItems: StatusItem[] = [
  { name: "API 网关", status: "online", detail: "运行正常 (端口 3000)" },
  { name: "Provider 池", status: "online", detail: "4 个可用" },
];

const statusColors = {
  online: "bg-success",
  offline: "bg-destructive",
  warning: "bg-warning",
};

export function SystemStatus() {
  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-5 animate-fade-in" style={{ animationDelay: "300ms" }}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground">系统状态</h3>
        <p className="text-sm text-muted-foreground">实时监控系统运行状态</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {statusItems.map((item, idx) => (
          <div
            key={item.name}
            className={cn(
              "flex items-center gap-4 p-4 rounded-lg border border-border",
              "hover:bg-secondary/30 transition-colors animate-scale-in"
            )}
            style={{ animationDelay: `${400 + idx * 100}ms` }}
          >
            <div className={cn("w-3 h-3 rounded-full animate-pulse", statusColors[item.status])} />
            <div>
              <p className="font-medium text-foreground">{item.name}</p>
              <p className="text-sm text-muted-foreground">{item.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
