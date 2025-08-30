import { Navigate } from 'react-router-dom'
import { authService } from '../../services/auth'

/**
 * Props interface for ProtectedRoute component
 */
interface ProtectedRouteProps {
  /** Child components to render when user is authenticated */
  children: React.ReactNode
}

/**
 * Protected Route Component
 * 
 * Business Logic:
 * - Checks if user has valid authentication token
 * - Redirects unauthenticated users to login page
 * - Renders protected content for authenticated users
 * - Uses replace navigation to prevent back button issues
 * 
 * Security Features:
 * - Prevents unauthorized access to protected pages
 * - Maintains authentication state across page refreshes
 * - Automatic redirection preserves user experience
 * 
 * @param children - Components to render for authenticated users
 * @returns JSX element - either protected content or redirect to login
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  // Check current authentication status from stored token
  const isUserAuthenticated = authService.isAuthenticated()

  // Redirect to login if not authenticated
  if (!isUserAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Render protected content for authenticated users
  return <>{children}</>
}