import AppRoutes from './routes/AppRoutes'
import { ApiKeyProvider } from './contexts/ApiKeyContext'

export default function App() {
  return (
    <ApiKeyProvider>
      <AppRoutes />
    </ApiKeyProvider>
  )
}
