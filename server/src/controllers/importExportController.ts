import { Request, Response } from 'express'
import { validationResult } from 'express-validator'
import { prisma } from '../index.js'
import { AuthRequest } from '../middleware/auth.js'
import { 
  generateCSVTemplate, 
  getTemplateFilename,
  CSV_TEMPLATES 
} from '../utils/csvTemplates.js'
import { validateAndParseCSV } from '../utils/csvParser.js'
import type { PricingModel, RateCard } from '../../client/src/types/index.js'

export const downloadTemplate = async (req: AuthRequest, res: Response) => {
  try {
    const { model: pricingModel } = req.params
    
    if (!CSV_TEMPLATES[pricingModel as PricingModel]) {
      return res.status(400).json({ error: 'Invalid pricing model' })
    }
    
    const csvContent = generateCSVTemplate(pricingModel as PricingModel)
    const filename = getTemplateFilename(pricingModel as PricingModel)
    
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.send(csvContent)
  } catch (error) {
    console.error('Download template error:', error)
    res.status(500).json({ error: 'Failed to generate template' })
  }
}

export const previewImport = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    const { pricingModel } = req.body
    const userId = req.user!.id
    const fileContent = req.file.buffer.toString('utf-8')
    
    const parseResult = validateAndParseCSV(fileContent, pricingModel, userId)
    
    // Don't actually import, just return validation results
    res.json({
      success: parseResult.success,
      preview: {
        totalRows: parseResult.data.length,
        validRows: parseResult.data.length,
        errors: parseResult.errors,
        warnings: parseResult.warnings,
        sampleData: parseResult.data.slice(0, 5) // Show first 5 rows as preview
      }
    })
  } catch (error) {
    console.error('Preview import error:', error)
    res.status(500).json({ error: 'Failed to preview import' })
  }
}

export const importRateCards = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    const { pricingModel, skipDuplicates = 'false' } = req.body
    const userId = req.user!.id
    const fileContent = req.file.buffer.toString('utf-8')
    
    const parseResult = validateAndParseCSV(fileContent, pricingModel, userId)
    
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: parseResult.errors,
        warnings: parseResult.warnings
      })
    }

    // Check for duplicate names if not skipping
    const duplicateErrors: Array<{ name: string; existingId: string }> = []
    if (skipDuplicates === 'false') {
      for (const item of parseResult.data) {
        const existing = await prisma.rateCard.findFirst({
          where: { 
            name: item.name, 
            userId,
            ...(item.folderId ? { folderId: item.folderId } : { folderId: null })
          },
          select: { id: true, name: true }
        })
        
        if (existing) {
          duplicateErrors.push({ 
            name: item.name, 
            existingId: existing.id 
          })
        }
      }
      
      if (duplicateErrors.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Duplicate rate cards found',
          duplicates: duplicateErrors,
          suggestion: 'Set skipDuplicates=true to skip duplicate entries'
        })
      }
    }

    // Validate folders exist
    const folderIds = parseResult.data
      .map(item => item.folderId)
      .filter(Boolean) as string[]
    
    if (folderIds.length > 0) {
      const existingFolders = await prisma.folder.findMany({
        where: { id: { in: folderIds }, userId },
        select: { id: true }
      })
      
      const existingFolderIds = new Set(existingFolders.map(f => f.id))
      const invalidFolderIds = folderIds.filter(id => !existingFolderIds.has(id))
      
      if (invalidFolderIds.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid folder IDs found',
          invalidFolderIds
        })
      }
    }

    // Import rate cards
    const imported: RateCard[] = []
    const skipped: string[] = []
    
    for (const item of parseResult.data) {
      // Check for duplicates if skipping
      if (skipDuplicates === 'true') {
        const existing = await prisma.rateCard.findFirst({
          where: { 
            name: item.name, 
            userId,
            ...(item.folderId ? { folderId: item.folderId } : { folderId: null })
          }
        })
        
        if (existing) {
          skipped.push(item.name)
          continue
        }
      }
      
      try {
        const rateCard = await prisma.rateCard.create({
          data: {
            name: item.name,
            description: item.description,
            pricingModel: item.pricingModel,
            data: JSON.stringify(item.data),
            isActive: item.isActive,
            folderId: item.folderId,
            userId
          },
          include: {
            folder: {
              select: { id: true, name: true }
            }
          }
        })
        
        imported.push({
          ...rateCard,
          data: item.data,
          user: undefined as any,
          folder: rateCard.folder
        } as RateCard)
      } catch (error) {
        console.error(`Failed to import rate card "${item.name}":`, error)
        // Continue with other items
      }
    }

    res.json({
      success: true,
      message: `Successfully imported ${imported.length} rate cards`,
      summary: {
        total: parseResult.data.length,
        imported: imported.length,
        skipped: skipped.length,
        errors: parseResult.errors.length,
        warnings: parseResult.warnings.length
      },
      imported: imported.map(rc => ({
        id: rc.id,
        name: rc.name,
        pricingModel: rc.pricingModel,
        folder: rc.folder?.name || 'Root'
      })),
      skipped,
      warnings: parseResult.warnings
    })
  } catch (error) {
    console.error('Import rate cards error:', error)
    res.status(500).json({ error: 'Failed to import rate cards' })
  }
}

export const exportRateCards = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.user!.id
    
    // Get the specific rate card
    const rateCard = await prisma.rateCard.findFirst({
      where: { id, userId },
      include: {
        folder: {
          select: { id: true, name: true }
        }
      }
    })
    
    if (!rateCard) {
      return res.status(404).json({ error: 'Rate card not found' })
    }
    
    const csvContent = generateExportCSV([rateCard], rateCard.pricingModel as PricingModel)
    const filename = `${rateCard.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`
    
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.send(csvContent)
  } catch (error) {
    console.error('Export rate card error:', error)
    res.status(500).json({ error: 'Failed to export rate card' })
  }
}

function generateExportCSV(rateCards: any[], pricingModel: PricingModel): string {
  const template = CSV_TEMPLATES[pricingModel]
  if (!template) {
    throw new Error(`Unknown pricing model: ${pricingModel}`)
  }
  
  const lines: string[] = []
  
  // Add headers
  lines.push(template.headers.join(','))
  
  // Add data rows
  rateCards.forEach(rateCard => {
    const data = JSON.parse(rateCard.data)
    const row: string[] = []
    
    template.headers.forEach(header => {
      let value = ''
      
      switch (header) {
        case 'name':
          value = rateCard.name || ''
          break
        case 'description':
          value = rateCard.description || ''
          break
        case 'folderId':
          value = rateCard.folderId || ''
          break
        case 'isActive':
          value = rateCard.isActive ? 'true' : 'false'
          break
        default:
          value = extractFieldValue(data, header, pricingModel)
      }
      
      // Escape CSV values
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        value = `"${value.replace(/"/g, '""')}"`
      }
      
      row.push(value)
    })
    
    lines.push(row.join(','))
  })
  
  return lines.join('\n')
}

function extractFieldValue(data: any, header: string, pricingModel: PricingModel): string {
  switch (pricingModel) {
    case 'tiered':
      return extractTieredValue(data, header)
    case 'seat-based':
      return extractSeatBasedValue(data, header)
    case 'flat-rate':
      return extractFlatRateValue(data, header)
    case 'cost-plus':
      return extractCostPlusValue(data, header)
    case 'subscription':
      return extractSubscriptionValue(data, header)
    default:
      return ''
  }
}

function extractTieredValue(data: any, header: string): string {
  const match = header.match(/^tier(\d+)_(.+)$/)
  if (!match) return ''
  
  const tierIndex = parseInt(match[1]) - 1
  const field = match[2]
  
  if (!data.tiers || !data.tiers[tierIndex]) return ''
  
  const tier = data.tiers[tierIndex]
  switch (field) {
    case 'min':
      return tier.min?.toString() || ''
    case 'max':
      return tier.max?.toString() || ''
    case 'price':
      return tier.pricePerUnit?.toString() || ''
    default:
      return ''
  }
}

function extractSeatBasedValue(data: any, header: string): string {
  switch (header) {
    case 'pricePerSeat':
      return data.pricePerSeat?.toString() || ''
    case 'minimumSeats':
      return data.minimumSeats?.toString() || ''
    default:
      const discountMatch = header.match(/^discount(\d+)_(.+)$/)
      if (!discountMatch) return ''
      
      const discountIndex = parseInt(discountMatch[1]) - 1
      const field = discountMatch[2]
      
      if (!data.volumeDiscounts || !data.volumeDiscounts[discountIndex]) return ''
      
      const discount = data.volumeDiscounts[discountIndex]
      switch (field) {
        case 'minSeats':
          return discount.minSeats?.toString() || ''
        case 'percent':
          return discount.discountPercent?.toString() || ''
        default:
          return ''
      }
  }
}

function extractFlatRateValue(data: any, header: string): string {
  switch (header) {
    case 'price':
      return data.price?.toString() || ''
    case 'billingPeriod':
      return data.billingPeriod || ''
    default:
      return ''
  }
}

function extractCostPlusValue(data: any, header: string): string {
  switch (header) {
    case 'baseCost':
      return data.baseCost?.toString() || ''
    case 'markupPercent':
      return data.markupPercent?.toString() || ''
    default:
      return ''
  }
}

function extractSubscriptionValue(data: any, header: string): string {
  switch (header) {
    case 'monthlyPrice':
      return data.monthlyPrice?.toString() || ''
    case 'yearlyPrice':
      return data.yearlyPrice?.toString() || ''
    case 'setupFee':
      return data.setupFee?.toString() || ''
    case 'features':
      return data.features ? data.features.join('; ') : ''
    default:
      return ''
  }
}