import React from "react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import Notifications from "./notifications"
import UserMenu from "./user-menu"
import { LanguageSwitcher } from "@/components/language-switcher"

export function SiteHeader() {
    return (
        <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
            <div className="flex items-center gap-2">
                <SidebarTrigger className="-ml-1" />
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