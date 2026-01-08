import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ExternalLink,
  Link,
  Settings,
  Key,
  Calendar,
  Pin,
  Monitor,
  Pencil,
  Trash2,
} from "lucide-react";
import type { ModelService } from "./ModelServiceTable";

interface ModelServiceDetailProps {
  service: ModelService;
  onEdit: (service: ModelService) => void;
  onDelete: (service: ModelService) => void;
}

export function ModelServiceDetail({
  service,
  onEdit,
  onDelete,
}: ModelServiceDetailProps) {
  const maskApiKey = (key: string) => {
    if (key.length <= 8) return "••••••••";
    return `${key.slice(0, 4)}••••${key.slice(-4)}`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleString("en-US", {
      month: "numeric",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="rounded-lg border bg-card p-6 h-fit">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
            <Settings className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">{service.name}</h3>
            <Badge variant="secondary" className="mt-1">
              {service.provider}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Pin className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Monitor className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onEdit(service)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => onDelete(service)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <a
        href="#"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ExternalLink className="h-4 w-4" />
        View documentation
      </a>

      <Separator className="my-4" />

      {/* Configuration */}
      <div className="space-y-4">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Configuration
        </h4>

        <div className="space-y-3">
          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Link className="h-4 w-4" />
              Base URL
            </div>
            <p className="text-sm font-mono">{service.baseUrl}</p>
          </div>

          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Settings className="h-4 w-4" />
              Model
            </div>
            <p className="text-sm font-mono">{service.model}</p>
          </div>

          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Key className="h-4 w-4" />
              API Key
            </div>
            <p className="text-sm font-mono">{maskApiKey(service.apiKey)}</p>
          </div>
        </div>
      </div>

      <Separator className="my-4" />

      {/* Pricing & Quota */}
      <div className="space-y-4">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Pricing & Quota
        </h4>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground mb-1">Input Price</p>
            <p className="text-lg font-semibold">
              ¥{service.inputCost.toFixed(2)}
              <span className="text-xs font-normal text-muted-foreground">
                /1M
              </span>
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground mb-1">Output Price</p>
            <p className="text-lg font-semibold">
              ¥{service.outputCost.toFixed(2)}
              <span className="text-xs font-normal text-muted-foreground">
                /1M
              </span>
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground mb-1">Token Quota</p>
            <p className="text-lg font-semibold">
              {service.tokenQuota || "∞"}
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground mb-1">Tokens Used</p>
            <p className="text-lg font-semibold text-primary">
              {service.tokensUsed > 0 ? service.tokensUsed.toLocaleString() : "-"}
            </p>
          </div>
        </div>
      </div>

      <Separator className="my-4" />

      {/* Time Info */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Time Info
        </h4>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Created at:</span>
            <span className="text-foreground">{formatDate(service.createdAt)}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Updated at:</span>
            <span className="text-foreground">{formatDate(service.updatedAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
