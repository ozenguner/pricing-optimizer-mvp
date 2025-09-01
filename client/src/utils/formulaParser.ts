import type { CalculationRow } from '../types/wizard'

// Simple formula parser for basic operations and functions
export class FormulaParser {
  private rows: CalculationRow[]
  
  constructor(rows: CalculationRow[]) {
    this.rows = rows
  }

  // Parse and evaluate a formula
  evaluateFormula(formula: string, currentRowIndex: number): { value: number, error?: string } {
    try {
      if (!formula.startsWith('=')) {
        return { value: parseFloat(formula) || 0 }
      }

      const expression = formula.substring(1).trim()
      const result = this.parseExpression(expression, currentRowIndex)
      
      if (isNaN(result)) {
        return { value: 0, error: 'Invalid calculation' }
      }

      return { value: result }
    } catch (error) {
      return { value: 0, error: 'Formula error' }
    }
  }

  private parseExpression(expression: string, currentRowIndex: number): number {
    // Handle functions first
    if (expression.includes('(')) {
      return this.parseFunction(expression, currentRowIndex)
    }

    // Handle cell references
    expression = this.replaceCellReferences(expression, currentRowIndex)

    // Handle basic arithmetic
    try {
      // This is a simplified approach - in production, use a proper expression parser
      return Function(`"use strict"; return (${expression})`)()
    } catch {
      throw new Error('Invalid expression')
    }
  }

  private parseFunction(expression: string, currentRowIndex: number): number {
    const functionMatch = expression.match(/^(\w+)\((.*)\)$/)
    if (!functionMatch) {
      throw new Error('Invalid function syntax')
    }

    const [, functionName, argsString] = functionMatch
    const args = this.parseArguments(argsString, currentRowIndex)

    switch (functionName.toUpperCase()) {
      case 'SUM':
        return args.reduce((sum, val) => sum + val, 0)
      
      case 'AVG':
        return args.length > 0 ? args.reduce((sum, val) => sum + val, 0) / args.length : 0
      
      case 'MIN':
        return args.length > 0 ? Math.min(...args) : 0
      
      case 'MAX':
        return args.length > 0 ? Math.max(...args) : 0
      
      case 'COUNT':
        return args.length
      
      default:
        throw new Error(`Unknown function: ${functionName}`)
    }
  }

  private parseArguments(argsString: string, currentRowIndex: number): number[] {
    if (!argsString.trim()) return []

    const args: number[] = []
    const argParts = argsString.split(',')

    for (const arg of argParts) {
      const trimmedArg = arg.trim()
      
      // Handle range (e.g., A1:A5)
      if (trimmedArg.includes(':')) {
        const rangeValues = this.parseRange(trimmedArg)
        args.push(...rangeValues)
      }
      // Handle single cell reference
      else if (this.isCellReference(trimmedArg)) {
        const value = this.getCellValue(trimmedArg, currentRowIndex)
        args.push(value)
      }
      // Handle literal number
      else {
        const num = parseFloat(trimmedArg)
        if (!isNaN(num)) {
          args.push(num)
        }
      }
    }

    return args
  }

  private parseRange(range: string): number[] {
    const [start, end] = range.split(':')
    const startRef = this.parseCellReference(start.trim())
    const endRef = this.parseCellReference(end.trim())
    
    const values: number[] = []
    
    // Simple implementation - assumes column stays same, row changes
    if (startRef.column === endRef.column) {
      for (let row = startRef.row; row <= endRef.row && row < this.rows.length; row++) {
        const value = this.getCellValueByIndex(row, startRef.column)
        values.push(value)
      }
    }
    
    return values
  }

  private replaceCellReferences(expression: string, currentRowIndex: number): string {
    // Replace cell references like A1, B2, etc. with their values
    return expression.replace(/[A-Z]\d+/g, (match) => {
      const value = this.getCellValue(match, currentRowIndex)
      return value.toString()
    })
  }

  private isCellReference(ref: string): boolean {
    return /^[A-Z]\d+$/.test(ref.trim())
  }

  private parseCellReference(ref: string): { column: string, row: number } {
    const match = ref.match(/^([A-Z])(\d+)$/)
    if (!match) throw new Error(`Invalid cell reference: ${ref}`)
    
    return {
      column: match[1],
      row: parseInt(match[2]) - 1 // Convert to 0-based index
    }
  }

  private getCellValue(cellRef: string, _currentRowIndex: number): number {
    try {
      const { column, row } = this.parseCellReference(cellRef)
      return this.getCellValueByIndex(row, column)
    } catch {
      return 0
    }
  }

  private getCellValueByIndex(rowIndex: number, column: string): number {
    if (rowIndex < 0 || rowIndex >= this.rows.length) return 0
    
    // Convert column letter to column key (simplified mapping)
    const columnKeys = ['tierName', 'minQty', 'maxQty', 'pricePerUnit', 'total'] // This should be dynamic
    const columnIndex = column.charCodeAt(0) - 65 // A=0, B=1, etc.
    
    if (columnIndex < 0 || columnIndex >= columnKeys.length) return 0
    
    const columnKey = columnKeys[columnIndex]
    const cellValue = this.rows[rowIndex].cells[columnKey]?.value
    
    return parseFloat(cellValue) || 0
  }
}

// Helper function to validate formula syntax
export const validateFormula = (formula: string): string | null => {
  if (!formula) return null
  
  if (!formula.startsWith('=')) {
    return 'Formulas must start with ='
  }

  const expression = formula.substring(1)
  
  // Basic syntax validation
  if (expression.includes('//') || expression.includes('/*')) {
    return 'Invalid characters in formula'
  }

  // Check for balanced parentheses
  let parenCount = 0
  for (const char of expression) {
    if (char === '(') parenCount++
    if (char === ')') parenCount--
    if (parenCount < 0) return 'Unmatched closing parenthesis'
  }
  
  if (parenCount !== 0) {
    return 'Unmatched opening parenthesis'
  }

  return null
}