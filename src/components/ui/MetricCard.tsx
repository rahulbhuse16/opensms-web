import type { LucideIcon } from 'lucide-react'

interface Props { label: string; icon: LucideIcon; hint: string; value?: string }

export default function MetricCard({ label, icon: Icon, hint, value = '—' }: Props) {
  return (
    <div className="rounded-lg border border-line bg-white p-4 shadow-[0_1px_2px_rgba(15,31,58,0.04)]">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted">{label}</span>
        <Icon className="size-4 text-muted/70" />
      </div>
      <p className={`mt-3 text-2xl font-semibold tracking-tight ${value === '—' ? 'text-muted/50' : 'text-ink'}`}>{value}</p>
      <p className="mt-1 text-xs text-muted">{hint}</p>
    </div>
  )
}
