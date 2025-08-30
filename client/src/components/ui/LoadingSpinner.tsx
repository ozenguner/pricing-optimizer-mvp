import { cn } from '../../utils/cn'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  return (
    <div className={cn(
      'loading-spinner',
      {
        'loading-spinner-sm': size === 'sm',
        'loading-spinner-md': size === 'md',
        'loading-spinner-lg': size === 'lg'
      },
      className
    )} />
  )
}