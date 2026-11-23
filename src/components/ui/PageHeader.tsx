import type { ReactNode } from 'react'

interface Props { title: string; description: string; actions?: ReactNode }

export default function PageHeader({ title, description, actions }: Props) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">{description}</p>
      </div>
      {actions}
    </div>
  )
}
