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
import { Switch } from "@/components/ui/switch";
import { ArrowRight, Zap, Monitor } from "lucide-react";
import { type ModelService } from "@/components/ModelServiceTable";

interface RecentProvidersTableProps {
  services: ModelService[];
  onToggleEnabled: (id: string, enabled: boolean) => void;
  onViewAll?: () => void;
}

export function RecentProvidersTable({
  services,
  onToggleEnabled,
  onViewAll,
}: RecentProvidersTableProps) {
  // Show only first 4 services
  const recentServices = services.slice(0, 4);

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center justify-between p-5 border-b">
        <h3 className="text-lg font-semibold text-foreground">Recent Providers</h3>
        <Button variant="outline" size="sm" onClick={onViewAll}>
          <ArrowRight className="mr-2 h-4 w-4" />
          View All
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[140px]">Name</TableHead>
            <TableHead className="w-[100px]">Status</TableHead>
            <TableHead>Model</TableHead>
            <TableHead className="w-[100px]">Priority</TableHead>
            <TableHead className="w-[120px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {recentServices.map((service) => (
            <TableRow key={service.id} className="hover:bg-muted/30">
              <TableCell className="font-medium">{service.name}</TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={
                    service.enabled
                      ? "bg-green-50 text-green-700 border-green-200"
                      : "bg-muted text-muted-foreground"
                  }
                >
                  {service.enabled ? "Enabled" : "Disabled"}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {service.model}
              </TableCell>
              <TableCell>{service.priority}</TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-2">
                  <Switch
                    checked={service.enabled}
                    onCheckedChange={(checked) => onToggleEnabled(service.id, checked)}
                  />
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Zap className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Monitor className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
