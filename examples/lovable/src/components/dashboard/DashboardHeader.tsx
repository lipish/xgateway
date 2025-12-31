import { Button } from "@/components/ui/button";
import { RefreshCw, Plus, PanelLeft } from "lucide-react";

export function DashboardHeader() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <button className="p-2 hover:bg-secondary rounded-lg transition-colors lg:hidden">
          <PanelLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">工作台</h1>
          <p className="text-sm text-muted-foreground">XGateway 多模型服务商 AI 网关概览</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" className="gap-2">
          <RefreshCw className="w-4 h-4" />
          刷新
        </Button>
        <Button size="sm" className="gap-2 gradient-primary border-0 shadow-glow hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" />
          添加模型服务商
        </Button>
      </div>
    </div>
  );
}
