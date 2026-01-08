import { useState } from "react";
import { ModelServiceForm } from "@/components/ModelServiceForm";
import { type ModelService } from "@/components/ModelServiceTable";
import { DashboardStats } from "@/components/DashboardStats";
import { RecentProvidersTable } from "@/components/RecentProvidersTable";
import { PerformancePanel } from "@/components/PerformancePanel";
import { ActiveServicesPanel } from "@/components/ActiveServicesPanel";

// Mock data
const mockServices: ModelService[] = [
  {
    id: "1",
    name: "GPT-4 Turbo",
    provider: "openai",
    model: "gpt-4-turbo",
    enabled: true,
    priority: 10,
    apiKey: "sk-abc123def456ghi789",
    baseUrl: "https://api.openai.com/v1",
    inputCost: 0,
    outputCost: 0,
    tokenQuota: "",
    tokensUsed: 0,
    createdAt: new Date("2026-01-08T10:25:52"),
    updatedAt: new Date("2026-01-08T10:25:52"),
  },
  {
    id: "2",
    name: "GPT-4o",
    provider: "openai",
    model: "gpt-4-o",
    enabled: true,
    priority: 10,
    apiKey: "sk-xyz789abc123",
    baseUrl: "https://api.openai.com/v1",
    inputCost: 0.5,
    outputCost: 1.0,
    tokenQuota: "1000000",
    tokensUsed: 50000,
    createdAt: new Date("2026-01-07T09:00:00"),
    updatedAt: new Date("2026-01-08T08:30:00"),
  },
  {
    id: "3",
    name: "Claude 3 Sonnet",
    provider: "anthropic",
    model: "claude-3-sonnet",
    enabled: true,
    priority: 10,
    apiKey: "sk-anthropic-key-123",
    baseUrl: "https://api.anthropic.com/v1",
    inputCost: 0.3,
    outputCost: 0.6,
    tokenQuota: "",
    tokensUsed: 0,
    createdAt: new Date("2026-01-06T14:20:00"),
    updatedAt: new Date("2026-01-06T14:20:00"),
  },
  {
    id: "4",
    name: "Gemini Pro",
    provider: "google",
    model: "gemini-pro",
    enabled: false,
    priority: 10,
    apiKey: "sk-google-456",
    baseUrl: "https://generativelanguage.googleapis.com/v1",
    inputCost: 0.1,
    outputCost: 0.2,
    tokenQuota: "5000000",
    tokensUsed: 1200000,
    createdAt: new Date("2026-01-05T11:00:00"),
    updatedAt: new Date("2026-01-07T16:45:00"),
  },
];

const Index = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [services, setServices] = useState<ModelService[]>(mockServices);

  const activeServices = services.filter((s) => s.enabled);
  const activeCount = activeServices.length;

  const handleToggleEnabled = (id: string, enabled: boolean) => {
    setServices((prev) =>
      prev.map((service) =>
        service.id === id ? { ...service, enabled } : service
      )
    );
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor your model gateway performance and activity
          </p>
        </div>

        {/* Stats Cards */}
        <div className="mb-6">
          <DashboardStats
            totalRequests={15847}
            activeServices={activeCount}
            apiKeys={3}
            avgLatency="245ms"
          />
        </div>

        {/* Main Content: Recent Providers + Side Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Recent Providers Table */}
          <div className="lg:col-span-2">
            <RecentProvidersTable
              services={services}
              onToggleEnabled={handleToggleEnabled}
              onViewAll={() => console.log("View all providers")}
            />
          </div>

          {/* Right: Performance & Active Services Panels */}
          <div className="lg:col-span-1 space-y-6">
            <PerformancePanel
              successRate={96}
              requestsToday={3421}
              tokensUsed={1847293}
              failedRequests={613}
            />
            <ActiveServicesPanel
              services={activeServices.map((s) => ({
                id: s.id,
                name: s.name,
                model: s.model,
                active: s.enabled,
              }))}
            />
          </div>
        </div>
      </div>

      <ModelServiceForm open={isFormOpen} onOpenChange={setIsFormOpen} />
    </div>
  );
};

export default Index;
