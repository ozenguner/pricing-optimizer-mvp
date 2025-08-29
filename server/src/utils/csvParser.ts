import type { 
  PricingModel, 
  PricingData, 
  TieredPricing, 
  SeatBasedPricing, 
  FlatRatePricing, 
  CostPlusPricing, 
  SubscriptionPricing 
} from '../../client/src/types/index.js'

export interface ParsedCSVRow {
  [key: string]: string
}

export interface CSVValidationError {
  row: number
  field: string
  message: string
  value?: string
}

export interface CSVParseResult {
  success: boolean
  data: Array<{
    name: string
    description?: string
    pricingModel: PricingModel
    data: PricingData
    isActive: boolean
    folderId?: string
  }>
  errors: CSVValidationError[]
  warnings: string[]
}

export function parseCSV(content: string): ParsedCSVRow[] {
  const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0)
  
  // Remove comment lines (starting with #)
  const dataLines = lines.filter(line => !line.startsWith('#'))
  
  if (dataLines.length < 2) {
    throw new Error('CSV must contain at least a header row and one data row')
  }
  
  const headers = parseCSVLine(dataLines[0])
  const rows: ParsedCSVRow[] = []
  
  for (let i = 1; i < dataLines.length; i++) {
    const values = parseCSVLine(dataLines[i])
    const row: ParsedCSVRow = {}
    
    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })
    
    rows.push(row)
  }
  
  return rows
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"'
        i++ // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  
  result.push(current.trim())
  return result
}

export function validateAndParseCSV(
  content: string, 
  pricingModel: PricingModel,
  userId: string
): CSVParseResult {
  const errors: CSVValidationError[] = []
  const warnings: string[] = []
  const data: Array<{
    name: string
    description?: string
    pricingModel: PricingModel
    data: PricingData
    isActive: boolean
    folderId?: string
  }> = []
  
  try {
    const rows = parseCSV(content)
    
    rows.forEach((row, index) => {
      const rowNumber = index + 2 // +2 because index is 0-based and we skip header
      
      // Validate required fields
      if (!row.name || row.name.trim().length === 0) {
        errors.push({
          row: rowNumber,
          field: 'name',
          message: 'Name is required',
          value: row.name
        })
        return
      }
      
      if (row.name.length > 100) {
        errors.push({
          row: rowNumber,
          field: 'name',
          message: 'Name must be 100 characters or less',
          value: row.name
        })
      }
      
      // Validate isActive
      const isActive = parseBoolean(row.isActive)
      if (isActive === null) {
        errors.push({
          row: rowNumber,
          field: 'isActive',
          message: 'isActive must be true or false',
          value: row.isActive
        })
        return
      }
      
      // Validate folderId if provided
      if (row.folderId && !isValidUUID(row.folderId)) {
        errors.push({
          row: rowNumber,
          field: 'folderId',
          message: 'folderId must be a valid UUID',
          value: row.folderId
        })
      }
      
      // Parse pricing data based on model
      let pricingData: PricingData
      const parseResult = parsePricingData(row, pricingModel, rowNumber)
      
      if (parseResult.errors.length > 0) {
        errors.push(...parseResult.errors)
        return
      }
      
      if (parseResult.warnings.length > 0) {
        warnings.push(...parseResult.warnings)
      }
      
      pricingData = parseResult.data
      
      // If no errors for this row, add to results
      if (!errors.some(e => e.row === rowNumber)) {
        data.push({
          name: row.name.trim(),
          description: row.description?.trim() || undefined,
          pricingModel,
          data: pricingData,
          isActive: isActive!,
          folderId: row.folderId?.trim() || undefined
        })
      }
    })
    
  } catch (error) {
    errors.push({
      row: 0,
      field: 'file',
      message: error instanceof Error ? error.message : 'Failed to parse CSV'
    })
  }
  
  return {
    success: errors.length === 0,
    data,
    errors,
    warnings
  }
}

function parsePricingData(
  row: ParsedCSVRow, 
  pricingModel: PricingModel, 
  rowNumber: number
): { data: PricingData; errors: CSVValidationError[]; warnings: string[] } {
  const errors: CSVValidationError[] = []
  const warnings: string[] = []
  
  switch (pricingModel) {
    case 'tiered':
      return parseTieredPricing(row, rowNumber)
    case 'seat-based':
      return parseSeatBasedPricing(row, rowNumber)
    case 'flat-rate':
      return parseFlatRatePricing(row, rowNumber)
    case 'cost-plus':
      return parseCostPlusPricing(row, rowNumber)
    case 'subscription':
      return parseSubscriptionPricing(row, rowNumber)
    default:
      errors.push({
        row: rowNumber,
        field: 'pricingModel',
        message: `Unsupported pricing model: ${pricingModel}`
      })
      return { data: {} as PricingData, errors, warnings }
  }
}

function parseTieredPricing(row: ParsedCSVRow, rowNumber: number): { data: TieredPricing; errors: CSVValidationError[]; warnings: string[] } {
  const errors: CSVValidationError[] = []
  const warnings: string[] = []
  const tiers: Array<{ min: number; max: number | null; pricePerUnit: number }> = []
  
  for (let i = 1; i <= 5; i++) {
    const minKey = `tier${i}_min`
    const maxKey = `tier${i}_max`
    const priceKey = `tier${i}_price`
    
    const minStr = row[minKey]
    const maxStr = row[maxKey]
    const priceStr = row[priceKey]
    
    // Skip empty tiers
    if (!minStr && !maxStr && !priceStr) continue
    
    // Validate tier has all required fields
    if (!minStr || !priceStr) {
      if (minStr || maxStr || priceStr) {
        errors.push({
          row: rowNumber,
          field: minKey,
          message: `Tier ${i}: min and price are required if tier is defined`
        })
      }
      continue
    }
    
    const min = parseFloat(minStr)
    const max = maxStr ? parseFloat(maxStr) : null
    const price = parseFloat(priceStr)
    
    if (isNaN(min) || min < 0) {
      errors.push({
        row: rowNumber,
        field: minKey,
        message: `Tier ${i}: min must be a non-negative number`,
        value: minStr
      })
      continue
    }
    
    if (max !== null && (isNaN(max) || max <= min)) {
      errors.push({
        row: rowNumber,
        field: maxKey,
        message: `Tier ${i}: max must be greater than min`,
        value: maxStr
      })
      continue
    }
    
    if (isNaN(price) || price < 0) {
      errors.push({
        row: rowNumber,
        field: priceKey,
        message: `Tier ${i}: price must be a non-negative number`,
        value: priceStr
      })
      continue
    }
    
    tiers.push({ min, max, pricePerUnit: price })
  }
  
  if (tiers.length === 0) {
    errors.push({
      row: rowNumber,
      field: 'tiers',
      message: 'At least one tier is required'
    })
  }
  
  // Validate tier ordering
  for (let i = 1; i < tiers.length; i++) {
    const prevTier = tiers[i - 1]
    const currentTier = tiers[i]
    
    if (prevTier.max !== null && currentTier.min <= prevTier.max) {
      errors.push({
        row: rowNumber,
        field: 'tiers',
        message: `Tier overlap: Tier ${i + 1} min (${currentTier.min}) should be greater than Tier ${i} max (${prevTier.max})`
      })
    }
  }
  
  return { data: { tiers }, errors, warnings }
}

function parseSeatBasedPricing(row: ParsedCSVRow, rowNumber: number): { data: SeatBasedPricing; errors: CSVValidationError[]; warnings: string[] } {
  const errors: CSVValidationError[] = []
  const warnings: string[] = []
  
  const pricePerSeat = parseFloat(row.pricePerSeat)
  if (isNaN(pricePerSeat) || pricePerSeat < 0) {
    errors.push({
      row: rowNumber,
      field: 'pricePerSeat',
      message: 'pricePerSeat must be a non-negative number',
      value: row.pricePerSeat
    })
  }
  
  let minimumSeats: number | undefined
  if (row.minimumSeats) {
    minimumSeats = parseInt(row.minimumSeats)
    if (isNaN(minimumSeats) || minimumSeats < 0) {
      errors.push({
        row: rowNumber,
        field: 'minimumSeats',
        message: 'minimumSeats must be a non-negative integer',
        value: row.minimumSeats
      })
    }
  }
  
  const volumeDiscounts: Array<{ minSeats: number; discountPercent: number }> = []
  
  for (let i = 1; i <= 3; i++) {
    const minSeatsKey = `discount${i}_minSeats`
    const percentKey = `discount${i}_percent`
    
    const minSeatsStr = row[minSeatsKey]
    const percentStr = row[percentKey]
    
    if (!minSeatsStr && !percentStr) continue
    
    if (!minSeatsStr || !percentStr) {
      errors.push({
        row: rowNumber,
        field: minSeatsKey,
        message: `Discount ${i}: both minSeats and percent are required if discount is defined`
      })
      continue
    }
    
    const minSeats = parseInt(minSeatsStr)
    const percent = parseFloat(percentStr)
    
    if (isNaN(minSeats) || minSeats < 1) {
      errors.push({
        row: rowNumber,
        field: minSeatsKey,
        message: `Discount ${i}: minSeats must be a positive integer`,
        value: minSeatsStr
      })
      continue
    }
    
    if (isNaN(percent) || percent < 0 || percent > 100) {
      errors.push({
        row: rowNumber,
        field: percentKey,
        message: `Discount ${i}: percent must be between 0 and 100`,
        value: percentStr
      })
      continue
    }
    
    volumeDiscounts.push({ minSeats, discountPercent: percent })
  }
  
  const data: SeatBasedPricing = { pricePerSeat }
  if (minimumSeats !== undefined) data.minimumSeats = minimumSeats
  if (volumeDiscounts.length > 0) data.volumeDiscounts = volumeDiscounts
  
  return { data, errors, warnings }
}

function parseFlatRatePricing(row: ParsedCSVRow, rowNumber: number): { data: FlatRatePricing; errors: CSVValidationError[]; warnings: string[] } {
  const errors: CSVValidationError[] = []
  const warnings: string[] = []
  
  const price = parseFloat(row.price)
  if (isNaN(price) || price < 0) {
    errors.push({
      row: rowNumber,
      field: 'price',
      message: 'price must be a non-negative number',
      value: row.price
    })
  }
  
  const data: FlatRatePricing = { price }
  
  if (row.billingPeriod) {
    const validPeriods = ['one-time', 'monthly', 'yearly']
    if (!validPeriods.includes(row.billingPeriod)) {
      errors.push({
        row: rowNumber,
        field: 'billingPeriod',
        message: 'billingPeriod must be one-time, monthly, or yearly',
        value: row.billingPeriod
      })
    } else {
      data.billingPeriod = row.billingPeriod as 'one-time' | 'monthly' | 'yearly'
    }
  }
  
  return { data, errors, warnings }
}

function parseCostPlusPricing(row: ParsedCSVRow, rowNumber: number): { data: CostPlusPricing; errors: CSVValidationError[]; warnings: string[] } {
  const errors: CSVValidationError[] = []
  const warnings: string[] = []
  
  const baseCost = parseFloat(row.baseCost)
  if (isNaN(baseCost) || baseCost < 0) {
    errors.push({
      row: rowNumber,
      field: 'baseCost',
      message: 'baseCost must be a non-negative number',
      value: row.baseCost
    })
  }
  
  const markupPercent = parseFloat(row.markupPercent)
  if (isNaN(markupPercent) || markupPercent < 0) {
    errors.push({
      row: rowNumber,
      field: 'markupPercent',
      message: 'markupPercent must be a non-negative number',
      value: row.markupPercent
    })
  }
  
  return { data: { baseCost, markupPercent }, errors, warnings }
}

function parseSubscriptionPricing(row: ParsedCSVRow, rowNumber: number): { data: SubscriptionPricing; errors: CSVValidationError[]; warnings: string[] } {
  const errors: CSVValidationError[] = []
  const warnings: string[] = []
  
  const monthlyPrice = parseFloat(row.monthlyPrice)
  if (isNaN(monthlyPrice) || monthlyPrice < 0) {
    errors.push({
      row: rowNumber,
      field: 'monthlyPrice',
      message: 'monthlyPrice must be a non-negative number',
      value: row.monthlyPrice
    })
  }
  
  const data: SubscriptionPricing = { monthlyPrice }
  
  if (row.yearlyPrice) {
    const yearlyPrice = parseFloat(row.yearlyPrice)
    if (isNaN(yearlyPrice) || yearlyPrice < 0) {
      errors.push({
        row: rowNumber,
        field: 'yearlyPrice',
        message: 'yearlyPrice must be a non-negative number',
        value: row.yearlyPrice
      })
    } else {
      data.yearlyPrice = yearlyPrice
    }
  }
  
  if (row.setupFee) {
    const setupFee = parseFloat(row.setupFee)
    if (isNaN(setupFee) || setupFee < 0) {
      errors.push({
        row: rowNumber,
        field: 'setupFee',
        message: 'setupFee must be a non-negative number',
        value: row.setupFee
      })
    } else {
      data.setupFee = setupFee
    }
  }
  
  if (row.features) {
    const features = row.features.split(';').map(f => f.trim()).filter(f => f.length > 0)
    if (features.length > 0) {
      data.features = features
    }
  }
  
  return { data, errors, warnings }
}

function parseBoolean(value: string): boolean | null {
  if (!value) return null
  const lower = value.toLowerCase().trim()
  if (lower === 'true' || lower === '1' || lower === 'yes' || lower === 'y') return true
  if (lower === 'false' || lower === '0' || lower === 'no' || lower === 'n') return false
  return null
}

function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}