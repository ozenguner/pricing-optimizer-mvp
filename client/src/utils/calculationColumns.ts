import type { PricingModel } from '../types'
import type { ColumnDefinition, CalculationRow } from '../types/wizard'

// Validation functions
const validatePositiveNumber = (value: any): string | null => {
  const num = parseFloat(value)
  if (isNaN(num) || num < 0) {
    return 'Must be a positive number'
  }
  return null
}

const validateNonNegativeNumber = (value: any): string | null => {
  const num = parseFloat(value)
  if (isNaN(num) || num < 0) {
    return 'Must be a non-negative number'
  }
  return null
}

const validatePercentage = (value: any): string | null => {
  const num = parseFloat(value)
  if (isNaN(num) || num < 0 || num > 100) {
    return 'Must be between 0 and 100'
  }
  return null
}

const validateRequired = (value: any): string | null => {
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    return 'This field is required'
  }
  return null
}

const validateTierRange = (_value: any, row: CalculationRow): string | null => {
  const minQty = parseFloat(row.cells.minQty?.value || 0)
  const maxQty = parseFloat(row.cells.maxQty?.value || 0)
  
  if (maxQty > 0 && maxQty <= minQty) {
    return 'Maximum quantity must be greater than minimum'
  }
  return null
}

// Formula functions
const calculateTierTotal = (row: CalculationRow): number => {
  const minQty = parseFloat(row.cells.minQty?.value || 0)
  const maxQty = parseFloat(row.cells.maxQty?.value || 0)
  const pricePerUnit = parseFloat(row.cells.pricePerUnit?.value || 0)
  
  if (maxQty > 0) {
    return (maxQty - minQty + 1) * pricePerUnit
  }
  return 0
}

const calculateSeatSubtotal = (row: CalculationRow): number => {
  const seatRange = row.cells.seatRange?.value || ''
  const pricePerSeat = parseFloat(row.cells.pricePerSeat?.value || 0)
  const discount = parseFloat(row.cells.discount?.value || 0)
  
  // Parse seat range (e.g., "1-10", "11-25", "26+")
  let seats = 0
  if (seatRange.includes('-')) {
    const [min, max] = seatRange.split('-').map((s: string) => parseInt(s.trim()))
    seats = max - min + 1
  } else if (seatRange.includes('+')) {
    seats = 1 // Assume 1 for unlimited ranges for calculation
  } else {
    seats = parseInt(seatRange) || 0
  }
  
  const subtotal = seats * pricePerSeat
  return subtotal * (1 - discount / 100)
}

const calculateFinalPrice = (row: CalculationRow): number => {
  const baseCost = parseFloat(row.cells.baseCost?.value || 0)
  const markup = parseFloat(row.cells.markup?.value || 0)
  return baseCost * (1 + markup / 100)
}

// Column definitions by pricing model
export const getColumnsForPricingModel = (pricingModel: PricingModel): ColumnDefinition[] => {
  switch (pricingModel) {
    case 'tiered':
      return [
        {
          key: 'tierName',
          label: 'Tier Name',
          type: 'text',
          required: true,
          validation: validateRequired,
          width: 150
        },
        {
          key: 'minQty',
          label: 'Min Qty',
          type: 'number',
          required: true,
          validation: (value) => validateRequired(value) || validateNonNegativeNumber(value),
          width: 100
        },
        {
          key: 'maxQty',
          label: 'Max Qty',
          type: 'number',
          validation: (value, row) => {
            if (value === '' || value === null || value === undefined) return null
            return validatePositiveNumber(value) || validateTierRange(value, row)
          },
          width: 100
        },
        {
          key: 'pricePerUnit',
          label: 'Price/Unit',
          type: 'currency',
          required: true,
          validation: (value) => validateRequired(value) || validateNonNegativeNumber(value),
          width: 120
        },
        {
          key: 'total',
          label: 'Total',
          type: 'readonly',
          formula: calculateTierTotal,
          width: 120
        }
      ]

    case 'seat-based':
      return [
        {
          key: 'seatRange',
          label: 'Seat Range',
          type: 'text',
          required: true,
          validation: validateRequired,
          width: 120
        },
        {
          key: 'pricePerSeat',
          label: 'Price/Seat',
          type: 'currency',
          required: true,
          validation: (value) => validateRequired(value) || validatePositiveNumber(value),
          width: 120
        },
        {
          key: 'discount',
          label: 'Discount %',
          type: 'percentage',
          validation: validatePercentage,
          width: 100
        },
        {
          key: 'subtotal',
          label: 'Subtotal',
          type: 'readonly',
          formula: calculateSeatSubtotal,
          width: 120
        }
      ]

    case 'subscription':
      return [
        {
          key: 'planName',
          label: 'Plan Name',
          type: 'text',
          required: true,
          validation: validateRequired,
          width: 150
        },
        {
          key: 'monthly',
          label: 'Monthly',
          type: 'currency',
          required: true,
          validation: (value) => validateRequired(value) || validatePositiveNumber(value),
          width: 100
        },
        {
          key: 'annual',
          label: 'Annual',
          type: 'currency',
          validation: validateNonNegativeNumber,
          width: 100
        },
        {
          key: 'discount',
          label: 'Discount',
          type: 'percentage',
          validation: validatePercentage,
          width: 100
        },
        {
          key: 'features',
          label: 'Features',
          type: 'text',
          width: 200
        }
      ]

    case 'cost-plus':
      return [
        {
          key: 'item',
          label: 'Item',
          type: 'text',
          required: true,
          validation: validateRequired,
          width: 150
        },
        {
          key: 'baseCost',
          label: 'Base Cost',
          type: 'currency',
          required: true,
          validation: (value) => validateRequired(value) || validateNonNegativeNumber(value),
          width: 120
        },
        {
          key: 'markup',
          label: 'Markup %',
          type: 'percentage',
          required: true,
          validation: (value) => validateRequired(value) || validateNonNegativeNumber(value),
          width: 100
        },
        {
          key: 'finalPrice',
          label: 'Final Price',
          type: 'readonly',
          formula: calculateFinalPrice,
          width: 120
        }
      ]

    case 'flat-rate':
      return [
        {
          key: 'service',
          label: 'Service',
          type: 'text',
          required: true,
          validation: validateRequired,
          width: 200
        },
        {
          key: 'oneTime',
          label: 'One-time',
          type: 'currency',
          validation: validateNonNegativeNumber,
          width: 120
        },
        {
          key: 'recurring',
          label: 'Recurring',
          type: 'currency',
          validation: validateNonNegativeNumber,
          width: 120
        },
        {
          key: 'period',
          label: 'Period',
          type: 'text',
          width: 100
        }
      ]

    default:
      return [
        {
          key: 'description',
          label: 'Description',
          type: 'text',
          required: true,
          validation: validateRequired,
          width: 200
        },
        {
          key: 'amount',
          label: 'Amount',
          type: 'currency',
          required: true,
          validation: (value) => validateRequired(value) || validatePositiveNumber(value),
          width: 120
        }
      ]
  }
}

// Create empty row with default values for a pricing model
export const createEmptyRow = (columns: ColumnDefinition[]): CalculationRow => {
  const cells: Record<string, any> = {}
  
  columns.forEach(column => {
    let defaultValue: any = ''
    if (column.type === 'number' || column.type === 'currency' || column.type === 'percentage') {
      defaultValue = 0
    }
    
    cells[column.key] = {
      value: column.type === 'readonly' ? 0 : defaultValue,
      formula: column.formula ? '' : undefined
    }
  })

  return {
    id: Date.now().toString() + Math.random(),
    cells
  }
}

// Calculate total price from all rows
export const calculateTotalPrice = (rows: CalculationRow[], columns: ColumnDefinition[]): number => {
  let total = 0
  
  rows.forEach(row => {
    columns.forEach(column => {
      if (column.type === 'readonly' && column.formula) {
        const value = column.formula(row, rows)
        total += parseFloat(value) || 0
      } else if (column.type === 'currency' && column.key !== 'total' && column.key !== 'subtotal' && column.key !== 'finalPrice') {
        const value = parseFloat(row.cells[column.key]?.value || 0)
        total += value
      }
    })
  })
  
  return total
}