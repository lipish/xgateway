import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle } from "lucide-react";

interface RequestItem {
  id: string;
  model: string;
  provider: string;
  time: string;
  latency: string;
  tokens: number;
  status: "success" | "error";
}

interface RecentRequestsTableProps {
  requests: RequestItem[];
}

export function RecentRequestsTable({ requests }: RecentRequestsTableProps) {
  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center justify-between p-5 border-b">
        <h3 className="text-lg font-semibold text-foreground">Recent Requests</h3>
        <Badge variant="outline" className="text-xs font-medium">
          live
        </Badge>
      </div>

      <div className="divide-y">
        {requests.map((request) => (
          <div key={request.id} className="flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-3">
              {request.status === "success" ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-500" />
              )}
              <div>
                <div className="font-medium text-foreground">{request.model}</div>
                <div className="text-xs text-muted-foreground">
                  {request.provider} · {request.time}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-medium text-foreground">{request.latency}</div>
              <div className="text-xs text-muted-foreground">{request.tokens.toLocaleString()} tokens</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Mock data generator
export const mockRequests: RequestItem[] = [
  { id: "1", model: "gpt-4-turbo", provider: "Production OpenAI", time: "09:50 AM", latency: "244ms", tokens: 1616, status: "success" },
  { id: "2", model: "claude-3-sonnet", provider: "Production OpenAI", time: "09:49 AM", latency: "518ms", tokens: 1530, status: "success" },
  { id: "3", model: "claude-3-sonnet", provider: "Production Anthropic", time: "09:48 AM", latency: "279ms", tokens: 1591, status: "success" },
  { id: "4", model: "gemini-pro", provider: "Google AI Key", time: "09:47 AM", latency: "258ms", tokens: 1188, status: "success" },
  { id: "5", model: "gpt-4-turbo", provider: "Production OpenAI", time: "09:46 AM", latency: "206ms", tokens: 1236, status: "error" },
  { id: "6", model: "claude-3-sonnet", provider: "Production OpenAI", time: "09:45 AM", latency: "431ms", tokens: 311, status: "error" },
  { id: "7", model: "gemini-pro", provider: "Google AI Key", time: "09:44 AM", latency: "468ms", tokens: 1543, status: "success" },
];
