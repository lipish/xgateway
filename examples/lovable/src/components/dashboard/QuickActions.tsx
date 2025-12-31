import { TrendingUp, Settings, LineChart, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickAction {
  icon: React.ElementType;
  label: string;
  onClick?: () => void;
}

const actions: QuickAction[] = [
  { icon: TrendingUp, label: "测试所有模型服务商" },
  { icon: Settings, label: "批量编辑配置" },
  { icon: LineChart, label: "查看性能报告" },
  { icon: Trash2, label: "清理无效模型服务商" },
];

export function QuickActions() {
  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-5 animate-fade-in" style={{ animationDelay: "250ms" }}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground">快速操作</h3>
        <p className="text-sm text-muted-foreground">加载中...</p>
      </div>

      <div className="space-y-2">
        {actions.map((action, idx) => (
          <button
            key={action.label}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-lg",
              "bg-secondary/50 hover:bg-secondary text-foreground",
              "transition-all duration-200 hover:translate-x-1",
              "animate-slide-in"
            )}
            style={{ animationDelay: `${350 + idx * 50}ms` }}
          >
            <action.icon className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
