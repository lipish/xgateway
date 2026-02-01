import * as React from "react"
import { Link, useLocation } from "react-router-dom"
import {
    LayoutDashboard,
    Server,
    Settings,
    Layers,
    BarChart3,
    Zap,
    MessageSquare,
    Library,
    User,
    Building2,
    FolderTree,
} from "lucide-react"

import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
} from "@/components/ui/sidebar"
import { t } from "@/lib/i18n"
import { cn } from "@/lib/utils"

function getNavigation() {
    return [
        {
            title: t('nav.main'),
            items: [
                { name: t('nav.modelTypes'), href: "/providers", icon: Library },
                { name: t('nav.models'), href: "/models", icon: Server },
                { name: t('nav.chat'), href: "/chat", icon: MessageSquare },
                { name: t('nav.services'), href: "/services", icon: Layers },
            ],
        },
        {
            title: t('nav.management'),
            items: [
                { name: t('nav.users'), href: "/users", icon: User },
                { name: t('nav.organizations'), href: "/organizations", icon: Building2 },
                { name: t('nav.projects'), href: "/projects", icon: FolderTree },
            ],
        },
        {
            title: t('nav.monitoring'),
            items: [
                { name: t('nav.analytics'), href: "/analytics", icon: BarChart3 },
                { name: t('nav.logs'), href: "/logs", icon: Zap },
            ],
        },
    ]
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const location = useLocation()
    const navigation = getNavigation()

    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link to="/">
                                <div className="flex aspect-square size-8 items-center justify-center">
                                    <img src="/favicon.svg" alt="X" className="size-8" />
                                </div>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-semibold text-base">XGateway</span>
                                </div>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                <SidebarMenu className="px-2">
                    {(() => {
                        const isActive = location.pathname === "/"
                        return (
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild tooltip={t('nav.dashboard')} isActive={isActive}>
                                    <Link to="/" className={cn("flex items-center gap-3")}>
                                        <LayoutDashboard className="size-4" />
                                        <span>{t('nav.dashboard')}</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        )
                    })()}
                </SidebarMenu>
                {navigation.map((section) => (
                    <SidebarGroup key={section.title}>
                        <SidebarGroupLabel>{section.title}</SidebarGroupLabel>
                        <SidebarMenu>
                            {section.items.map((item) => {
                                const isActive = location.pathname === item.href
                                return (
                                    <SidebarMenuItem key={item.name}>
                                        <SidebarMenuButton asChild tooltip={item.name} isActive={isActive}>
                                            <Link to={item.href} className={cn("flex items-center gap-3")}>
                                                <item.icon className="size-4" />
                                                <span>{item.name}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                )
                            })}
                        </SidebarMenu>
                    </SidebarGroup>
                ))}
            </SidebarContent>
            <SidebarRail />
        </Sidebar>
    )
}
