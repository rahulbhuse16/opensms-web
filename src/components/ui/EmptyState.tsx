import type { LucideIcon } from 'lucide-react'

interface Props { icon: LucideIcon; title: string; description: string }

export default function EmptyState({ icon: Icon, title, description }: Props) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-dashed border-line bg-white px-6 py-14 text-center">
      <span className="flex size-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
        <Icon className="size-5" />
      </span>
      <h2 className="mt-4 text-[15px] font-semibold">{title}</h2>
      <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted">{description}</p>
    </div>
  )
}
