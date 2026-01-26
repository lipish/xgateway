import React, { Suspense } from "react"
import { HashRouter, Routes, Route, Navigate } from "react-router-dom"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { AuthProvider, useAuth } from "@/lib/auth"
import { PageLoading } from "@/components/ui/page-loading"

const DashboardPage = React.lazy(() => import("@/pages/dashboard").then((m) => ({ default: m.DashboardPage })))
const ProvidersPage = React.lazy(() => import("@/pages/models").then((m) => ({ default: m.ProvidersPage })))
const AnalyticsPage = React.lazy(() => import("@/pages/analytics").then((m) => ({ default: m.AnalyticsPage })))
const LogsPage = React.lazy(() => import("@/pages/logs").then((m) => ({ default: m.LogsPage })))
const SettingsPage = React.lazy(() => import("@/pages/settings").then((m) => ({ default: m.SettingsPage })))
const ServicesPage = React.lazy(() => import("@/pages/services").then((m) => ({ default: m.ServicesPage })))
const UsersPage = React.lazy(() => import("@/pages/users").then((m) => ({ default: m.UsersPage })))
const HelpPage = React.lazy(() => import("@/pages/help").then((m) => ({ default: m.HelpPage })))
const ChatPage = React.lazy(() => import("@/pages/chat").then((m) => ({ default: m.ChatPage })))
const ModelTypesPage = React.lazy(() => import("@/pages/providers").then((m) => ({ default: m.ModelTypesPage })))
const OrganizationsPage = React.lazy(() => import("@/pages/organizations").then((m) => ({ default: m.OrganizationsPage })))
const ProjectsPage = React.lazy(() => import("@/pages/projects").then((m) => ({ default: m.ProjectsPage })))
const LoginPage = React.lazy(() => import("@/pages/login").then((m) => ({ default: m.LoginPage })))

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return <PageLoading fullScreen />
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoading fullScreen />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
          <Route index element={<DashboardPage />} />
          <Route path="models" element={<ProvidersPage />} />
          <Route path="providers" element={<ModelTypesPage />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="logs" element={<LogsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="organizations" element={<OrganizationsPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="services" element={<ServicesPage />} />
          <Route path="help" element={<HelpPage />} />
        </Route>
      </Routes>
    </Suspense>
  )
}

function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </AuthProvider>
  )
}


export default App
