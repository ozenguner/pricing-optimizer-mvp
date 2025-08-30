import { BrowserRouter as Router, Routes, Route, Suspense, lazy } from 'react-router-dom'
import { ErrorBoundary } from './components/error/ErrorBoundary'
import { Layout } from './components/layout/Layout'
import { PageLoadingFallback } from './components/ui/PageLoadingFallback'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { AppDebugger } from './components/debug/AppDebugger'

// Lazy load all page components for better performance
const Dashboard = lazy(() => import('./pages/Dashboard'))
const RateCards = lazy(() => import('./pages/RateCards'))
const RateCardEditor = lazy(() => import('./pages/RateCardEditor'))
const Calculator = lazy(() => import('./pages/Calculator'))
const ImportExport = lazy(() => import('./pages/ImportExport'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))

/**
 * Main Application Component with Lazy Loading
 * 
 * Business Logic:
 * - Provides top-level routing configuration with code splitting
 * - Wraps entire app with error boundary for crash protection
 * - Implements lazy loading for all page components to improve initial load time
 * - Uses Suspense for graceful loading states during chunk loading
 * - Separates authenticated and public routes
 * - Maintains consistent layout structure for protected routes
 * 
 * Performance Optimizations:
 * - Code splitting reduces initial bundle size
 * - Components load on-demand when routes are accessed
 * - PageLoadingFallback provides smooth loading experience
 * - Each route chunk can be cached independently
 */
function App() {
  return (
    <ErrorBoundary context="App">
      <AppDebugger />
      <Router>
        <div className="min-h-screen bg-background-secondary">
          <Routes>
            {/* Public Routes with Lazy Loading */}
            <Route path="/login" element={
              <ErrorBoundary context="Login">
                <Suspense fallback={<PageLoadingFallback message="Loading login..." />}>
                  <Login />
                </Suspense>
              </ErrorBoundary>
            } />
            <Route path="/register" element={
              <ErrorBoundary context="Register">
                <Suspense fallback={<PageLoadingFallback message="Loading registration..." />}>
                  <Register />
                </Suspense>
              </ErrorBoundary>
            } />
            
            {/* Protected Routes with Layout and Lazy Loading */}
            <Route path="/" element={
              <ProtectedRoute>
                <ErrorBoundary context="Layout">
                  <Layout />
                </ErrorBoundary>
              </ProtectedRoute>
            }>
              <Route index element={
                <ErrorBoundary context="Dashboard">
                  <Suspense fallback={<PageLoadingFallback message="Loading dashboard..." />}>
                    <Dashboard />
                  </Suspense>
                </ErrorBoundary>
              } />
              <Route path="rate-cards" element={
                <ErrorBoundary context="RateCards">
                  <Suspense fallback={<PageLoadingFallback message="Loading rate cards..." />}>
                    <RateCards />
                  </Suspense>
                </ErrorBoundary>
              } />
              <Route path="rate-cards/create" element={
                <ErrorBoundary context="RateCardEditor">
                  <Suspense fallback={<PageLoadingFallback message="Loading rate card editor..." />}>
                    <RateCardEditor />
                  </Suspense>
                </ErrorBoundary>
              } />
              <Route path="rate-cards/:id" element={
                <ErrorBoundary context="RateCards">
                  <Suspense fallback={<PageLoadingFallback message="Loading rate cards..." />}>
                    <RateCards />
                  </Suspense>
                </ErrorBoundary>
              } />
              <Route path="rate-cards/:id/edit" element={
                <ErrorBoundary context="RateCardEditor">
                  <Suspense fallback={<PageLoadingFallback message="Loading rate card editor..." />}>
                    <RateCardEditor />
                  </Suspense>
                </ErrorBoundary>
              } />
              <Route path="calculator" element={
                <ErrorBoundary context="Calculator">
                  <Suspense fallback={<PageLoadingFallback message="Loading calculator..." />}>
                    <Calculator />
                  </Suspense>
                </ErrorBoundary>
              } />
              <Route path="import-export" element={
                <ErrorBoundary context="ImportExport">
                  <Suspense fallback={<PageLoadingFallback message="Loading import/export..." />}>
                    <ImportExport />
                  </Suspense>
                </ErrorBoundary>
              } />
            </Route>
          </Routes>
        </div>
      </Router>
    </ErrorBoundary>
  )
}

export default App