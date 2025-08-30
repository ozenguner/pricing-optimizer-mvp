/**
 * Utility functions for consistent error handling across the application
 */

/**
 * Standard error structure for consistent error handling
 */
export interface AppError {
  message: string
  code?: string
  details?: any
  userFriendly: boolean
}

/**
 * Extracts user-friendly error message from various error types
 * 
 * @param error - Error object from API response or caught exception
 * @returns User-friendly error message
 */
export const extractErrorMessage = (error: any): string => {
  // Handle axios errors with response data
  if (error?.response?.data?.error) {
    return error.response.data.error
  }
  
  // Handle axios errors with message
  if (error?.response?.data?.message) {
    return error.response.data.message
  }
  
  // Handle network errors
  if (error?.code === 'NETWORK_ERROR' || error?.message?.includes('Network Error')) {
    return 'Unable to connect to the server. Please check your internet connection and try again.'
  }
  
  // Handle timeout errors
  if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
    return 'The request took too long to complete. Please try again.'
  }
  
  // Handle 401 unauthorized
  if (error?.response?.status === 401) {
    return 'Your session has expired. Please log in again.'
  }
  
  // Handle 403 forbidden
  if (error?.response?.status === 403) {
    return 'You do not have permission to perform this action.'
  }
  
  // Handle 404 not found
  if (error?.response?.status === 404) {
    return 'The requested resource was not found.'
  }
  
  // Handle 500 server errors
  if (error?.response?.status >= 500) {
    return 'A server error occurred. Please try again later or contact support.'
  }
  
  // Handle validation errors (400)
  if (error?.response?.status === 400) {
    return error?.response?.data?.error || 'The provided data is invalid. Please check your input and try again.'
  }
  
  // Handle standard Error objects
  if (error instanceof Error) {
    return error.message
  }
  
  // Handle string errors
  if (typeof error === 'string') {
    return error
  }
  
  // Fallback for unknown error types
  return 'An unexpected error occurred. Please try again.'
}

/**
 * Creates a standardized AppError object
 * 
 * @param message - Error message
 * @param code - Optional error code
 * @param details - Optional additional details
 * @param userFriendly - Whether the message is safe to show to users
 * @returns Standardized AppError object
 */
export const createAppError = (
  message: string,
  code?: string,
  details?: any,
  userFriendly: boolean = true
): AppError => {
  return {
    message,
    code,
    details,
    userFriendly
  }
}

/**
 * Logs error information for debugging while returning user-friendly message
 * 
 * @param error - Original error object
 * @param context - Context where error occurred (component name, operation, etc.)
 * @returns User-friendly error message
 */
export const logAndExtractError = (error: any, context?: string): string => {
  const userMessage = extractErrorMessage(error)
  
  // Log detailed error information for debugging
  if (process.env.NODE_ENV === 'development') {
    console.group(`🚨 Error in ${context || 'Unknown context'}`)
    console.error('Original error:', error)
    console.error('User message:', userMessage)
    console.error('Stack trace:', error?.stack)
    console.groupEnd()
  }
  
  return userMessage
}

/**
 * Handles async operation errors with consistent logging and user feedback
 * 
 * @param operation - Async function to execute
 * @param context - Context for error logging
 * @param fallbackMessage - Custom fallback error message
 * @returns Promise that resolves to result or rejects with user-friendly error
 */
export const handleAsyncError = async <T>(
  operation: () => Promise<T>,
  context: string,
  fallbackMessage?: string
): Promise<T> => {
  try {
    return await operation()
  } catch (error) {
    const userMessage = logAndExtractError(error, context)
    throw new Error(fallbackMessage || userMessage)
  }
}

/**
 * Common error messages for consistent user experience
 */
export const ErrorMessages = {
  NETWORK_ERROR: 'Unable to connect to the server. Please check your internet connection and try again.',
  TIMEOUT_ERROR: 'The request took too long to complete. Please try again.',
  UNAUTHORIZED: 'Your session has expired. Please log in again.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  SERVER_ERROR: 'A server error occurred. Please try again later or contact support.',
  VALIDATION_ERROR: 'The provided data is invalid. Please check your input and try again.',
  GENERIC_ERROR: 'An unexpected error occurred. Please try again.',
  
  // Business-specific error messages
  RATE_CARD_NOT_FOUND: 'The rate card you are looking for does not exist or has been removed.',
  INVALID_PRICING_DATA: 'The pricing configuration is invalid. Please check your pricing model settings.',
  CALCULATION_FAILED: 'Unable to calculate pricing. Please verify your input and try again.',
  IMPORT_FAILED: 'Failed to import data. Please check your file format and try again.',
  EXPORT_FAILED: 'Failed to export data. Please try again or contact support.',
  FOLDER_OPERATION_FAILED: 'Unable to complete folder operation. Please try again.',
} as const

/**
 * Type for error message keys
 */
export type ErrorMessageKey = keyof typeof ErrorMessages