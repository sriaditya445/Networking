import { NavLink, Outlet } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/upload', label: 'Upload' },
  { to: '/audit', label: 'Audit' },
  { to: '/templates', label: 'Templates' },
  { to: '/reports', label: 'Reports' },
  { to: '/trends', label: 'Trends' },
  { to: '/inventory', label: 'Inventory' },
]

export default function Layout() {
  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-brand-900 text-white flex flex-col">
        <div className="p-6 border-b border-brand-700">
          <h1 className="text-lg font-bold leading-tight">Network Audit</h1>
          <p className="text-brand-100 text-sm mt-1">& Compliance Platform</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `block px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-700 text-white'
                    : 'text-brand-100 hover:bg-brand-800 hover:text-white'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-brand-700 text-xs text-brand-200">
          Enterprise Network Compliance v1.0
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
