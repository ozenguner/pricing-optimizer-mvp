import type { CalculationRow, ColumnDefinition } from '../types/wizard'

export const calculateFormulaValue = (
  row: CalculationRow,
  column: ColumnDefinition,
  allRows: CalculationRow[]
): number => {
  if (!column.formula) return 0

  try {
    return column.formula(row, allRows)
  } catch (error) {
    console.error(`Error calculating formula for column ${column.key}:`, error)
    return 0
  }
}

export const updateCalculatedValues = (
  rows: CalculationRow[],
  columns: ColumnDefinition[]
): CalculationRow[] => {
  return rows.map(row => {
    const updatedRow = { ...row, cells: { ...row.cells } }

    columns.forEach(column => {
      if (column.type === 'readonly' && column.formula) {
        const calculatedValue = calculateFormulaValue(updatedRow, column, rows)
        updatedRow.cells[column.key] = {
          ...updatedRow.cells[column.key],
          value: calculatedValue
        }
      }
    })

    return updatedRow
  })
}

export const calculateGrandTotal = (
  rows: CalculationRow[],
  columns: ColumnDefinition[]
): number => {
  let total = 0

  rows.forEach(row => {
    columns.forEach(column => {
      if (column.type === 'readonly' && column.formula) {
        const value = calculateFormulaValue(row, column, rows)
        total += value
      } else if (
        column.type === 'currency' &&
        !column.formula &&
        column.key !== 'baseCost' &&
        column.key !== 'pricePerUnit' &&
        column.key !== 'pricePerSeat' &&
        column.key !== 'monthly' &&
        column.key !== 'oneTime' &&
        column.key !== 'recurring'
      ) {
        const value = parseFloat(row.cells[column.key]?.value || 0)
        if (!isNaN(value)) {
          total += value
        }
      }
    })
  })

  return Math.round(total * 100) / 100
}

export const validateRowData = (
  row: CalculationRow,
  columns: ColumnDefinition[],
  allRows: CalculationRow[]
): Record<string, string> => {
  const errors: Record<string, string> = {}

  columns.forEach(column => {
    if (column.type === 'readonly') return

    const cellValue = row.cells[column.key]?.value
    
    if (column.validation) {
      const error = column.validation(cellValue, row, allRows)
      if (error) {
        errors[column.key] = error
      }
    }
  })

  return errors
}

export const validateAllRows = (
  rows: CalculationRow[],
  columns: ColumnDefinition[]
): Record<string, Record<string, string>> => {
  const allErrors: Record<string, Record<string, string>> = {}

  rows.forEach(row => {
    const rowErrors = validateRowData(row, columns, rows)
    if (Object.keys(rowErrors).length > 0) {
      allErrors[row.id] = rowErrors
    }
  })

  return allErrors
}

export const hasValidationErrors = (
  rows: CalculationRow[],
  columns: ColumnDefinition[]
): boolean => {
  const errors = validateAllRows(rows, columns)
  return Object.keys(errors).length > 0
}

export const formatCurrencyValue = (value: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)
}

export const formatPercentageValue = (value: number): string => {
  return `${value}%`
}

export const parseNumericValue = (value: any): number => {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const cleanValue = value.replace(/[$,%]/g, '')
    const parsed = parseFloat(cleanValue)
    return isNaN(parsed) ? 0 : parsed
  }
  return 0
}

export const formatDisplayValue = (
  value: any,
  columnType: string,
  currency: string = 'USD'
): string => {
  if (value === null || value === undefined || value === '') return ''

  const numericValue = parseNumericValue(value)

  switch (columnType) {
    case 'currency':
      return formatCurrencyValue(numericValue, currency)
    case 'percentage':
      return formatPercentageValue(numericValue)
    case 'number':
      return numericValue.toLocaleString()
    default:
      return String(value)
  }
}