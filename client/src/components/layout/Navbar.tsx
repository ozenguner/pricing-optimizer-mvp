import { authService } from '../../services/auth'
import { useNavigate } from 'react-router-dom'

export function Navbar() {
  const navigate = useNavigate()
  const user = authService.getStoredUser()

  const handleLogout = () => {
    authService.logout()
    navigate('/login')
  }

  return (
    <nav className="bg-white shadow-sm border-b border-secondary-200 h-16">
      <div className="h-full px-6">
        <div className="flex justify-between items-center h-full">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">P</span>
              </div>
              <h1 className="text-xl font-semibold text-secondary-900">
                Pricing Optimizer
              </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* User Info */}
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-secondary-50">
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-primary-700 font-medium text-sm">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </span>
              </div>
              <div className="text-sm">
                <div className="font-medium text-secondary-900">
                  {user?.firstName} {user?.lastName}
                </div>
                <div className="text-secondary-500 text-xs">
                  {user?.email}
                </div>
              </div>
            </div>
            
            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="btn-ghost text-sm px-3 py-2"
              title="Logout"
            >
              <span>↗</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}