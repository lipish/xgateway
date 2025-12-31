import { Link, useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"
import { LanguageSwitcher } from "@/components/language-switcher"
import { t } from "@/lib/i18n"
import {
  Sidebar as SidebarBase,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar-ui"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar-menu"
import {
  LayoutDashboard,
  Server,
  Settings,
  Key,
  Activity,
  FileText,
  HelpCircle,
  MessageSquare,
  Library,
  User,
} from "lucide-react"

function getNavigation() {
  return [
    {
      title: t('nav.main'),
      items: [
        { name: t('nav.dashboard'), href: "/", icon: LayoutDashboard },
        { name: t('nav.modelTypes'), href: "/model-types", icon: Library },
        { name: t('nav.providers'), href: "/providers", icon: Server },
        { name: t('nav.chat'), href: "/chat", icon: MessageSquare },
        { name: t('nav.logs'), href: "/logs", icon: FileText },
      ],
    },
    {
      title: t('nav.settings'),
      items: [
        { name: t('nav.settings'), href: "/settings", icon: Settings },
        { name: t('nav.apiKeys'), href: "/api-keys", icon: Key },
      ],
    },
    {
      title: t('nav.monitoring'),
      items: [
        { name: t('nav.monitoring'), href: "/monitoring", icon: Activity },
        { name: t('nav.help'), href: "/help", icon: HelpCircle },
      ],
    },
  ]
}

export function AppSidebar() {
  const location = useLocation()
  const navigation = getNavigation()

  return (
    <SidebarBase className="border-r-0 shadow-sm">
      <SidebarHeader className="px-5 py-5">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src="/favicon.svg" alt="XGateway" className="h-8 w-8" />
            <span className="text-lg font-semibold">XGateway</span>
          </Link>
          <LanguageSwitcher />
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-2">
        {navigation.map((section, idx) => (
          <SidebarGroup key={section.title} className={cn(idx > 0 && "mt-4")}>
            <SidebarGroupLabel className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wider px-3 mb-2">
              {section.title}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => {
                  const isActive = location.pathname === item.href
                  return (
                    <SidebarMenuItem key={item.name}>
                      <SidebarMenuButton asChild isActive={isActive}>
                        <Link
                          to={item.href}
                          className={cn(
                            "flex items-center gap-3 relative",
                            isActive && "text-primary font-medium"
                          )}
                        >
                          {isActive && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 -ml-3 w-1 h-5 bg-primary rounded-r-full" />
                          )}
                          <item.icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-muted-foreground")} />
                          <span>{item.name}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-border/30 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <User className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{t('common.admin')}</p>
            <p className="text-xs text-muted-foreground truncate">{t('common.email')}</p>
          </div>
        </div>
      </SidebarFooter>
    </SidebarBase>
  )
}

// Keep old export for backward compatibility
export { AppSidebar as Sidebar }