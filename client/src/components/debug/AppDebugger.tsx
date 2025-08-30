import React, { useState, useEffect } from 'react'
import { authService } from '../../services/auth'

/**
 * Debug component to help troubleshoot app loading issues
 * Only renders in development mode
 */
export const AppDebugger: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState({
    isAuthenticated: false,
    user: null as any,
    token: null as string | null,
    location: '',
    errors: [] as string[]
  })

  useEffect(() => {
    const updateDebugInfo = () => {
      try {
        setDebugInfo({
          isAuthenticated: authService.isAuthenticated(),
          user: authService.getStoredUser(),
          token: authService.getStoredToken(),
          location: window.location.pathname,
          errors: []
        })
      } catch (error) {
        setDebugInfo(prev => ({
          ...prev,
          errors: [...prev.errors, error instanceof Error ? error.message : String(error)]
        }))
      }
    }

    updateDebugInfo()
    const interval = setInterval(updateDebugInfo, 1000)
    return () => clearInterval(interval)
  }, [])

  // Only show in development
  if (process.env.NODE_ENV !== 'development') return null

  return (
    <div 
      className="fixed top-0 right-0 bg-black bg-opacity-80 text-white text-xs p-2 z-[9999] max-w-xs"
      style={{ fontFamily: 'monospace' }}
    >
      <div className="mb-2 font-bold text-yellow-400">🐛 App Debug Info</div>
      
      <div className="space-y-1">
        <div>
          <strong>Auth:</strong> {debugInfo.isAuthenticated ? '✅ Yes' : '❌ No'}
        </div>
        
        <div>
          <strong>Location:</strong> {debugInfo.location}
        </div>
        
        <div>
          <strong>User:</strong> {debugInfo.user ? debugInfo.user.email : 'None'}
        </div>
        
        <div>
          <strong>Token:</strong> {debugInfo.token ? `${debugInfo.token.substring(0, 10)}...` : 'None'}
        </div>
        
        {debugInfo.errors.length > 0 && (
          <div className="mt-2 p-1 bg-red-900 rounded">
            <div className="text-red-300 font-bold">Errors:</div>
            {debugInfo.errors.map((error, i) => (
              <div key={i} className="text-red-200">{error}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}