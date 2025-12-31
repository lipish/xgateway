import { BrowserRouter, Routes, Route } from "react-router-dom"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { DashboardPage } from "@/pages/dashboard"
import { ProvidersPage } from "@/pages/instances"
import { MonitoringPage } from "@/pages/monitoring"
import { LogsPage } from "@/pages/logs"
import { SettingsPage } from "@/pages/settings"
import { ApiKeysPage } from "@/pages/api-keys"
import { HelpPage } from "@/pages/help"
import { ChatPage } from "@/pages/chat"
import { ModelTypesPage } from "@/pages/model-types"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="instances" element={<ProvidersPage />} />
          <Route path="model-types" element={<ModelTypesPage />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="monitoring" element={<MonitoringPage />} />
          <Route path="logs" element={<LogsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="api-keys" element={<ApiKeysPage />} />
          <Route path="help" element={<HelpPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App