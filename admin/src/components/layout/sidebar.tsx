import { Link, useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { LanguageSwitcher } from "@/components/language-switcher"
import { useI18n, t } from "@/lib/i18n"
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

function getNavigation() {
  return [
    {
      title: t('nav.dashboard').split(' ')[0], // Get first word for section title
      items: [
        { name: t('nav.dashboard'), href: "/", icon: LayoutDashboard },
        { name: t('nav.providers'), href: "/providers", icon: Server },
        { name: t('nav.chat'), href: "/chat", icon: MessageSquare },
        { name: t('nav.logs'), href: "/logs", icon: FileText },
      ],
    },
    {
      title: t('nav.settings').split(' ')[0],
      items: [
        { name: t('nav.settings'), href: "/settings", icon: Settings },
        { name: t('nav.apiKeys'), href: "/api-keys", icon: Key },
      ],
    },
    {
      title: t('nav.monitoring').split(' ')[0],
      items: [
        { name: t('nav.monitoring'), href: "/monitoring", icon: Activity },
        { name: t('nav.help'), href: "/help", icon: HelpCircle },
      ],
    },
  ]
}

export function Sidebar() {
  const location = useLocation()
  const navigation = getNavigation()

  return (
    <div className="flex h-full w-64 flex-col border-r bg-sidebar">
      {/* Logo */}
      <div className="flex h-14 items-center border-b px-4">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <img src="/favicon.svg" alt="XGateway" className="h-8 w-8" />
          <span className="text-lg">XGateway</span>
        </Link>
      </div>

      {/* Search */}
      <div className="p-4">
        <Button variant="outline" className="w-full justify-start gap-2 text-muted-foreground">
          <Search className="h-4 w-4" />
          <span>{t('providers.search')}</span>
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

      {/* Language Switcher */}
      <div className="p-4 border-b">
        <LanguageSwitcher />
      </div>

      {/* User */}
      <div className="p-4">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium">
            A
          </div>
          <div className="flex-1 truncate">
            <p className="text-sm font-medium">{t('common.admin')}</p>
            <p className="text-xs text-muted-foreground">{t('common.email')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
