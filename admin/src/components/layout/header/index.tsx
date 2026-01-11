import React from "react"
import { useLocation } from "react-router-dom"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import {
    Breadcrumb,
    BreadcrumbList,
    BreadcrumbItem,
    BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import Notifications from "./notifications"
import UserMenu from "./user-menu"
import { LanguageSwitcher } from "@/components/language-switcher"
import { t } from "@/lib/i18n"

export function SiteHeader() {
    const location = useLocation()

    // Generate breadcrumbs based on pathname
    const pathParts = location.pathname.split('/').filter(Boolean)
    const currentPart = pathParts.length === 0 ? 'dashboard' : pathParts[pathParts.length - 1]
    const navKey = currentPart === 'models' ? 'models' :
        currentPart === 'providers' ? 'modelTypes' :
            currentPart === 'apikeys' ? 'apiKeys' : currentPart
    const currentTitle = t(`nav.${navKey}` as any) || currentPart

    return (
        <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
            <div className="flex items-center gap-2">
                <SidebarTrigger className="-ml-1" />
                <Separator orientation="vertical" className="mr-2 h-4" />
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbPage>{currentTitle}</BreadcrumbPage>
                        </BreadcrumbItem>
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