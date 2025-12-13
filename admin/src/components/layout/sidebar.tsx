import { Link, useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  LayoutDashboard,
  Server,
  Settings,
  Key,
  Activity,
  FileText,
  HelpCircle,
  Search,
  MessageSquare,
} from "lucide-react"

const navigation = [
  {
    title: "主要",
    items: [
      { name: "仪表板", href: "/", icon: LayoutDashboard },
      { name: "Providers", href: "/providers", icon: Server },
      { name: "对话测试", href: "/chat", icon: MessageSquare },
      { name: "日志", href: "/logs", icon: FileText },
    ],
  },
  {
    title: "配置",
    items: [
      { name: "设置", href: "/settings", icon: Settings },
      { name: "API 密钥", href: "/api-keys", icon: Key },
    ],
  },
  {
    title: "系统",
    items: [
      { name: "监控", href: "/monitoring", icon: Activity },
      { name: "帮助", href: "/help", icon: HelpCircle },
    ],
  },
]

export function Sidebar() {
  const location = useLocation()

  return (
    <div className="flex h-full w-64 flex-col border-r bg-sidebar">
      {/* Logo */}
      <div className="flex h-14 items-center border-b px-4">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <img src="/vite.svg" alt="LLM Link" className="h-8 w-8" />
          <span className="text-lg">LLM Link</span>
        </Link>
      </div>

      {/* Search */}
      <div className="p-4">
        <Button variant="outline" className="w-full justify-start gap-2 text-muted-foreground">
          <Search className="h-4 w-4" />
          <span>搜索...</span>
          <kbd className="pointer-events-none ml-auto inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            ⌘K
          </kbd>
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3">
        {navigation.map((section, idx) => (
          <div key={section.title} className={cn(idx > 0 && "mt-6")}>
            <h4 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {section.title}
            </h4>
            {section.items.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      <Separator />

      {/* User */}
      <div className="p-4">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium">
            A
          </div>
          <div className="flex-1 truncate">
            <p className="text-sm font-medium">Admin</p>
            <p className="text-xs text-muted-foreground">admin@llm-link.local</p>
          </div>
        </div>
      </div>
    </div>
  )
}
