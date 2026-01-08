import { Badge } from "@/components/ui/badge";
import { BarChart3 } from "lucide-react";

interface ActiveService {
  id: string;
  name: string;
  model: string;
  active: boolean;
}

interface ActiveServicesPanelProps {
  services: ActiveService[];
}

export function ActiveServicesPanel({ services }: ActiveServicesPanelProps) {
  const activeCount = services.filter((s) => s.active).length;

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-semibold text-foreground">Active Services</h3>
        <Badge variant="outline" className="text-xs font-medium">
          {activeCount} active
        </Badge>
      </div>

      <div className="space-y-4">
        {services.map((service) => (
          <div key={service.id} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <BarChart3 className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <div className="font-medium text-foreground">{service.name}</div>
                <div className="text-xs text-muted-foreground">{service.model}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${service.active ? 'bg-green-500' : 'bg-muted-foreground'}`} />
              <span className={`text-xs font-medium ${service.active ? 'text-green-600' : 'text-muted-foreground'}`}>
                {service.active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
