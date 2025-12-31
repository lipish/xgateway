import { Sidebar } from "@/components/layout/Sidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { ProvidersTable } from "@/components/dashboard/ProvidersTable";
import { MonitoringCard } from "@/components/dashboard/MonitoringCard";
import { SystemStatus } from "@/components/dashboard/SystemStatus";
import { Server, Wifi, TrendingUp, Clock } from "lucide-react";

const Index = () => {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
          <DashboardHeader />

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              title="总模型服务商"
              value={4}
              subtitle="已配置的模型服务商数量"
              icon={Server}
              delay={50}
            />
            <StatsCard
              title="在线模型服务商"
              value={4}
              subtitle="当前启用的模型服务商"
              icon={Wifi}
              delay={100}
            />
            <StatsCard
              title="今日请求"
              value="—"
              subtitle="统计功能开发中"
              icon={TrendingUp}
              delay={150}
            />
            <StatsCard
              title="平均延迟"
              value="—"
              subtitle="统计功能开发中"
              icon={Clock}
              delay={200}
            />
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ProvidersTable />
            </div>
            <div>
              <MonitoringCard />
            </div>
          </div>

          {/* System Status */}
          <SystemStatus />
        </div>
      </main>
    </div>
  );
};

export default Index;
