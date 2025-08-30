// Design System Color Constants
// These constants ensure consistent color usage throughout the application

export const colors = {
  // Primary Brand Colors
  primary: {
    50: '#eff6ff',
    100: '#dbeafe', 
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6', // Main Primary
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },
  
  // Secondary/Gray Colors
  secondary: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb', 
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280', // Main Secondary
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
  
  // Success Colors
  success: {
    50: '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    300: '#6ee7b7',
    400: '#34d399',
    500: '#10b981', // Main Success
    600: '#059669',
    700: '#047857',
    800: '#065f46',
    900: '#064e3b',
  },
  
  // Error Colors
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444', // Main Error
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },
  
  // Background Colors
  background: {
    primary: '#ffffff',
    secondary: '#f9fafb', // Main Background
  },
} as const

// Color utility functions
export const getColorClasses = {
  // Button variants
  primaryButton: 'bg-primary-500 hover:bg-primary-600 focus:bg-primary-700 text-white',
  secondaryButton: 'bg-secondary-100 hover:bg-secondary-200 focus:bg-secondary-300 text-secondary-700 border border-secondary-300',
  successButton: 'bg-success-500 hover:bg-success-600 focus:bg-success-700 text-white',
  errorButton: 'bg-error-500 hover:bg-error-600 focus:bg-error-700 text-white',
  
  // Text variants
  primaryText: 'text-primary-600',
  secondaryText: 'text-secondary-500',
  successText: 'text-success-600',
  errorText: 'text-error-600',
  bodyText: 'text-secondary-900',
  mutedText: 'text-secondary-500',
  
  // Background variants
  primaryBg: 'bg-primary-50 border-primary-200',
  successBg: 'bg-success-50 border-success-200',
  errorBg: 'bg-error-50 border-error-200',
  cardBg: 'bg-white border border-secondary-200',
  
  // Input variants
  input: 'border-secondary-300 focus:border-primary-500 focus:ring-primary-500',
  inputError: 'border-error-300 focus:border-error-500 focus:ring-error-500',
  
  // Status indicators
  successIndicator: 'bg-success-100 text-success-800',
  errorIndicator: 'bg-error-100 text-error-800',
  warningIndicator: 'bg-yellow-100 text-yellow-800',
  infoIndicator: 'bg-primary-100 text-primary-800',
} as const

// Semantic color mapping for consistent usage
export const semanticColors = {
  // Interactive elements
  interactive: {
    primary: 'primary-500',
    hover: 'primary-600',
    active: 'primary-700',
    disabled: 'secondary-300',
  },
  
  // Feedback colors
  feedback: {
    success: 'success-500',
    error: 'error-500',
    warning: 'yellow-500',
    info: 'primary-500',
  },
  
  // Text hierarchy
  text: {
    primary: 'secondary-900',
    secondary: 'secondary-700',
    tertiary: 'secondary-500',
    inverse: 'white',
  },
  
  // Backgrounds
  backgrounds: {
    primary: 'white',
    secondary: 'background-secondary',
    elevated: 'white',
    overlay: 'secondary-900/50',
  },
  
  // Borders
  borders: {
    subtle: 'secondary-200',
    default: 'secondary-300',
    strong: 'secondary-400',
  },
} as const

// Component-specific color classes
export const componentColors = {
  card: 'bg-white border border-secondary-200 shadow-sm',
  cardHeader: 'border-b border-secondary-200',
  cardHover: 'hover:shadow-md transition-shadow',
  
  button: {
    primary: 'bg-primary-500 hover:bg-primary-600 text-white shadow-sm',
    secondary: 'bg-white hover:bg-secondary-50 text-secondary-700 border border-secondary-300 shadow-sm',
    success: 'bg-success-500 hover:bg-success-600 text-white shadow-sm',
    error: 'bg-error-500 hover:bg-error-600 text-white shadow-sm',
    ghost: 'text-secondary-700 hover:bg-secondary-100',
  },
  
  input: {
    default: 'border-secondary-300 focus:border-primary-500 focus:ring-1 focus:ring-primary-500',
    error: 'border-error-300 focus:border-error-500 focus:ring-1 focus:ring-error-500',
    disabled: 'bg-secondary-50 border-secondary-200 text-secondary-400',
  },
  
  alert: {
    success: 'bg-success-50 border-success-200 text-success-800',
    error: 'bg-error-50 border-error-200 text-error-800', 
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-primary-50 border-primary-200 text-primary-800',
  },
  
  badge: {
    primary: 'bg-primary-100 text-primary-800',
    secondary: 'bg-secondary-100 text-secondary-800',
    success: 'bg-success-100 text-success-800',
    error: 'bg-error-100 text-error-800',
  },
  
  navigation: {
    active: 'bg-primary-100 text-primary-700 border-primary-300',
    inactive: 'text-secondary-700 hover:bg-secondary-100',
    background: 'bg-white border-secondary-200',
  },
} as const