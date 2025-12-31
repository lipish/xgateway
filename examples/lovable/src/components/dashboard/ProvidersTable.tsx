import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { TrendingUp, ExternalLink, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

interface Provider {
  id: string;
  name: string;
  type: string;
  status: "active" | "inactive";
  priority: number;
  createdAt: string;
  enabled: boolean;
}

const providers: Provider[] = [
  { id: "1", name: "qwen3-ali", type: "aliyun", status: "active", priority: 10, createdAt: "12/13/2025", enabled: true },
  { id: "2", name: "kimi-k2", type: "moonshot", status: "active", priority: 10, createdAt: "12/23/2025", enabled: true },
  { id: "3", name: "MiniMax-M2", type: "minimax", status: "active", priority: 10, createdAt: "12/23/2025", enabled: true },
  { id: "4", name: "GLM-4.6", type: "zhipu", status: "active", priority: 10, createdAt: "12/23/2025", enabled: true },
];

const typeColors: Record<string, string> = {
  aliyun: "bg-purple-100 text-purple-700 border-purple-200",
  moonshot: "bg-amber-100 text-amber-700 border-amber-200",
  minimax: "bg-blue-100 text-blue-700 border-blue-200",
  zhipu: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

export function ProvidersTable() {
  // 只显示前3个
  const displayProviders = providers.slice(0, 3);

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm animate-fade-in h-full flex flex-col" style={{ animationDelay: "200ms" }}>
      <div className="flex items-center justify-between p-5 border-b border-border">
        <div>
          <h3 className="text-lg font-semibold text-foreground">最近的 Providers</h3>
          <p className="text-sm text-muted-foreground">管理您的 AI 服务提供商</p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to="/providers" className="gap-1">
            查看全部
            <ChevronRight className="w-4 h-4" />
          </Link>
        </Button>
      </div>

      <div className="overflow-x-auto flex-1">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">名称</th>
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">类型</th>
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">状态</th>
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">优先级</th>
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {displayProviders.map((provider, idx) => (
              <tr
                key={provider.id}
                className="hover:bg-secondary/50 transition-colors animate-slide-in"
                style={{ animationDelay: `${300 + idx * 50}ms` }}
              >
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                    <span className="font-medium text-foreground">{provider.name}</span>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <Badge variant="outline" className={typeColors[provider.type]}>
                    {provider.type}
                  </Badge>
                </td>
                <td className="px-5 py-4">
                  <Badge className="bg-primary/10 text-primary border-0">
                    启用
                  </Badge>
                </td>
                <td className="px-5 py-4 text-muted-foreground">{provider.priority}</td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <Switch checked={provider.enabled} />
                    <button className="p-1.5 hover:bg-secondary rounded-md transition-colors">
                      <TrendingUp className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <button className="p-1.5 hover:bg-secondary rounded-md transition-colors">
                      <ExternalLink className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
