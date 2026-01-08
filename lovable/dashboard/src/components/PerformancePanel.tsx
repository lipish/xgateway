import { Progress } from "@/components/ui/progress";
import { Zap } from "lucide-react";

interface PerformancePanelProps {
  successRate: number;
  requestsToday: number;
  tokensUsed: number;
  failedRequests: number;
}

export function PerformancePanel({
  successRate,
  requestsToday,
  tokensUsed,
  failedRequests,
}: PerformancePanelProps) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <h3 className="text-lg font-semibold text-foreground mb-5">Performance</h3>

      <div className="space-y-5">
        {/* Success Rate */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Success Rate</span>
            <span className="text-lg font-bold text-foreground">{successRate}%</span>
          </div>
          <Progress value={successRate} className="h-2" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              Requests Today
            </div>
            <div className="text-2xl font-bold text-foreground">
              {requestsToday.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              Tokens Used
            </div>
            <div className="text-2xl font-bold text-foreground">
              {tokensUsed.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Failed Requests */}
        <div className="flex items-center gap-2 text-red-500">
          <Zap className="h-4 w-4" />
          <span className="text-sm font-medium">{failedRequests} failed requests</span>
        </div>
      </div>
    </div>
  );
}
