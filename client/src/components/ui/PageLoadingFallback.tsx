import React from 'react'
import { LoadingSpinner } from './LoadingSpinner'

/**
 * Page Loading Fallback Component
 * 
 * Business Logic:
 * - Provides a consistent loading experience while lazy-loaded pages are loading
 * - Shows centered spinner with optional message for better UX
 * - Uses full viewport height to prevent layout shift
 * - Maintains brand consistency with existing loading patterns
 * 
 * Performance Benefits:
 * - Prevents blank white screen during code splitting
 * - Provides immediate visual feedback to users
 * - Allows JavaScript chunks to load in background
 */
interface PageLoadingFallbackProps {
  /** Optional loading message */
  message?: string
  /** Optional className for custom styling */
  className?: string
}

export const PageLoadingFallback = React.memo<PageLoadingFallbackProps>(({ 
  message = 'Loading page...',
  className = ''
}) => {
  return (
    <div className={`min-h-screen flex flex-col items-center justify-center bg-background-secondary ${className}`}>
      <div className="text-center">
        <LoadingSpinner size="lg" className="mx-auto mb-4" />
        <p className="text-secondary-600 text-sm font-medium">
          {message}
        </p>
      </div>
    </div>
  )
})

PageLoadingFallback.displayName = 'PageLoadingFallback'