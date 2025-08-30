import React, { useState, useCallback } from 'react'
import { ChevronRightIcon, ChevronDownIcon, FolderIcon, FolderOpenIcon } from '@heroicons/react/24/outline'
import { PlusIcon, EllipsisHorizontalIcon } from '@heroicons/react/24/solid'
import type { Folder, RateCard } from '../../types'

interface FolderTreeProps {
  folders: Folder[]
  selectedFolderId?: string | null
  onFolderSelect: (folderId: string | null) => void
  onFolderCreate: (parentId: string | null) => void
  onFolderEdit: (folder: Folder) => void
  onFolderDelete: (folder: Folder) => void
  onRateCardMove?: (rateCardId: string, targetFolderId: string | null) => void
  showRateCards?: boolean
  className?: string
}

interface FolderNodeProps {
  folder: Folder
  level: number
  isSelected: boolean
  expandedFolders: Set<string>
  onToggleExpand: (folderId: string) => void
  onSelect: (folderId: string | null) => void
  onFolderCreate: (parentId: string | null) => void
  onFolderEdit: (folder: Folder) => void
  onFolderDelete: (folder: Folder) => void
  onRateCardMove?: (rateCardId: string, targetFolderId: string | null) => void
  showRateCards?: boolean
}

/**
 * Memoized FolderNode component to prevent unnecessary re-renders
 * Only re-renders when props actually change
 */
const FolderNode = React.memo<FolderNodeProps>(({
  folder,
  level,
  isSelected,
  expandedFolders,
  onToggleExpand,
  onSelect,
  onFolderCreate,
  onFolderEdit,
  onFolderDelete,
  onRateCardMove,
  showRateCards = false
}) => {
  const [showMenu, setShowMenu] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const isExpanded = expandedFolders.has(folder.id)
  const hasChildren = folder.children.length > 0
  const hasRateCards = folder.rateCards && folder.rateCards.length > 0

  const handleToggleExpand = useCallback(() => {
    if (hasChildren || hasRateCards) {
      onToggleExpand(folder.id)
    }
  }, [hasChildren, hasRateCards, folder.id, onToggleExpand])

  const handleFolderClick = useCallback(() => {
    onSelect(folder.id)
  }, [folder.id, onSelect])

  const handleCreateSubfolder = useCallback(() => {
    onFolderCreate(folder.id)
    setShowMenu(false)
  }, [folder.id, onFolderCreate])

  const handleEditFolder = useCallback(() => {
    onFolderEdit(folder)
    setShowMenu(false)
  }, [folder, onFolderEdit])

  const handleDeleteFolder = useCallback(() => {
    onFolderDelete(folder)
    setShowMenu(false)
  }, [folder, onFolderDelete])

  // Drag and Drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    const rateCardId = e.dataTransfer.getData('text/plain')
    const sourceType = e.dataTransfer.getData('application/source-type')

    if (sourceType === 'rate-card' && rateCardId && onRateCardMove) {
      onRateCardMove(rateCardId, folder.id)
    }
  }, [folder.id, onRateCardMove])

  const paddingLeft = `${(level + 1) * 1.5}rem`

  return (
    <div className="select-none">
      {/* Folder Row */}
      <div
        className={`
          group relative flex items-center py-2 px-3 hover:bg-gray-50 cursor-pointer
          ${isSelected ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}
          ${isDragOver ? 'bg-green-50 border-green-300 border-l-4' : ''}
        `}
        style={{ paddingLeft }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Expand/Collapse Button */}
        <button
          onClick={handleToggleExpand}
          className="flex-shrink-0 p-1 rounded hover:bg-gray-100"
          disabled={!hasChildren && !hasRateCards}
        >
          {hasChildren || hasRateCards ? (
            isExpanded ? (
              <ChevronDownIcon className="h-4 w-4" />
            ) : (
              <ChevronRightIcon className="h-4 w-4" />
            )
          ) : (
            <div className="h-4 w-4" />
          )}
        </button>

        {/* Folder Icon */}
        <div className="flex-shrink-0 ml-1 mr-3">
          {isExpanded ? (
            <FolderOpenIcon className="h-5 w-5 text-blue-500" />
          ) : (
            <FolderIcon className="h-5 w-5 text-blue-500" />
          )}
        </div>

        {/* Folder Name */}
        <div
          className="flex-1 text-sm font-medium truncate"
          onClick={handleFolderClick}
        >
          {folder.name}
        </div>

        {/* Folder Stats */}
        <div className="flex-shrink-0 text-xs text-gray-500 mr-2">
          {hasChildren && (
            <span className="mr-2">{folder.children.length} folders</span>
          )}
          {hasRateCards && (
            <span>{folder.rateCards!.length} cards</span>
          )}
        </div>

        {/* Menu Button */}
        <div className="relative flex-shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowMenu(!showMenu)
            }}
            className="p-1 rounded hover:bg-gray-200 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <EllipsisHorizontalIcon className="h-4 w-4" />
          </button>

          {/* Dropdown Menu */}
          {showMenu && (
            <div className="absolute right-0 top-8 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50">
              <button
                onClick={handleCreateSubfolder}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                New Subfolder
              </button>
              <button
                onClick={handleEditFolder}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Edit
              </button>
              <button
                onClick={handleDeleteFolder}
                className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Children */}
      {isExpanded && (
        <div>
          {/* Subfolders */}
          {folder.children.map((child) => (
            <FolderNode
              key={child.id}
              folder={child}
              level={level + 1}
              isSelected={child.id === selectedFolderId}
              expandedFolders={expandedFolders}
              onToggleExpand={onToggleExpand}
              onSelect={onSelect}
              onFolderCreate={onFolderCreate}
              onFolderEdit={onFolderEdit}
              onFolderDelete={onFolderDelete}
              onRateCardMove={onRateCardMove}
              showRateCards={showRateCards}
            />
          ))}

          {/* Rate Cards */}
          {showRateCards && hasRateCards && (
            <div>
              {folder.rateCards!.map((rateCard) => (
                <RateCardNode
                  key={rateCard.id}
                  rateCard={rateCard}
                  level={level + 1}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Click outside to close menu */}
      {showMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  )
}

interface RateCardNodeProps {
  rateCard: RateCard
  level: number
}

/**
 * Memoized RateCardNode component to prevent unnecessary re-renders
 * Only re-renders when rateCard or level props change
 */
const RateCardNode = React.memo<RateCardNodeProps>(({ rateCard, level }) => {
  const handleDragStart = useCallback((e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', rateCard.id)
    e.dataTransfer.setData('application/source-type', 'rate-card')
    e.dataTransfer.effectAllowed = 'move'
  }, [rateCard.id])

  const paddingLeft = React.useMemo(() => `${(level + 2) * 1.5}rem`, [level])

  return (
    <div
      className="group flex items-center py-2 px-3 hover:bg-gray-50 cursor-move"
      style={{ paddingLeft }}
      draggable
      onDragStart={handleDragStart}
    >
      <div className="flex-shrink-0 ml-5 mr-3">
        <div className="h-4 w-4 bg-gray-300 rounded"></div>
      </div>
      <div className="flex-1 text-sm text-gray-600 truncate">
        {rateCard.name}
      </div>
      <div className="flex-shrink-0 text-xs text-gray-400 mr-2">
        {rateCard.pricingModel}
      </div>
      {!rateCard.isActive && (
        <div className="flex-shrink-0 text-xs text-red-500 mr-2">
          Inactive
        </div>
      )}
    </div>
  )
})

RateCardNode.displayName = 'RateCardNode'

/**
 * Main FolderTree component with memoization for tree structure optimization
 */
export const FolderTree = React.memo<FolderTreeProps>(({
  folders,
  selectedFolderId,
  onFolderSelect,
  onFolderCreate,
  onFolderEdit,
  onFolderDelete,
  onRateCardMove,
  showRateCards = false,
  className = ''
}) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())

  const handleToggleExpand = useCallback((folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev)
      if (newSet.has(folderId)) {
        newSet.delete(folderId)
      } else {
        newSet.add(folderId)
      }
      return newSet
    })
  }, [])

  const handleRootSelect = useCallback(() => {
    onFolderSelect(null)
  }, [onFolderSelect])

  const handleCreateRootFolder = useCallback(() => {
    onFolderCreate(null)
  }, [onFolderCreate])

  // Drag and Drop for root
  const [isRootDragOver, setIsRootDragOver] = useState(false)

  const handleRootDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsRootDragOver(true)
  }, [])

  const handleRootDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsRootDragOver(false)
  }, [])

  const handleRootDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsRootDragOver(false)

    const rateCardId = e.dataTransfer.getData('text/plain')
    const sourceType = e.dataTransfer.getData('application/source-type')

    if (sourceType === 'rate-card' && rateCardId && onRateCardMove) {
      onRateCardMove(rateCardId, null)
    }
  }, [onRateCardMove])

  return (
    <div className={`bg-white border border-gray-200 rounded-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Folders</h3>
        <button
          onClick={handleCreateRootFolder}
          className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
        >
          <PlusIcon className="h-4 w-4 mr-1" />
          New Folder
        </button>
      </div>

      {/* Folder Tree */}
      <div className="max-h-96 overflow-y-auto">
        {/* Root Level */}
        <div
          className={`
            group flex items-center py-3 px-4 hover:bg-gray-50 cursor-pointer border-b border-gray-100
            ${selectedFolderId === null ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}
            ${isRootDragOver ? 'bg-green-50 border-green-300 border-l-4' : ''}
          `}
          onClick={handleRootSelect}
          onDragOver={handleRootDragOver}
          onDragLeave={handleRootDragLeave}
          onDrop={handleRootDrop}
        >
          <FolderIcon className="h-5 w-5 text-blue-500 mr-3" />
          <span className="text-sm font-medium">Root</span>
        </div>

        {/* Folder Nodes */}
        {folders.map((folder) => (
          <FolderNode
            key={folder.id}
            folder={folder}
            level={0}
            isSelected={folder.id === selectedFolderId}
            expandedFolders={expandedFolders}
            onToggleExpand={handleToggleExpand}
            onSelect={onFolderSelect}
            onFolderCreate={onFolderCreate}
            onFolderEdit={onFolderEdit}
            onFolderDelete={onFolderDelete}
            onRateCardMove={onRateCardMove}
            showRateCards={showRateCards}
          />
        ))}

        {/* Empty State */}
        {folders.length === 0 && (
          <div className="py-8 text-center text-gray-500">
            <FolderIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">No folders yet</p>
            <button
              onClick={handleCreateRootFolder}
              className="mt-2 text-sm text-blue-600 hover:text-blue-700"
            >
              Create your first folder
            </button>
          </div>
        )}
      </div>
    </div>
  )
})

FolderTree.displayName = 'FolderTree'