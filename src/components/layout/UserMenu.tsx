import { useCallback, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { ChevronDown, LogOut, Settings } from 'lucide-react'
import { useClickOutside } from '../../hooks/useClickOutside'

export default function UserMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useClickOutside(ref, close, open)

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-md p-1 pr-1.5 hover:bg-slate-100"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-navy-900 text-xs font-semibold text-white">OS</span>
        <ChevronDown className="hidden size-4 text-muted sm:block" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 mt-2 w-56 rounded-lg border border-line bg-white p-1.5 shadow-lg shadow-navy-900/10">
          <div className="px-2.5 py-2">
            <p className="text-sm font-medium">Your account</p>
            <p className="text-xs text-muted">Sign-in is not set up yet</p>
          </div>
          <div className="my-1 border-t border-line" />
          <NavLink to="/settings" onClick={close} role="menuitem" className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm hover:bg-slate-50">
            <Settings className="size-4 text-muted" /> Settings
          </NavLink>
          <button type="button" disabled role="menuitem" className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-muted/60">
            <LogOut className="size-4" /> Sign out
          </button>
        </div>
      )}
    </div>
  )
}
