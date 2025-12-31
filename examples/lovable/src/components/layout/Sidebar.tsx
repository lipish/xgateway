import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Server,
  MessageSquare,
  FileText,
  Settings,
  Key,
  Activity,
  HelpCircle,
  Globe,
  ChevronLeft,
  User,
} from "lucide-react";
import { useState } from "react";

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  active?: boolean;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: "工作台",
    items: [
      { icon: LayoutDashboard, label: "工作台", href: "/", active: true },
      { icon: Server, label: "模型服务商", href: "/providers" },
      { icon: MessageSquare, label: "对话测试", href: "/chat" },
      { icon: FileText, label: "请求日志", href: "/logs" },
    ],
  },
  {
    title: "设置",
    items: [
      { icon: Settings, label: "设置", href: "/settings" },
      { icon: Key, label: "API 密钥", href: "/api-keys" },
    ],
  },
  {
    title: "监控",
    items: [
      { icon: Activity, label: "监控", href: "/monitoring" },
      { icon: HelpCircle, label: "帮助", href: "/help" },
    ],
  },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border">
        <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0">
          <span className="text-primary-foreground font-bold text-sm">X</span>
        </div>
        {!collapsed && (
          <span className="font-semibold text-sidebar-foreground">XGateway</span>
        )}
        {!collapsed && (
          <button className="ml-auto flex items-center gap-1 text-xs text-sidebar-muted hover:text-sidebar-foreground transition-colors">
            <Globe className="w-3.5 h-3.5" />
            中文
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        {navSections.map((section, idx) => (
          <div key={idx} className="mb-6">
            {section.title && !collapsed && (
              <div className="px-4 mb-2 text-xs font-medium text-sidebar-muted uppercase tracking-wider">
                {section.title}
              </div>
            )}
            <div className="space-y-1 px-2">
              {section.items.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                    item.active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                  )}
                >
                  <item.icon className={cn("w-5 h-5 flex-shrink-0", item.active && "text-primary")} />
                  {!collapsed && <span>{item.label}</span>}
                </a>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-sidebar-accent flex items-center justify-center">
            <User className="w-4 h-4 text-sidebar-accent-foreground" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-sidebar-foreground truncate">管理员</div>
              <div className="text-xs text-sidebar-muted truncate">admin@xgateway.local</div>
            </div>
          )}
        </div>
      </div>

      {/* Collapse Button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute top-20 -right-3 w-6 h-6 rounded-full bg-card border border-border shadow-sm flex items-center justify-center hover:bg-secondary transition-colors"
      >
        <ChevronLeft className={cn("w-4 h-4 transition-transform", collapsed && "rotate-180")} />
      </button>
    </aside>
  );
}
