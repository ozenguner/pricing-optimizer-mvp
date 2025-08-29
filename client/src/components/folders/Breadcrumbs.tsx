import { ChevronRightIcon, HomeIcon } from '@heroicons/react/24/outline'

interface BreadcrumbItem {
  id: string
  name: string
  isRoot?: boolean
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
  onNavigate: (folderId: string | null) => void
  className?: string
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  items,
  onNavigate,
  className = ''
}) => {
  const handleClick = (item: BreadcrumbItem) => {
    if (item.isRoot || item.id === 'root') {
      onNavigate(null)
    } else {
      onNavigate(item.id)
    }
  }

  if (items.length === 0) {
    return (
      <nav className={`flex items-center space-x-2 text-sm text-gray-500 ${className}`}>
        <HomeIcon className="h-4 w-4" />
        <span>Root</span>
      </nav>
    )
  }

  return (
    <nav className={`flex items-center space-x-2 text-sm ${className}`} aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2">
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          const isRoot = item.isRoot || item.id === 'root'

          return (
            <li key={item.id} className="flex items-center">
              {/* Separator */}
              {index > 0 && (
                <ChevronRightIcon className="h-4 w-4 text-gray-400 mx-2" />
              )}

              {/* Breadcrumb Item */}
              <button
                onClick={() => handleClick(item)}
                className={`
                  flex items-center px-2 py-1 rounded-md transition-colors
                  ${isLast 
                    ? 'text-gray-900 font-medium bg-gray-100 cursor-default' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }
                `}
                disabled={isLast}
                aria-current={isLast ? 'page' : undefined}
              >
                {isRoot && (
                  <HomeIcon className="h-4 w-4 mr-1" />
                )}
                <span className="truncate max-w-32">
                  {item.name}
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

interface FolderBreadcrumbsProps {
  currentPath: Array<{ id: string; name: string }>
  onNavigate: (folderId: string | null) => void
  className?: string
  showCreateButton?: boolean
  onCreateFolder?: () => void
}

export const FolderBreadcrumbs: React.FC<FolderBreadcrumbsProps> = ({
  currentPath,
  onNavigate,
  className = '',
  showCreateButton = false,
  onCreateFolder
}) => {
  const breadcrumbItems: BreadcrumbItem[] = [
    { id: 'root', name: 'Root', isRoot: true },
    ...currentPath.map(item => ({ ...item, isRoot: false }))
  ]

  return (
    <div className={`flex items-center justify-between ${className}`}>
      <Breadcrumbs 
        items={breadcrumbItems}
        onNavigate={onNavigate}
      />
      
      {showCreateButton && onCreateFolder && (
        <button
          onClick={onCreateFolder}
          className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
        >
          New Folder
        </button>
      )}
    </div>
  )
}