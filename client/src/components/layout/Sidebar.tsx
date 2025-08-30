import { NavLink } from 'react-router-dom'
import { cn } from '../../utils/cn'

const navigation = [
  { name: 'Dashboard', href: '/', icon: '📊' },
  { name: 'Rate Cards', href: '/rate-cards', icon: '📋' },
  { name: 'Calculator', href: '/calculator', icon: '🧮' },
  { name: 'Import/Export', href: '/import-export', icon: '📁' },
]

export function Sidebar() {
  return (
    <div className="w-64 bg-white shadow-sm border-r border-gray-200">
      <nav className="mt-8 px-4">
        <ul className="space-y-2">
          {navigation.map((item) => (
            <li key={item.name}>
              <NavLink
                to={item.href}
                className={({ isActive }) =>
                  cn(
                    'flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors',
                    isActive
                      ? 'bg-primary-100 text-primary-700 border-primary-300'
                      : 'text-gray-700 hover:bg-gray-100'
                  )
                }
              >
                <span className="mr-3">{item.icon}</span>
                {item.name}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}