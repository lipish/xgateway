import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, Zap } from "lucide-react";
import { format } from "date-fns";

export interface ModelService {
  id: string;
  name: string;
  provider: string;
  model: string;
  enabled: boolean;
  priority: number;
  apiKey: string;
  baseUrl: string;
  inputCost: number;
  outputCost: number;
  tokenQuota: string;
  tokensUsed: number;
  createdAt: Date;
  updatedAt: Date;
}

interface ModelServiceTableProps {
  services: ModelService[];
  selectedId: string | null;
  onSelect: (service: ModelService) => void;
  onToggleEnabled: (id: string, enabled: boolean) => void;
  onDelete?: (service: ModelService) => void;
}

// 格式化 API Key 显示
function maskApiKey(key: string): string {
  if (key.length <= 8) return "****";
  return `****${key.slice(-4)}`;
}

export function ModelServiceTable({
  services,
  selectedId,
  onSelect,
  onDelete,
}: ModelServiceTableProps) {
  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[120px]">Name</TableHead>
            <TableHead className="w-[100px]">Key</TableHead>
            <TableHead className="w-[200px]">Scope</TableHead>
            <TableHead className="w-[120px]">QPS Limit</TableHead>
            <TableHead className="w-[140px]">Concurrency Limit</TableHead>
            <TableHead className="w-[100px]">Status</TableHead>
            <TableHead className="w-[120px]">Created At</TableHead>
            <TableHead className="w-[80px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {services.map((service) => (
            <TableRow
              key={service.id}
              className={`cursor-pointer transition-colors ${
                selectedId === service.id
                  ? "bg-accent/50"
                  : "hover:bg-muted/50"
              }`}
              onClick={() => onSelect(service)}
            >
              <TableCell className="font-medium">{service.name}</TableCell>
              <TableCell>
                <Badge variant="secondary" className="font-mono text-xs">
                  {maskApiKey(service.apiKey)}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline" className="text-xs">
                    ○ Specific Instance
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {service.model}
                  </Badge>
                  {service.provider && (
                    <Badge variant="secondary" className="text-xs">
                      {service.provider}
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Zap className="h-4 w-4 text-amber-500" />
                  <span>{service.priority}</span>
                </div>
              </TableCell>
              <TableCell>5</TableCell>
              <TableCell>
                <span
                  className={
                    service.enabled
                      ? "text-green-600 font-medium"
                      : "text-muted-foreground"
                  }
                >
                  {service.enabled ? "active" : "inactive"}
                </span>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {format(service.createdAt, "M/d/yyyy")}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete?.(service);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
