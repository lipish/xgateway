import React from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import {
    Breadcrumb,
    BreadcrumbList,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import Notifications from "./notifications"
import UserMenu from "./user-menu"
import { LanguageSwitcher } from "@/components/language-switcher"
import { t } from "@/lib/i18n"

export function SiteHeader() {
    const navigate = useNavigate()
    const location = useLocation()

    // Generate breadcrumbs based on pathname
    const pathParts = location.pathname.split('/').filter(Boolean)
    const breadcrumbs = pathParts.length === 0
        ? [{ name: t('nav.dashboard'), href: "/" }]
        : pathParts.map((part, index) => {
            const href = `/${pathParts.slice(0, index + 1).join('/')}`
            const navKey = part === 'models' ? 'models' : 
              part === 'providers' ? 'modelTypes' :
              part === 'apikeys' ? 'apiKeys' : part
            return {
                name: t(`nav.${navKey}` as any) || part,
                href
            }
        })

    return (
        <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
            <div className="flex items-center gap-2">
                <SidebarTrigger className="-ml-1" />
                <Separator orientation="vertical" className="mr-2 h-4" />
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem className="hidden md:block">
                            <BreadcrumbLink onClick={() => navigate('/')} className="cursor-pointer">
                                {t('nav.dashboard')}
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                        {pathParts.length > 0 && <BreadcrumbSeparator className="hidden md:block" />}
                        {breadcrumbs.filter(b => b.href !== '/').map((b, i, filtered) => (
                            <React.Fragment key={b.href}>
                                <BreadcrumbItem>
                                    {i === filtered.length - 1 ? (
                                        <BreadcrumbPage>{b.name}</BreadcrumbPage>
                                    ) : (
                                        <BreadcrumbLink onClick={() => navigate(b.href)} className="cursor-pointer">
                                            {b.name}
                                        </BreadcrumbLink>
                                    )}
                                </BreadcrumbItem>
                                {i < filtered.length - 1 && <BreadcrumbSeparator />}
                            </React.Fragment>
                        ))}
                    </BreadcrumbList>
                </Breadcrumb>
            </div>

            <div className="flex items-center gap-2">
                <LanguageSwitcher />
                <Notifications />
                <Separator orientation="vertical" className="mx-2 h-4 hidden sm:block" />
                <UserMenu />
            </div>
        </header>
    )
}