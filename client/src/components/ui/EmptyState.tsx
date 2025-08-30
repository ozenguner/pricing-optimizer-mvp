import { ReactNode } from 'react'
import { cn } from '../../utils/cn'

interface EmptyStateProps {
  icon?: string | ReactNode
  title: string
  description?: string
  action?: ReactNode
  size?: 'compact' | 'default' | 'large'
  className?: string
}

export function EmptyState({ 
  icon, 
  title, 
  description, 
  action, 
  size = 'default',
  className 
}: EmptyStateProps) {
  return (
    <div className={cn(
      'empty-state',
      {
        'empty-state-compact': size === 'compact',
        'empty-state-large': size === 'large'
      },
      className
    )}>
      {icon && (
        <div className="empty-state-icon">
          {typeof icon === 'string' ? (
            <span className="text-4xl">{icon}</span>
          ) : (
            icon
          )}
        </div>
      )}
      
      <h3 className="empty-state-title">
        {title}
      </h3>
      
      {description && (
        <p className="empty-state-description">
          {description}
        </p>
      )}
      
      {action && (
        <div>
          {action}
        </div>
      )}
    </div>
  )
}