import { Link } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader'

export default function NotFoundPage() {
  return (
    <div className="space-y-4">
      <PageHeader title="Page not found" description="The page you requested does not exist." />
      <Link to="/dashboard" className="inline-block text-sm font-medium text-brand-700 hover:underline">Go to Overview</Link>
    </div>
  )
}
