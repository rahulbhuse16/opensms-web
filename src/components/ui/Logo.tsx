import { MessageSquareText } from 'lucide-react'

export default function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex size-8 items-center justify-center rounded-lg bg-brand-400/15 text-brand-400 ring-1 ring-brand-400/30">
        <MessageSquareText className="size-[18px]" strokeWidth={2} />
      </span>
      <span className="text-[17px] font-semibold tracking-tight text-white">
        Open<span className="text-brand-400">SMS</span>
      </span>
    </div>
  )
}
