import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { dashboardService, type DashboardStats } from '../services/dashboard'

export function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await dashboardService.getStats()
        setStats(data)
      } catch (err) {
        setError('Failed to load dashboard statistics')
      } finally {
        setLoading(false)
      }
    }

    loadStats()
  }, [])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">Loading your dashboard...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card animate-pulse">
              <div className="card-body">
                <div className="h-16 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-red-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Welcome to your pricing optimization dashboard
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="p-2 bg-primary-100 rounded-lg">
                <span className="text-primary-600 text-xl">📋</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Rate Cards</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {stats?.totalRateCards || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <span className="text-green-600 text-xl">✅</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Rate Cards</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {stats?.activeRateCards || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <span className="text-yellow-600 text-xl">🧮</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Calculations Today</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {stats?.calculationsToday || 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {stats?.recentRateCards && stats.recentRateCards.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-medium text-gray-900">Recent Rate Cards</h2>
          </div>
          <div className="card-body">
            <div className="space-y-3">
              {stats.recentRateCards.map((rateCard) => (
                <div
                  key={rateCard.id}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/rate-cards/${rateCard.id}`)}
                >
                  <div>
                    <h3 className="font-medium text-gray-900">{rateCard.name}</h3>
                    <p className="text-sm text-gray-600">
                      {rateCard.pricingModel} • Updated {formatDate(rateCard.updatedAt)}
                    </p>
                  </div>
                  <Link
                    to={`/rate-cards/${rateCard.id}/edit`}
                    className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Edit
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-medium text-gray-900">Quick Actions</h2>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              to="/rate-cards?action=create"
              className="p-6 text-left border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
            >
              <div className="flex items-center">
                <span className="text-2xl mr-4">➕</span>
                <div>
                  <h3 className="font-medium text-gray-900">Create Rate Card</h3>
                  <p className="text-sm text-gray-600">Build a new pricing structure</p>
                </div>
              </div>
            </Link>
            
            <Link
              to="/calculator"
              className="p-6 text-left border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
            >
              <div className="flex items-center">
                <span className="text-2xl mr-4">🧮</span>
                <div>
                  <h3 className="font-medium text-gray-900">Run Calculator</h3>
                  <p className="text-sm text-gray-600">Calculate pricing for items</p>
                </div>
              </div>
            </Link>

            <Link
              to="/rate-cards"
              className="p-6 text-left border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
            >
              <div className="flex items-center">
                <span className="text-2xl mr-4">📋</span>
                <div>
                  <h3 className="font-medium text-gray-900">View Rate Cards</h3>
                  <p className="text-sm text-gray-600">Browse all pricing structures</p>
                </div>
              </div>
            </Link>

            <Link
              to="/import-export"
              className="p-6 text-left border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
            >
              <div className="flex items-center">
                <span className="text-2xl mr-4">📁</span>
                <div>
                  <h3 className="font-medium text-gray-900">Import/Export</h3>
                  <p className="text-sm text-gray-600">Manage CSV data files</p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard