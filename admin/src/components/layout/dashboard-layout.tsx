import React from "react"
import { Outlet } from "react-router-dom"
import { AppSidebar } from "./app-sidebar"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { SiteHeader } from "./header"
import { Toaster } from "@/components/ui/sonner"

export function DashboardLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="h-svh overflow-hidden">
        <SiteHeader />
        <main className="flex-1 flex flex-col min-h-0 overflow-hidden bg-muted/40">
          <div className="flex-1 flex flex-col min-h-0 p-4 lg:p-6">
            <Outlet />
          </div>
        </main>
      </SidebarInset>
      <Toaster position="top-center" richColors />
    </SidebarProvider>
  )
}