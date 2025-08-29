import { useState, useCallback } from 'react'
import { XMarkIcon, ArrowDownTrayIcon, FolderIcon } from '@heroicons/react/24/outline'
import { importExportService } from '../../services/importExport'
import type { PricingModel } from '../../types'
import type { ExportResult } from '../../services/importExport'
import { useFolders } from '../../hooks/useFolders'

interface ExportModalProps {
  isOpen: boolean
  onClose: () => void
  currentFolderId?: string | null
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  currentFolderId
}) => {
  const [selectedPricingModel, setSelectedPricingModel] = useState<PricingModel | ''>('')
  const [selectedFolderId, setSelectedFolderId] = useState<string | null | ''>(currentFolderId ?? '')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [exportResult, setExportResult] = useState<ExportResult | null>(null)

  const { folders } = useFolders()

  const handleClose = useCallback(() => {
    setSelectedPricingModel('')
    setSelectedFolderId(currentFolderId ?? '')
    setError('')
    setExportResult(null)
    onClose()
  }, [onClose, currentFolderId])

  const handleExport = useCallback(async () => {
    setIsLoading(true)
    setError('')
    setExportResult(null)

    try {
      const options: {
        folderId?: string | null
        pricingModel?: PricingModel
        format?: 'csv'
      } = {
        format: 'csv'
      }

      // Handle folder selection
      if (selectedFolderId === 'null') {
        options.folderId = null // Root folder
      } else if (selectedFolderId && selectedFolderId !== '') {
        options.folderId = selectedFolderId
      }
      // If selectedFolderId is '', we don't set it (export all folders)

      // Handle pricing model selection
      if (selectedPricingModel) {
        options.pricingModel = selectedPricingModel
      }

      const result = await importExportService.exportRateCards(options)

      if (result instanceof Blob) {
        // Single file export
        const filename = importExportService.generateExportFilename({
          pricingModel: selectedPricingModel || undefined,
          folderId: selectedFolderId === 'null' ? null : (selectedFolderId || undefined),
          folderName: selectedFolderId && selectedFolderId !== 'null' 
            ? folders.find(f => f.id === selectedFolderId)?.name
            : selectedFolderId === 'null' ? 'Root' : undefined
        })
        importExportService.downloadBlob(result, filename)
        handleClose()
      } else {
        // Multiple files result
        setExportResult(result as ExportResult)
      }
    } catch (error: any) {
      setError(error.message || 'Failed to export rate cards')
    } finally {
      setIsLoading(false)
    }
  }, [selectedPricingModel, selectedFolderId, folders, handleClose])

  const handleDownloadMultiple = useCallback((pricingModel: string, csvContent: string) => {
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const filename = importExportService.generateExportFilename({
      pricingModel: pricingModel as PricingModel,
      folderId: selectedFolderId === 'null' ? null : (selectedFolderId || undefined),
      folderName: selectedFolderId && selectedFolderId !== 'null' 
        ? folders.find(f => f.id === selectedFolderId)?.name
        : selectedFolderId === 'null' ? 'Root' : undefined
    })
    importExportService.downloadBlob(blob, filename)
  }, [selectedFolderId, folders])

  if (!isOpen) return null

  const pricingModels: { value: PricingModel; label: string }[] = [
    { value: 'tiered', label: 'Tiered Pricing' },
    { value: 'seat-based', label: 'Seat-Based Pricing' },
    { value: 'flat-rate', label: 'Flat-Rate Pricing' },
    { value: 'cost-plus', label: 'Cost-Plus Pricing' },
    { value: 'subscription', label: 'Subscription Pricing' }
  ]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Export Rate Cards
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {!exportResult ? (
            <>
              {/* Folder Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Folder
                </label>
                <select
                  value={selectedFolderId}
                  onChange={(e) => setSelectedFolderId(e.target.value)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                  <option value="">All Folders</option>
                  <option value="null">Root (No Folder)</option>
                  {folders.map(folder => (
                    <option key={folder.id} value={folder.id}>
                      {folder.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Pricing Model Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pricing Model
                </label>
                <select
                  value={selectedPricingModel}
                  onChange={(e) => setSelectedPricingModel(e.target.value as PricingModel | '')}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                  <option value="">All Pricing Models</option>
                  {pricingModels.map(model => (
                    <option key={model.value} value={model.value}>
                      {model.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <div className="flex">
                  <ArrowDownTrayIcon className="h-5 w-5 text-blue-400 mr-3 mt-0.5" />
                  <div className="text-sm text-blue-700">
                    <p className="font-medium mb-1">Export Information</p>
                    <p>
                      Rate cards will be exported in CSV format. If multiple pricing models are found, 
                      you'll receive separate files for each model.
                    </p>
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                  {error}
                </div>
              )}
            </>
          ) : (
            /* Multiple Files Result */
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <div className="flex">
                  <ArrowDownTrayIcon className="h-5 w-5 text-yellow-400 mr-3 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-800 mb-1">
                      Multiple Pricing Models Found
                    </h4>
                    <p className="text-sm text-yellow-700">
                      {exportResult.message}
                    </p>
                    {exportResult.suggestion && (
                      <p className="text-sm text-yellow-600 mt-1">
                        {exportResult.suggestion}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <h5 className="font-medium text-gray-900 mb-3">Download Individual Files</h5>
                <div className="space-y-2">
                  {exportResult.exports && Object.entries(exportResult.exports).map(([pricingModel, csvContent]) => (
                    <div key={pricingModel} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                      <div>
                        <p className="font-medium text-gray-900">
                          {importExportService.getPricingModelLabel(pricingModel as PricingModel)}
                        </p>
                        <p className="text-sm text-gray-500">
                          CSV file with {csvContent.split('\n').length - 1} rate cards
                        </p>
                      </div>
                      <button
                        onClick={() => handleDownloadMultiple(pricingModel, csvContent)}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
                      >
                        <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                        Download
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={handleClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {exportResult ? 'Close' : 'Cancel'}
          </button>
          {!exportResult && (
            <button
              onClick={handleExport}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Exporting...' : 'Export'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}