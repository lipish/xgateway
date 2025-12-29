import { Outlet, useLocation } from "react-router-dom"
import { AppSidebar } from "./sidebar"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar-ui"
import { Separator } from "@/components/ui/separator"
import { t } from "@/lib/i18n"

// Map routes to page titles
function getPageTitle(pathname: string): string {
  const routes: Record<string, string> = {
    "/": "nav.dashboard",
    "/providers": "nav.providers",
    "/chat": "nav.chat",
    "/logs": "nav.logs",
    "/settings": "nav.settings",
    "/api-keys": "nav.apiKeys",
    "/monitoring": "nav.monitoring",
    "/help": "nav.help",
  }
  const key = routes[pathname] || "nav.dashboard"
  return t(key)
}

export function DashboardLayout() {
  const location = useLocation()
  const pageTitle = getPageTitle(location.pathname)

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-muted/30">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <h1 className="text-base font-medium">{pageTitle}</h1>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
