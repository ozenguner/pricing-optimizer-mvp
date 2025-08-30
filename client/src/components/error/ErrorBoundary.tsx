import React, { Component, ReactNode } from 'react'
import { logAndExtractError, ErrorMessages } from '../../utils/errorHandling'

/**
 * Props for ErrorBoundary component
 */
interface ErrorBoundaryProps {
  /** Child components to render when no error occurs */
  children: ReactNode
  /** Optional fallback UI to render when error occurs */
  fallback?: ReactNode
  /** Optional callback when error occurs */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  /** Context name for error logging */
  context?: string
}

/**
 * State for ErrorBoundary component
 */
interface ErrorBoundaryState {
  /** Whether an error has occurred */
  hasError: boolean
  /** The error that occurred */
  error: Error | null
  /** Additional error information */
  errorInfo: React.ErrorInfo | null
}

/**
 * Error Boundary component to catch and handle React component errors
 * 
 * Business Logic:
 * - Catches JavaScript errors anywhere in child component tree
 * - Logs error information for debugging
 * - Displays user-friendly fallback UI instead of white screen
 * - Provides option to recover from errors
 * - Prevents entire application crash from component-level errors
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  /**
   * Static method called when an error occurs during rendering
   * Updates state to trigger fallback UI rendering
   * 
   * @param error - The error that was thrown
   * @returns Updated state with error information
   */
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    }
  }

  /**
   * Lifecycle method called after an error has been thrown
   * Handles error logging and optional callback execution
   * 
   * @param error - The error that was thrown
   * @param errorInfo - Additional information about the error
   */
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Update state with error information
    this.setState({
      error,
      errorInfo
    })

    // Log error with context for debugging
    const context = this.props.context || 'React Component'
    logAndExtractError(error, context)

    // Execute optional error callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  /**
   * Handles user attempt to recover from error
   * Resets error boundary state to try rendering children again
   */
  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
  }

  /**
   * Renders either children (no error) or fallback UI (error occurred)
   */
  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-background-secondary">
          <div className="max-w-md w-full">
            <div className="card text-center">
              <div className="card-content">
                <div className="text-error-500 text-6xl mb-4">⚠️</div>
                <h2 className="text-xl font-semibold text-secondary-900 mb-2">
                  Something went wrong
                </h2>
                <p className="text-secondary-600 mb-6">
                  We encountered an unexpected error. This has been logged and will be investigated.
                </p>
                
                {/* Show error details in development */}
                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <details className="text-left mb-6">
                    <summary className="cursor-pointer text-secondary-500 text-sm mb-2">
                      Error Details (Development)
                    </summary>
                    <pre className="text-xs bg-secondary-100 p-3 rounded-lg overflow-auto max-h-32">
                      {this.state.error.toString()}
                      {this.state.errorInfo?.componentStack}
                    </pre>
                  </details>
                )}
                
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button 
                    onClick={this.handleRetry}
                    className="btn-primary"
                  >
                    Try Again
                  </button>
                  <button 
                    onClick={() => window.location.reload()}
                    className="btn-secondary"
                  >
                    Reload Page
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }

    // No error occurred, render children normally
    return this.props.children
  }
}

/**
 * Higher-order component to wrap components with error boundary
 * 
 * @param WrappedComponent - Component to wrap with error boundary
 * @param errorBoundaryProps - Props to pass to error boundary
 * @returns Component wrapped with error boundary
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WithErrorBoundaryComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  )

  WithErrorBoundaryComponent.displayName = `withErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`

  return WithErrorBoundaryComponent
}