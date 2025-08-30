import { useState, useCallback } from 'react'
import { PlusIcon, FolderIcon, DocumentArrowUpIcon, DocumentArrowDownIcon, EllipsisHorizontalIcon } from '@heroicons/react/24/outline'
import { FolderTree } from '../components/folders/FolderTree'
import { ImportModal, ExportModal } from '../components/import-export'
import { FolderModal } from '../components/folders/FolderModal'
import { Pagination } from '../components/ui/Pagination'
import { useFolders, useRateCards } from '../hooks'
import type { Folder, PricingModel, RateCard } from '../types'
import type { ImportResult } from '../services/importExport'

export function RateCards() {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [showCreateRateCardModal, setShowCreateRateCardModal] = useState(false)
  const [showFolderModal, setShowFolderModal] = useState(false)
  const [selectedPricingModel, setSelectedPricingModel] = useState<PricingModel>('tiered')
  const [folderModalData, setFolderModalData] = useState<{ folder?: Folder; parentId?: string | null }>({ parentId: null })

  const { folders, loading: foldersLoading, createFolder, updateFolder, deleteFolder, moveRateCard } = useFolders()
  const { rateCards, pagination, loading: rateCardsLoading, fetchRateCards } = useRateCards(selectedFolderId || undefined, currentPage, pageSize)

  const handleFolderSelect = useCallback((folderId: string | null) => {
    setSelectedFolderId(folderId)
    setCurrentPage(1) // Reset to first page when changing folders
  }, [])
  
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page)
  }, [])
  
  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSize(newPageSize)
    setCurrentPage(1) // Reset to first page when changing page size
  }, [])

  const handleFolderCreate = useCallback((parentId: string | null) => {
    setFolderModalData({ parentId })
    setShowFolderModal(true)
  }, [])

  const handleFolderEdit = useCallback((folder: Folder) => {
    setFolderModalData({ folder, parentId: folder.parentId })
    setShowFolderModal(true)
  }, [])

  const handleFolderDelete = useCallback(async (folder: Folder) => {
    if (confirm(`Are you sure you want to delete "${folder.name}"? All rate cards will be moved to the root folder.`)) {
      try {
        await deleteFolder(folder.id)
      } catch (error) {
        alert(`Failed to delete folder: ${error}`)
      }
    }
  }, [deleteFolder])

  const handleImportSuccess = useCallback(async (result: ImportResult) => {
    await fetchRateCards() // Refresh rate cards after import
    alert(`Successfully imported ${result.summary?.imported || 0} rate cards`)
  }, [fetchRateCards])

  const pricingModels: { value: PricingModel; label: string }[] = [
    { value: 'tiered', label: 'Tiered Pricing' },
    { value: 'seat-based', label: 'Seat-Based Pricing' },
    { value: 'flat-rate', label: 'Flat-Rate Pricing' },
    { value: 'cost-plus', label: 'Cost-Plus Pricing' },
    { value: 'subscription', label: 'Subscription Pricing' }
  ]

  const selectedFolder = folders.find(f => f.id === selectedFolderId)
  const displayName = selectedFolderId ? selectedFolder?.name || 'Unknown Folder' : 'All Rate Cards'
  const hasRateCards = rateCards.length > 0

  return (
    <div className="flex h-[calc(100vh-120px)]">
      {/* Sidebar with folder tree */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Folders</h2>
            <button
              onClick={() => handleFolderCreate(null)}
              className="p-1 text-gray-400 hover:text-gray-600"
              title="Create folder"
            >
              <PlusIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <FolderTree
            folders={folders}
            selectedFolderId={selectedFolderId}
            onFolderSelect={handleFolderSelect}
            onFolderCreate={handleFolderCreate}
            onFolderEdit={handleFolderEdit}
            onFolderDelete={handleFolderDelete}
            onRateCardMove={moveRateCard}
            showRateCards={true}
          />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{displayName}</h1>
              <p className="mt-2 text-gray-600">
                {selectedFolderId ? 'Rate cards in this folder' : 'All your rate cards across all folders'}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              {/* Import/Export buttons */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowImportModal(true)}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <DocumentArrowUpIcon className="h-4 w-4 mr-2" />
                  Import
                </button>
                <button
                  onClick={() => setShowExportModal(true)}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                  Export
                </button>
              </div>
              {/* Create Rate Card button */}
              <button
                onClick={() => setShowCreateRateCardModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Create Rate Card
              </button>
            </div>
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto p-6">
          {rateCardsLoading || foldersLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : hasRateCards ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rateCards.map((rateCard) => (
                <div key={rateCard.id} className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-medium text-gray-900 truncate">{rateCard.name}</h3>
                        {rateCard.description && (
                          <p className="mt-1 text-sm text-gray-500 line-clamp-2">{rateCard.description}</p>
                        )}
                      </div>
                      <button className="ml-2 text-gray-400 hover:text-gray-600">
                        <EllipsisHorizontalIcon className="h-5 w-5" />
                      </button>
                    </div>
                    
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center text-sm text-gray-500">
                        <span className="capitalize">{rateCard.pricingModel.replace('-', ' ')}</span>
                        {rateCard.folder && (
                          <>
                            <span className="mx-2">•</span>
                            <FolderIcon className="h-4 w-4 mr-1" />
                            <span>{rateCard.folder.name}</span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        {rateCard.isActive ? (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                            Inactive
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <span className="text-6xl">📋</span>
              <h3 className="text-lg font-medium text-gray-900 mt-4">
                {selectedFolderId ? 'No rate cards in this folder' : 'No rate cards yet'}
              </h3>
              <p className="text-gray-600 mt-2">
                {selectedFolderId 
                  ? 'Create a rate card or move one from another folder' 
                  : 'Create your first rate card to get started with pricing optimization'
                }
              </p>
              <div className="mt-6 flex justify-center space-x-4">
                <button
                  onClick={() => setShowCreateRateCardModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Create Rate Card
                </button>
                <button
                  onClick={() => setShowImportModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <DocumentArrowUpIcon className="h-4 w-4 mr-2" />
                  Import from CSV
                </button>
              </div>
            </div>
          )}
          
          {/* Pagination */}
          {rateCards.length > 0 && pagination.totalPages > 1 && (
            <Pagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              totalCount={pagination.totalCount}
              pageSize={pagination.pageSize}
              hasNext={pagination.hasNext}
              hasPrev={pagination.hasPrev}
              onPageChange={handlePageChange}
              showPageSize={true}
              onPageSizeChange={handlePageSizeChange}
              pageSizeOptions={[10, 20, 50]}
              className="mt-6"
            />
          )}
        </div>
      </div>

      {/* Modals */}
      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={handleImportSuccess}
        pricingModel={selectedPricingModel}
      />

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        currentFolderId={selectedFolderId}
      />

      <FolderModal
        isOpen={showFolderModal}
        onClose={() => setShowFolderModal(false)}
        folder={folderModalData.folder}
        parentId={folderModalData.parentId}
        onSubmit={async (data) => {
          try {
            if (folderModalData.folder) {
              await updateFolder(folderModalData.folder.id, data.name, data.parentId)
            } else {
              await createFolder(data.name, data.parentId || undefined)
            }
            setShowFolderModal(false)
          } catch (error: any) {
            throw error
          }
        }}
      />
    </div>
  )
}

export default RateCards