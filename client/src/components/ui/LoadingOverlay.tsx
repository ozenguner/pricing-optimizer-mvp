import { LoadingSpinner } from './LoadingSpinner'

interface LoadingOverlayProps {
  message?: string
  className?: string
}

export function LoadingOverlay({ message = 'Loading...', className }: LoadingOverlayProps) {
  return (
    <div className={`loading-overlay ${className || ''}`}>
      <div className="loading-container">
        <LoadingSpinner size="lg" />
        <span className="loading-text">{message}</span>
      </div>
    </div>
  )
}