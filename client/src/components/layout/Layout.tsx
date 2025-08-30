import { Outlet } from 'react-router-dom'
import { Navbar } from './Navbar'
import { Sidebar } from './Sidebar'

export function Layout() {
  return (
    <div className="min-h-screen bg-background-secondary">
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <Navbar />
      </div>
      
      {/* Main Layout with Sidebar and Content */}
      <div className="flex pt-16">
        <Sidebar />
        <main className="flex-1 ml-64 p-8 transition-all duration-300">
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}