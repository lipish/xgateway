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
        { name: t('nav.modelTypes'), href: "/providers", icon: Library },
        { name: t('nav.providers'), href: "/instances", icon: Server },
        { name: t('nav.chat'), href: "/chat", icon: MessageSquare },
      ],
    },
    {
      title: t('nav.management'),
      items: [
        { name: t('nav.users'), href: "/users", icon: User },
        { name: t('nav.apiKeys'), href: "/api-keys", icon: Key },
      ],
    },

    {
      title: t('nav.monitoring'),
      items: [
        { name: t('nav.metrics'), href: "/monitoring", icon: Activity },
        { name: t('nav.trace'), href: "/logs", icon: FileText },
      ],
    },
  ]
}

export function AppSidebar() {
  const location = useLocation()
  const navigation = getNavigation()

  return (
    <SidebarBase className="border-r-0 shadow-sm">
      <SidebarHeader className="px-4 py-4">
        <div className="flex items-center justify-between gap-2">
          <Link to="/" className="flex items-center gap-2 min-w-0">
            <img src="/favicon.svg" alt="XGateway" className="h-7 w-7 shrink-0" />
            <span className="text-base font-semibold truncate">XGateway</span>
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

    </SidebarBase>
  )
}

// Keep old export for backward compatibility
export { AppSidebar as Sidebar }