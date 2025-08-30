import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { cn } from '../../utils/cn'

const navigation = [
  { name: 'Dashboard', href: '/', icon: '📊' },
  { name: 'Rate Cards', href: '/rate-cards', icon: '📋' },
  { name: 'Calculator', href: '/calculator', icon: '🧮' },
  { name: 'Import/Export', href: '/import-export', icon: '📁' },
]

const folders = [
  { id: '1', name: 'Marketing Campaigns', count: 12, children: [
    { id: '1-1', name: 'Q1 2024', count: 4 },
    { id: '1-2', name: 'Q2 2024', count: 8 }
  ]},
  { id: '2', name: 'Product Pricing', count: 8, children: [
    { id: '2-1', name: 'Software Licenses', count: 5 },
    { id: '2-2', name: 'Support Services', count: 3 }
  ]},
  { id: '3', name: 'Client Projects', count: 15 }
]

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [expandedFolders, setExpandedFolders] = useState<string[]>(['1'])

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => 
      prev.includes(folderId) 
        ? prev.filter(id => id !== folderId)
        : [...prev, folderId]
    )
  }

  return (
    <div className={cn(
      "bg-white shadow-sm border-r border-secondary-200 transition-all duration-300 fixed left-0 top-16 bottom-0 z-40",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* Collapse Toggle */}
      <div className="flex items-center justify-between p-4 border-b border-secondary-200">
        {!isCollapsed && <span className="font-medium text-secondary-900">Navigation</span>}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 hover:bg-secondary-100 rounded-md transition-colors"
        >
          <span className="text-secondary-500">
            {isCollapsed ? '→' : '←'}
          </span>
        </button>
      </div>

      {/* Navigation */}
      <nav className="mt-4 px-2">
        <ul className="space-y-1">
          {navigation.map((item) => (
            <li key={item.name}>
              <NavLink
                to={item.href}
                className={({ isActive }) =>
                  cn(
                    'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                    isActive
                      ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-700'
                      : 'text-secondary-700 hover:text-secondary-900 hover:bg-secondary-50'
                  )
                }
                title={isCollapsed ? item.name : undefined}
              >
                <span className={cn("text-lg", isCollapsed ? "mx-auto" : "mr-3")}>
                  {item.icon}
                </span>
                {!isCollapsed && item.name}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Folder Tree */}
      {!isCollapsed && (
        <div className="mt-8 px-2">
          <h3 className="px-3 text-xs font-semibold text-secondary-500 uppercase tracking-wider">
            Folders
          </h3>
          <div className="mt-3">
            {folders.map((folder) => (
              <div key={folder.id}>
                <button
                  onClick={() => folder.children && toggleFolder(folder.id)}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm text-secondary-700 hover:text-secondary-900 hover:bg-secondary-50 rounded-md transition-colors"
                >
                  <div className="flex items-center">
                    {folder.children && (
                      <span className="mr-2 text-xs">
                        {expandedFolders.includes(folder.id) ? '▼' : '▶'}
                      </span>
                    )}
                    <span className="mr-2">📁</span>
                    <span>{folder.name}</span>
                  </div>
                  <span className="text-xs bg-secondary-100 text-secondary-600 px-2 py-1 rounded-full">
                    {folder.count}
                  </span>
                </button>
                
                {/* Children */}
                {folder.children && expandedFolders.includes(folder.id) && (
                  <div className="ml-6 mt-1 space-y-1">
                    {folder.children.map((child) => (
                      <button
                        key={child.id}
                        className="w-full flex items-center justify-between px-3 py-2 text-sm text-secondary-600 hover:text-secondary-800 hover:bg-secondary-50 rounded-md transition-colors"
                      >
                        <div className="flex items-center">
                          <span className="mr-2">📄</span>
                          <span>{child.name}</span>
                        </div>
                        <span className="text-xs bg-secondary-100 text-secondary-600 px-2 py-1 rounded-full">
                          {child.count}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}