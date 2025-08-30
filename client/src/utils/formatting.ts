/**
 * Utility functions for consistent data formatting across the application
 */

/**
 * Formats a number as currency with proper locale and symbol
 * 
 * @param amount - The numerical amount to format
 * @param currency - Currency code (default: 'USD')
 * @param locale - Locale for formatting (default: 'en-US')
 * @returns Formatted currency string (e.g., "$1,234.56")
 */
export const formatCurrency = (
  amount: number, 
  currency: string = 'USD', 
  locale: string = 'en-US'
): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

/**
 * Formats a number with proper thousand separators
 * 
 * @param num - The number to format
 * @param locale - Locale for formatting (default: 'en-US')
 * @returns Formatted number string (e.g., "1,234,567")
 */
export const formatNumber = (num: number, locale: string = 'en-US'): string => {
  return new Intl.NumberFormat(locale).format(num)
}

/**
 * Formats a date to a user-friendly string
 * 
 * @param date - Date to format (Date object, string, or number)
 * @param options - Formatting options
 * @returns Formatted date string
 */
export const formatDate = (
  date: Date | string | number,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }
): string => {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date
  return dateObj.toLocaleDateString('en-US', options)
}

/**
 * Formats a date to include time
 * 
 * @param date - Date to format
 * @returns Formatted date and time string
 */
export const formatDateTime = (date: Date | string | number): string => {
  return formatDate(date, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Formats a relative time string (e.g., "2 hours ago", "in 3 days")
 * 
 * @param date - Date to compare against current time
 * @returns Relative time string
 */
export const formatRelativeTime = (date: Date | string | number): string => {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000)

  if (Math.abs(diffInSeconds) < 60) return 'Just now'
  
  const intervals = [
    { label: 'year', seconds: 31536000 },
    { label: 'month', seconds: 2592000 },
    { label: 'week', seconds: 604800 },
    { label: 'day', seconds: 86400 },
    { label: 'hour', seconds: 3600 },
    { label: 'minute', seconds: 60 }
  ]

  for (const interval of intervals) {
    const count = Math.floor(Math.abs(diffInSeconds) / interval.seconds)
    if (count >= 1) {
      const suffix = diffInSeconds < 0 ? ` in ${count}` : ` ${count}`
      const plural = count === 1 ? interval.label : `${interval.label}s`
      return diffInSeconds < 0 ? `in ${count} ${plural}` : `${count} ${plural} ago`
    }
  }

  return 'Just now'
}

/**
 * Formats file size in human-readable format
 * 
 * @param bytes - File size in bytes
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted file size string (e.g., "1.23 MB")
 */
export const formatFileSize = (bytes: number, decimals: number = 2): string => {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`
}

/**
 * Formats a percentage value
 * 
 * @param value - Decimal value (e.g., 0.15 for 15%)
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted percentage string (e.g., "15.0%")
 */
export const formatPercentage = (value: number, decimals: number = 1): string => {
  return `${(value * 100).toFixed(decimals)}%`
}