import { Navigate, Route, Routes } from 'react-router-dom'
import DashboardLayout from '../layouts/DashboardLayout'
import OverviewPage from '../pages/OverviewPage'
import PlaceholderPage from '../pages/PlaceholderPage'
import NotFoundPage from '../pages/NotFoundPage'
import ApiKeysPage from '../pages/ApiKeysPage'
import MessagesPage from '../pages/MessagesPage'
import WebhooksPage from '../pages/WebhooksPage'
import SettingsPage from '../pages/SettingsPage'
import AnalyticsPage from '../pages/AnalyticsPage'
import ContactsPage from '../pages/ContactsPage'

const placeholderPaths = ['/developers', '/billing']

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<OverviewPage />} />
        <Route path="/api-keys" element={<ApiKeysPage />} />
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/webhooks" element={<WebhooksPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/contacts" element={<ContactsPage />} />
        {placeholderPaths.map((p) => (
          <Route key={p} path={p} element={<PlaceholderPage path={p} />} />
        ))}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
