import { useState, useCallback } from 'react'
import { DocumentArrowUpIcon, DocumentArrowDownIcon, ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { ImportModal, ExportModal } from '../components/import-export'
import { importExportService, type ImportResult, type ExportOptions } from '../services/importExport'
import type { PricingModel } from '../types'

interface ImportHistory {
  id: string
  fileName: string
  timestamp: string
  status: 'success' | 'failed' | 'partial'
  result: ImportResult
}

export function ImportExport() {
  const [showImportModal, setShowImportModal] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [importHistory, setImportHistory] = useState<ImportHistory[]>([])
  const [selectedPricingModel, setSelectedPricingModel] = useState<PricingModel>('tiered')

  const handleImportSuccess = useCallback((result: ImportResult, fileName: string) => {
    const historyItem: ImportHistory = {
      id: Date.now().toString(),
      fileName,
      timestamp: new Date().toISOString(),
      status: result.errors && result.errors.length > 0 ? 'partial' : 'success',
      result
    }
    
    setImportHistory(prev => [historyItem, ...prev.slice(0, 9)]) // Keep last 10 imports
    setShowImportModal(false)
  }, [])

  const handleImportError = useCallback((fileName: string, error: string) => {
    const historyItem: ImportHistory = {
      id: Date.now().toString(),
      fileName,
      timestamp: new Date().toISOString(),
      status: 'failed',
      result: {
        summary: { imported: 0, failed: 1, total: 1 },
        errors: [{ row: 0, message: error }]
      }
    }
    
    setImportHistory(prev => [historyItem, ...prev.slice(0, 9)])
    setShowImportModal(false)
  }, [])

  const downloadTemplate = async (pricingModel: PricingModel) => {
    try {
      const response = await importExportService.downloadTemplate(pricingModel)
      
      // Create download link
      const blob = new Blob([response], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${pricingModel}-template.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to download template:', error)
      alert('Failed to download template')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusIcon = (status: ImportHistory['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircleIcon className="h-5 w-5 text-green-600" />
      case 'failed':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
      case 'partial':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />
    }
  }

  const getStatusText = (status: ImportHistory['status']) => {
    switch (status) {
      case 'success':
        return 'Success'
      case 'failed':
        return 'Failed'
      case 'partial':
        return 'Partial Success'
    }
  }

  const getStatusColor = (status: ImportHistory['status']) => {
    switch (status) {
      case 'success':
        return 'text-green-600'
      case 'failed':
        return 'text-red-600'
      case 'partial':
        return 'text-yellow-600'
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Import & Export</h1>
        <p className="mt-2 text-gray-600">
          Manage your rate card data with CSV import and export functionality
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Import Section */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-medium text-gray-900">Import Rate Cards</h2>
          </div>
          <div className="card-body space-y-4">
            <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
              <DocumentArrowUpIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Import from CSV</h3>
              <p className="text-gray-600 mb-4">Upload a CSV file to import multiple rate cards at once</p>
              
              <div className="space-y-3">
                <div>
                  <label className="form-label text-sm">Pricing Model for Import</label>
                  <select
                    value={selectedPricingModel}
                    onChange={(e) => setSelectedPricingModel(e.target.value as PricingModel)}
                    className="form-input max-w-xs mx-auto"
                  >
                    <option value="tiered">Tiered Pricing</option>
                    <option value="seat-based">Seat-Based Pricing</option>
                    <option value="flat-rate">Flat-Rate Pricing</option>
                    <option value="cost-plus">Cost-Plus Pricing</option>
                    <option value="subscription">Subscription Pricing</option>
                  </select>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={() => downloadTemplate(selectedPricingModel)}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Download Template
                  </button>
                  <button
                    onClick={() => setShowImportModal(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
                  >
                    <DocumentArrowUpIcon className="h-4 w-4 mr-2" />
                    Upload CSV File
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-2">Import Guidelines:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Download the template for your pricing model first</li>
                <li>• Fill in all required fields in the CSV</li>
                <li>• Each row represents one rate card</li>
                <li>• Validation errors will be shown after upload</li>
                <li>• Existing rate cards with the same name will be updated</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Export Section */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-medium text-gray-900">Export Rate Cards</h2>
          </div>
          <div className="card-body space-y-4">
            <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
              <DocumentArrowDownIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Export to CSV</h3>
              <p className="text-gray-600 mb-4">Export your rate cards to CSV format for backup or analysis</p>
              
              <button
                onClick={() => setShowExportModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
              >
                <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                Export Rate Cards
              </button>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-green-900 mb-2">Export Features:</h4>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• Export all rate cards or filter by folder</li>
                <li>• Choose specific pricing models to export</li>
                <li>• Include active and inactive rate cards</li>
                <li>• Structured CSV format compatible with import</li>
                <li>• Includes all pricing data and metadata</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Import History */}
      {importHistory.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-medium text-gray-900">Import History</h2>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              {importHistory.map((item) => (
                <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      {getStatusIcon(item.status)}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium text-gray-900">{item.fileName}</h3>
                          <span className={`text-sm font-medium ${getStatusColor(item.status)}`}>
                            {getStatusText(item.status)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {formatDate(item.timestamp)}
                        </p>
                        
                        {item.result.summary && (
                          <div className="mt-2 text-sm">
                            <span className="text-green-600">
                              ✓ {item.result.summary.imported} imported
                            </span>
                            {item.result.summary.failed > 0 && (
                              <span className="text-red-600 ml-4">
                                ✗ {item.result.summary.failed} failed
                              </span>
                            )}
                            <span className="text-gray-500 ml-4">
                              of {item.result.summary.total} total
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Show errors if any */}
                  {item.result.errors && item.result.errors.length > 0 && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                      <h4 className="text-sm font-medium text-red-900 mb-2">Errors:</h4>
                      <div className="space-y-1">
                        {item.result.errors.slice(0, 5).map((error, index) => (
                          <div key={index} className="text-sm text-red-800">
                            Row {error.row}: {error.message}
                          </div>
                        ))}
                        {item.result.errors.length > 5 && (
                          <div className="text-sm text-red-600 mt-1">
                            ... and {item.result.errors.length - 5} more errors
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Show successful imports */}
                  {item.result.imported && item.result.imported.length > 0 && (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                      <h4 className="text-sm font-medium text-green-900 mb-2">Successfully Imported:</h4>
                      <div className="space-y-1">
                        {item.result.imported.slice(0, 3).map((rateCard, index) => (
                          <div key={index} className="text-sm text-green-800">
                            {rateCard.name} ({rateCard.pricingModel})
                          </div>
                        ))}
                        {item.result.imported.length > 3 && (
                          <div className="text-sm text-green-600 mt-1">
                            ... and {item.result.imported.length - 3} more rate cards
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={handleImportSuccess}
        onError={handleImportError}
        pricingModel={selectedPricingModel}
      />

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        currentFolderId={null}
      />
    </div>
  )
}

export default ImportExport