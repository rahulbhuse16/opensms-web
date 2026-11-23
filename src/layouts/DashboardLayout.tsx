import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from '../components/layout/Sidebar'
import Topbar from '../components/layout/Topbar'

export default function DashboardLayout() {
  const [navOpen, setNavOpen] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => { window.scrollTo(0, 0) }, [pathname])

  return (
    <div className="min-h-full">
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
      <div className="lg:pl-64">
        <Topbar onMenu={() => setNavOpen(true)} />
        <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
