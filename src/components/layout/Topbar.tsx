import { useLocation } from 'react-router-dom'
import { Bell, Menu, Search } from 'lucide-react'
import UserMenu from './UserMenu'
import { navItems } from '../../lib/navigation'

export default function Topbar({ onMenu }: { onMenu: () => void }) {
  const { pathname } = useLocation()
  const current = navItems.find((n) => n.path === pathname)

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-white/90 px-4 backdrop-blur sm:px-6">
      <button
        type="button"
        onClick={onMenu}
        className="rounded-md p-2 text-muted hover:bg-slate-100 lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="size-5" />
      </button>

      <nav aria-label="Breadcrumb" className="hidden items-center gap-2 text-sm sm:flex">
        <span className="text-muted">Console</span>
        <span className="text-muted/50">/</span>
        <span className="font-medium">{current?.label ?? 'Not found'}</span>
      </nav>
      <span className="text-sm font-medium sm:hidden">{current?.label ?? 'Not found'}</span>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <div className="relative hidden md:block">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            placeholder="Search"
            aria-label="Search (not yet active)"
            className="h-9 w-64 rounded-md border border-line bg-canvas pl-8 pr-3 text-sm placeholder:text-muted/70 focus:border-brand-500 focus:bg-white focus:outline-none lg:w-72"
          />
        </div>
        <button type="button" className="rounded-md p-2 text-muted hover:bg-slate-100 md:hidden" aria-label="Search">
          <Search className="size-5" />
        </button>
        <button type="button" className="rounded-md p-2 text-muted hover:bg-slate-100" aria-label="Notifications">
          <Bell className="size-5" />
        </button>
        <UserMenu />
      </div>
    </header>
  )
}
