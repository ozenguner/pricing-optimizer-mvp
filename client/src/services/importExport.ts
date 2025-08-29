import { api } from './api'
import type { PricingModel, RateCard } from '../types'

export interface ImportPreviewResult {
  success: boolean
  preview: {
    totalRows: number
    validRows: number
    errors: Array<{
      row: number
      field: string
      message: string
      value?: string
    }>
    warnings: string[]
    sampleData: Array<{
      name: string
      description?: string
      pricingModel: PricingModel
      isActive: boolean
      folderId?: string
    }>
  }
}

export interface ImportResult {
  success: boolean
  message: string
  summary?: {
    total: number
    imported: number
    skipped: number
    errors: number
    warnings: number
  }
  imported?: Array<{
    id: string
    name: string
    pricingModel: PricingModel
    folder: string
  }>
  skipped?: string[]
  warnings?: string[]
  errors?: Array<{
    row: number
    field: string
    message: string
    value?: string
  }>
  duplicates?: Array<{
    name: string
    existingId: string
  }>
  suggestion?: string
}

export interface ExportResult {
  success: boolean
  message?: string
  exports?: Record<string, string>
  suggestion?: string
}

export const importExportService = {
  async downloadTemplate(pricingModel: PricingModel): Promise<Blob> {
    const response = await api.get(`/import-export/templates/${pricingModel}`, {
      responseType: 'blob'
    })
    return response.data
  },

  async previewImport(file: File, pricingModel: PricingModel): Promise<ImportPreviewResult> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('pricingModel', pricingModel)

    const response = await api.post<ImportPreviewResult>('/import-export/preview', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    return response.data
  },

  async importRateCards(
    file: File, 
    pricingModel: PricingModel, 
    skipDuplicates: boolean = false
  ): Promise<ImportResult> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('pricingModel', pricingModel)
    formData.append('skipDuplicates', skipDuplicates.toString())

    const response = await api.post<ImportResult>('/import-export/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    return response.data
  },

  async exportRateCards(options: {
    folderId?: string | null
    pricingModel?: PricingModel
    format?: 'csv'
  } = {}): Promise<Blob | ExportResult> {
    const params = new URLSearchParams()
    
    if (options.folderId !== undefined) {
      params.append('folderId', options.folderId === null ? 'null' : options.folderId)
    }
    if (options.pricingModel) {
      params.append('pricingModel', options.pricingModel)
    }
    if (options.format) {
      params.append('format', options.format)
    }

    try {
      const response = await api.get(`/import-export/export?${params.toString()}`, {
        responseType: 'blob'
      })
      
      // Check if response is JSON (multiple pricing models case)
      const contentType = response.headers['content-type']
      if (contentType && contentType.includes('application/json')) {
        const text = await response.data.text()
        return JSON.parse(text) as ExportResult
      }
      
      return response.data as Blob
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error('No rate cards found matching the specified criteria')
      }
      throw error
    }
  },

  // Utility functions
  downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  },

  generateExportFilename(options: {
    pricingModel?: PricingModel
    folderId?: string | null
    folderName?: string
  } = {}): string {
    const date = new Date().toISOString().split('T')[0]
    
    if (options.pricingModel && options.folderName) {
      return `rate_cards_${options.pricingModel}_${options.folderName}_${date}.csv`
    } else if (options.pricingModel) {
      return `rate_cards_${options.pricingModel}_${date}.csv`
    } else if (options.folderName) {
      return `rate_cards_${options.folderName}_${date}.csv`
    } else {
      return `rate_cards_${date}.csv`
    }
  },

  validateFile(file: File): { valid: boolean; error?: string } {
    // Check file type
    if (!file.name.toLowerCase().endsWith('.csv') && 
        file.type !== 'text/csv' && 
        file.type !== 'application/csv') {
      return { valid: false, error: 'Please select a CSV file' }
    }

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return { valid: false, error: 'File size must be less than 10MB' }
    }

    // Check if file is empty
    if (file.size === 0) {
      return { valid: false, error: 'File cannot be empty' }
    }

    return { valid: true }
  },

  getTemplateFilename(pricingModel: PricingModel): string {
    const filenames: Record<PricingModel, string> = {
      'tiered': 'tiered_pricing_template.csv',
      'seat-based': 'seat_based_pricing_template.csv',
      'flat-rate': 'flat_rate_pricing_template.csv',
      'cost-plus': 'cost_plus_pricing_template.csv',
      'subscription': 'subscription_pricing_template.csv'
    }
    return filenames[pricingModel]
  },

  getPricingModelLabel(pricingModel: PricingModel): string {
    const labels: Record<PricingModel, string> = {
      'tiered': 'Tiered Pricing',
      'seat-based': 'Seat-Based Pricing',
      'flat-rate': 'Flat-Rate Pricing',
      'cost-plus': 'Cost-Plus Pricing',
      'subscription': 'Subscription Pricing'
    }
    return labels[pricingModel]
  },

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  },

  // Helper to create sample CSV content for preview
  createSampleCSV(pricingModel: PricingModel): string {
    const samples: Record<PricingModel, string> = {
      'tiered': `name,description,folderId,isActive,tier1_min,tier1_max,tier1_price,tier2_min,tier2_max,tier2_price
"Consulting Rates","Hourly consulting rates",,true,1,10,150,11,25,135`,
      
      'seat-based': `name,description,folderId,isActive,pricePerSeat,minimumSeats,discount1_minSeats,discount1_percent
"Software License","Per-seat licensing",,true,50,5,10,5`,
      
      'flat-rate': `name,description,folderId,isActive,price,billingPeriod
"Setup Fee","One-time setup",,true,5000,one-time`,
      
      'cost-plus': `name,description,folderId,isActive,baseCost,markupPercent
"Hardware Sales","Equipment resale",,true,1000,25`,
      
      'subscription': `name,description,folderId,isActive,monthlyPrice,yearlyPrice,setupFee,features
"Cloud Hosting","Basic hosting plan",,true,99,999,199,"5GB Storage; Email Support"`
    }
    
    return samples[pricingModel]
  }
}