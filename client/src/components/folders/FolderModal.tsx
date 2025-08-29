import { useState, useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { folderService } from '../../services/folders'
import type { Folder } from '../../types'

interface FolderModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (folder: Folder) => void
  folder?: Folder // For editing
  parentFolder?: Folder | null // For creating subfolders
  mode: 'create' | 'edit'
}

export const FolderModal: React.FC<FolderModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  folder,
  parentFolder,
  mode
}) => {
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && folder) {
        setName(folder.name)
      } else {
        setName('')
      }
      setError('')
    }
  }, [isOpen, mode, folder])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const validation = folderService.validateFolderName(name)
    if (!validation.isValid) {
      setError(validation.error!)
      return
    }

    setIsLoading(true)
    setError('')

    try {
      let result: Folder

      if (mode === 'create') {
        const response = await folderService.create({
          name: name.trim(),
          parentId: parentFolder?.id || null
        })
        result = response.folder
      } else {
        const response = await folderService.update(folder!.id, {
          name: name.trim()
        })
        result = response.folder
      }

      onSuccess(result)
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.error || `Failed to ${mode} folder`)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            {mode === 'create' ? 'Create New Folder' : 'Edit Folder'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Parent Folder Info */}
          {mode === 'create' && parentFolder && (
            <div className="mb-4 p-3 bg-gray-50 rounded-md">
              <p className="text-sm text-gray-600">
                Creating folder in: <span className="font-medium">{parentFolder.name}</span>
              </p>
            </div>
          )}

          {mode === 'create' && !parentFolder && (
            <div className="mb-4 p-3 bg-gray-50 rounded-md">
              <p className="text-sm text-gray-600">
                Creating folder in: <span className="font-medium">Root</span>
              </p>
            </div>
          )}

          {/* Folder Name Input */}
          <div className="mb-6">
            <label htmlFor="folder-name" className="block text-sm font-medium text-gray-700 mb-2">
              Folder Name
            </label>
            <input
              id="folder-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter folder name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isLoading}
              autoFocus
            />
            {error && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              disabled={isLoading || !name.trim()}
            >
              {isLoading ? 'Saving...' : mode === 'create' ? 'Create Folder' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface DeleteFolderModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (moveRateCardsTo?: string) => void
  folder: Folder | null
  availableFolders: Folder[]
  isLoading: boolean
}

export const DeleteFolderModal: React.FC<DeleteFolderModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  folder,
  availableFolders,
  isLoading
}) => {
  const [moveRateCardsTo, setMoveRateCardsTo] = useState<string>('root')

  if (!isOpen || !folder) return null

  const hasRateCards = folder.rateCards && folder.rateCards.length > 0
  const hasSubfolders = folder.children && folder.children.length > 0
  const rateCardCount = folder.rateCards?.length || 0

  const handleConfirm = () => {
    if (hasRateCards) {
      onConfirm(moveRateCardsTo === 'root' ? undefined : moveRateCardsTo)
    } else {
      onConfirm()
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-red-900">
            Delete Folder
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {hasSubfolders ? (
            <div className="mb-4">
              <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-md">
                <div className="text-sm text-red-800">
                  <p className="font-medium">Cannot delete folder</p>
                  <p>This folder contains {folder.children.length} subfolder(s). Please move or delete them first.</p>
                </div>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-700 mb-4">
                Are you sure you want to delete the folder "<strong>{folder.name}</strong>"?
              </p>

              {hasRateCards && (
                <div className="mb-4">
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md mb-4">
                    <p className="text-sm text-yellow-800 font-medium">
                      This folder contains {rateCardCount} rate card(s).
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Move rate cards to:
                    </label>
                    <select
                      value={moveRateCardsTo}
                      onChange={(e) => setMoveRateCardsTo(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={isLoading}
                    >
                      <option value="root">Root (No folder)</option>
                      {availableFolders
                        .filter(f => f.id !== folder.id)
                        .map(f => (
                          <option key={f.id} value={f.id}>
                            {f.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            disabled={isLoading}
          >
            Cancel
          </button>
          {!hasSubfolders && (
            <button
              onClick={handleConfirm}
              className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? 'Deleting...' : 'Delete Folder'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}