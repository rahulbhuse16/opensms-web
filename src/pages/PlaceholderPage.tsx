import PageHeader from '../components/ui/PageHeader'
import EmptyState from '../components/ui/EmptyState'
import { navItems } from '../lib/navigation'

export default function PlaceholderPage({ path }: { path: string }) {
  const item = navItems.find((n) => n.path === path)
  if (!item) return null
  return (
    <div className="space-y-6">
      <PageHeader title={item.label} description={item.description} />
      <EmptyState
        icon={item.icon}
        title={`${item.label} is coming soon`}
        description="This section is not built yet. It will be available once the matching OpenSMS API is ready."
      />
    </div>
  )
}
