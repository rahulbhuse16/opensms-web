import { NavLink } from 'react-router-dom'
import { X } from 'lucide-react'
import Logo from '../ui/Logo'
import { navItems } from '../../lib/navigation'
import { cn } from '../../lib/cn'

interface Props { open: boolean; onClose: () => void }

export default function Sidebar({ open, onClose }: Props) {
  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-30 bg-navy-950/60 transition-opacity lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-navy-900 transition-transform duration-200 ease-out lg:visible lg:translate-x-0',
          open ? 'visible translate-x-0' : 'invisible -translate-x-full',
        )}
        aria-label="Primary"
      >
        <div className="flex h-16 items-center justify-between border-b border-white/5 px-5">
          <Logo />
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-400 hover:bg-white/5 hover:text-white lg:hidden"
            aria-label="Close navigation"
          >
            <X className="size-5" />
          </button>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {navItems.map(({ label, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-100',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-brand-400" />}
                  <Icon className={cn('size-[18px]', isActive ? 'text-brand-400' : 'text-slate-500 group-hover:text-slate-300')} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-white/5 px-5 py-4 text-xs text-slate-500">OpenSMS Console</div>
      </aside>
    </>
  )
}
