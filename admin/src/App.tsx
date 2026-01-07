import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { DashboardPage } from "@/pages/dashboard"
import { ProvidersPage } from "@/pages/instances"
import { MonitoringPage } from "@/pages/monitoring"
import { LogsPage } from "@/pages/logs"
import { SettingsPage } from "@/pages/settings"
import { ApiKeysPage } from "@/pages/api-keys"
import { UsersPage } from "@/pages/users"
import { HelpPage } from "@/pages/help"
import { ChatPage } from "@/pages/chat"
import { ModelTypesPage } from "@/pages/providers"
import { LoginPage } from "@/pages/login"
import { AuthProvider, useAuth } from "@/lib/auth"

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="instances" element={<ProvidersPage />} />
        <Route path="providers" element={<ModelTypesPage />} />
        <Route path="chat" element={<ChatPage />} />
        <Route path="monitoring" element={<MonitoringPage />} />
        <Route path="logs" element={<LogsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="apikeys" element={<ApiKeysPage />} />
        <Route path="help" element={<HelpPage />} />
      </Route>
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}


export default App