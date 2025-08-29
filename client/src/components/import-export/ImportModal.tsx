import { useState, useCallback } from 'react'
import { XMarkIcon, DocumentArrowDownIcon, CloudArrowUpIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { importExportService } from '../../services/importExport'
import type { PricingModel } from '../../types'
import type { ImportPreviewResult, ImportResult } from '../../services/importExport'

interface ImportModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (result: ImportResult) => void
  pricingModel: PricingModel
}

type ImportStep = 'select-file' | 'preview' | 'import' | 'complete'

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  pricingModel
}) => {
  const [currentStep, setCurrentStep] = useState<ImportStep>('select-file')
  const [file, setFile] = useState<File | null>(null)
  const [previewResult, setPreviewResult] = useState<ImportPreviewResult | null>(null)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [skipDuplicates, setSkipDuplicates] = useState(false)

  const handleClose = useCallback(() => {
    setCurrentStep('select-file')
    setFile(null)
    setPreviewResult(null)
    setImportResult(null)
    setError('')
    setSkipDuplicates(false)
    onClose()
  }, [onClose])

  const handleDownloadTemplate = useCallback(async () => {
    try {
      const blob = await importExportService.downloadTemplate(pricingModel)
      const filename = importExportService.getTemplateFilename(pricingModel)
      importExportService.downloadBlob(blob, filename)
    } catch (error) {
      console.error('Failed to download template:', error)
      setError('Failed to download template')
    }
  }, [pricingModel])

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) return

    const validation = importExportService.validateFile(selectedFile)
    if (!validation.valid) {
      setError(validation.error!)
      return
    }

    setFile(selectedFile)
    setError('')
  }, [])

  const handlePreview = useCallback(async () => {
    if (!file) return

    setIsLoading(true)
    setError('')

    try {
      const result = await importExportService.previewImport(file, pricingModel)
      setPreviewResult(result)
      setCurrentStep('preview')
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to preview import')
    } finally {
      setIsLoading(false)
    }
  }, [file, pricingModel])

  const handleImport = useCallback(async () => {
    if (!file) return

    setIsLoading(true)
    setError('')

    try {
      const result = await importExportService.importRateCards(file, pricingModel, skipDuplicates)
      
      if (result.success) {
        setImportResult(result)
        setCurrentStep('complete')
        onSuccess(result)
      } else if (result.duplicates) {
        // Handle duplicate case
        setImportResult(result)
        setCurrentStep('preview')
      } else {
        setError(result.message || 'Import failed')
      }
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to import rate cards')
    } finally {
      setIsLoading(false)
    }
  }, [file, pricingModel, skipDuplicates, onSuccess])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Import {importExportService.getPricingModelLabel(pricingModel)} Rate Cards
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {currentStep === 'select-file' && (
            <div className="space-y-6">
              {/* Download Template */}
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <div className="flex">
                  <DocumentArrowDownIcon className="h-5 w-5 text-blue-400 mr-3 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-blue-800 mb-1">
                      Download Template
                    </h4>
                    <p className="text-sm text-blue-700 mb-3">
                      Get the CSV template with sample data and instructions for {importExportService.getPricingModelLabel(pricingModel)}.
                    </p>
                    <button
                      onClick={handleDownloadTemplate}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
                    >
                      <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                      Download Template
                    </button>
                  </div>
                </div>
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select CSV File
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-gray-400">
                  <div className="space-y-1 text-center">
                    <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600">
                      <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                      >
                        <span>Upload a file</span>
                        <input
                          id="file-upload"
                          name="file-upload"
                          type="file"
                          accept=".csv"
                          className="sr-only"
                          onChange={handleFileSelect}
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">CSV up to 10MB</p>
                  </div>
                </div>
              </div>

              {/* Selected File */}
              {file && (
                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                  <div className="flex items-center">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-800">{file.name}</p>
                      <p className="text-sm text-green-600">
                        {importExportService.formatFileSize(file.size)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                  {error}
                </div>
              )}
            </div>
          )}

          {currentStep === 'preview' && previewResult && (
            <div className="space-y-6">
              {/* Preview Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-lg font-medium text-gray-900 mb-4">Import Preview</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Total Rows:</span>
                    <span className="ml-2 text-gray-900">{previewResult.preview.totalRows}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Valid Rows:</span>
                    <span className="ml-2 text-green-600">{previewResult.preview.validRows}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Errors:</span>
                    <span className="ml-2 text-red-600">{previewResult.preview.errors.length}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Warnings:</span>
                    <span className="ml-2 text-yellow-600">{previewResult.preview.warnings.length}</span>
                  </div>
                </div>
              </div>

              {/* Errors */}
              {previewResult.preview.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <h5 className="font-medium text-red-800 mb-2">Errors Found</h5>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {previewResult.preview.errors.map((error, index) => (
                      <p key={index} className="text-sm text-red-700">
                        Row {error.row}, {error.field}: {error.message}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Duplicate Handling */}
              {importResult?.duplicates && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <div className="flex">
                    <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mr-3" />
                    <div className="flex-1">
                      <h5 className="font-medium text-yellow-800 mb-2">
                        {importResult.duplicates.length} Duplicate Rate Cards Found
                      </h5>
                      <div className="space-y-1 mb-4 max-h-32 overflow-y-auto">
                        {importResult.duplicates.map((dup, index) => (
                          <p key={index} className="text-sm text-yellow-700">
                            "{dup.name}"
                          </p>
                        ))}
                      </div>
                      <label className="flex items-center text-sm">
                        <input
                          type="checkbox"
                          checked={skipDuplicates}
                          onChange={(e) => setSkipDuplicates(e.target.checked)}
                          className="mr-2"
                        />
                        Skip duplicate entries and import only new rate cards
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Sample Data */}
              {previewResult.preview.sampleData.length > 0 && (
                <div>
                  <h5 className="font-medium text-gray-900 mb-2">Sample Data (First 5 rows)</h5>
                  <div className="border border-gray-200 rounded-md overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Active</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {previewResult.preview.sampleData.map((item, index) => (
                            <tr key={index}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {item.name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {item.description || '—'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  item.isActive 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {item.isActive ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                  {error}
                </div>
              )}
            </div>
          )}

          {currentStep === 'complete' && importResult && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                  <CloudArrowUpIcon className="h-6 w-6 text-green-600" />
                </div>
                <div className="mt-3">
                  <h3 className="text-lg font-medium text-gray-900">Import Complete</h3>
                  <p className="mt-2 text-sm text-gray-500">{importResult.message}</p>
                </div>
              </div>

              {/* Summary */}
              {importResult.summary && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Import Summary</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Total Processed:</span>
                      <span className="ml-2 text-gray-900">{importResult.summary.total}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Successfully Imported:</span>
                      <span className="ml-2 text-green-600">{importResult.summary.imported}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Skipped:</span>
                      <span className="ml-2 text-yellow-600">{importResult.summary.skipped}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Warnings:</span>
                      <span className="ml-2 text-orange-600">{importResult.summary.warnings}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Imported Items */}
              {importResult.imported && importResult.imported.length > 0 && (
                <div>
                  <h5 className="font-medium text-gray-900 mb-2">Imported Rate Cards</h5>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {importResult.imported.map((item) => (
                      <div key={item.id} className="flex items-center text-sm">
                        <div className="flex-1">
                          <span className="font-medium text-gray-900">{item.name}</span>
                          <span className="text-gray-500 ml-2">({item.pricingModel})</span>
                        </div>
                        <span className="text-gray-400">{item.folder}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
          {currentStep === 'select-file' && (
            <>
              <button
                onClick={handleClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handlePreview}
                disabled={!file || isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? 'Processing...' : 'Preview Import'}
              </button>
            </>
          )}

          {currentStep === 'preview' && (
            <>
              <button
                onClick={() => setCurrentStep('select-file')}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={handleImport}
                disabled={!previewResult?.success || isLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {isLoading ? 'Importing...' : 'Import Rate Cards'}
              </button>
            </>
          )}

          {currentStep === 'complete' && (
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  )
}