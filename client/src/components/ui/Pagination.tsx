import React from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { cn } from '../../utils/cn'

/**
 * Pagination component props interface
 */
interface PaginationProps {
  /** Current page number (1-indexed) */
  currentPage: number
  /** Total number of pages */
  totalPages: number
  /** Total number of items */
  totalCount: number
  /** Items per page */
  pageSize: number
  /** Whether there is a next page */
  hasNext: boolean
  /** Whether there is a previous page */
  hasPrev: boolean
  /** Callback when page changes */
  onPageChange: (page: number) => void
  /** Optional className for styling */
  className?: string
  /** Show page size selector */
  showPageSize?: boolean
  /** Callback when page size changes */
  onPageSizeChange?: (pageSize: number) => void
  /** Available page sizes */
  pageSizeOptions?: number[]
}

/**
 * Reusable Pagination Component
 * 
 * Business Logic:
 * - Provides navigation between pages of data
 * - Shows current page position and total count
 * - Includes page size selection for customizable data density
 * - Optimized for accessibility with proper ARIA labels
 * - Responsive design that adapts to mobile screens
 * 
 * Performance Optimizations:
 * - Uses React.memo to prevent unnecessary re-renders
 * - Memoizes page number calculations
 * - Efficient rendering of page buttons with smart truncation
 */
export const Pagination = React.memo<PaginationProps>(({
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  hasNext,
  hasPrev,
  onPageChange,
  className,
  showPageSize = false,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100]
}) => {
  /**
   * Generates array of page numbers to display with smart truncation
   * Shows first page, last page, current page, and surrounding pages
   */
  const getVisiblePages = React.useMemo(() => {
    const delta = 2 // Number of pages to show around current page
    const range = []
    const rangeWithDots = []

    for (let i = Math.max(2, currentPage - delta); 
         i <= Math.min(totalPages - 1, currentPage + delta); 
         i++) {
      range.push(i)
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...')
    } else {
      rangeWithDots.push(1)
    }

    rangeWithDots.push(...range)

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages)
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages)
    }

    return rangeWithDots.filter((v, i, arr) => arr.indexOf(v) === i)
  }, [currentPage, totalPages])

  const startItem = (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, totalCount)

  if (totalPages <= 1) return null

  return (
    <div className={cn('flex items-center justify-between border-t border-secondary-200 bg-white px-4 py-3 sm:px-6', className)}>
      {/* Mobile pagination */}
      <div className="flex flex-1 justify-between sm:hidden">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!hasPrev}
          className="relative inline-flex items-center rounded-md border border-secondary-300 bg-white px-4 py-2 text-sm font-medium text-secondary-700 hover:bg-secondary-50 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Previous page"
        >
          Previous
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!hasNext}
          className="relative ml-3 inline-flex items-center rounded-md border border-secondary-300 bg-white px-4 py-2 text-sm font-medium text-secondary-700 hover:bg-secondary-50 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Next page"
        >
          Next
        </button>
      </div>

      {/* Desktop pagination */}
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          {/* Results info */}
          <p className="text-sm text-secondary-700">
            Showing <span className="font-medium">{startItem}</span> to{' '}
            <span className="font-medium">{endItem}</span> of{' '}
            <span className="font-medium">{totalCount}</span> results
          </p>

          {/* Page size selector */}
          {showPageSize && onPageSizeChange && (
            <div className="flex items-center gap-2">
              <label htmlFor="pageSize" className="text-sm text-secondary-700">
                Show:
              </label>
              <select
                id="pageSize"
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                className="form-select py-1 px-2 text-sm border-secondary-300 rounded-md"
              >
                {pageSizeOptions.map(size => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Page navigation */}
        <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
          {/* Previous button */}
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={!hasPrev}
            className="relative inline-flex items-center rounded-l-md px-2 py-2 text-secondary-400 ring-1 ring-inset ring-secondary-300 hover:bg-secondary-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Previous page"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>

          {/* Page numbers */}
          {getVisiblePages.map((page, index) => (
            <React.Fragment key={index}>
              {page === '...' ? (
                <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-secondary-700 ring-1 ring-inset ring-secondary-300">
                  ...
                </span>
              ) : (
                <button
                  onClick={() => onPageChange(page as number)}
                  className={cn(
                    'relative inline-flex items-center px-4 py-2 text-sm font-semibold ring-1 ring-inset ring-secondary-300 hover:bg-secondary-50 focus:z-20 focus:outline-offset-0',
                    currentPage === page
                      ? 'z-10 bg-primary-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600'
                      : 'text-secondary-900'
                  )}
                  aria-current={currentPage === page ? 'page' : undefined}
                  aria-label={`Go to page ${page}`}
                >
                  {page}
                </button>
              )}
            </React.Fragment>
          ))}

          {/* Next button */}
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={!hasNext}
            className="relative inline-flex items-center rounded-r-md px-2 py-2 text-secondary-400 ring-1 ring-inset ring-secondary-300 hover:bg-secondary-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Next page"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </nav>
      </div>
    </div>
  )
})

Pagination.displayName = 'Pagination'