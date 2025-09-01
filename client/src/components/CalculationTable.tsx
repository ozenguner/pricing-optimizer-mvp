import React, { useState, useEffect, useRef, useCallback } from 'react'
import { PlusIcon, TrashIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline'
import type { CalculationData, CalculationRow, ColumnDefinition, CalculationHistory } from '../types/wizard'
import type { PricingModel } from '../types'
import { getColumnsForPricingModel, createEmptyRow, calculateTotalPrice } from '../utils/calculationColumns'
import { FormulaParser, validateFormula } from '../utils/formulaParser'
import styles from './CalculationTable.module.css'

interface CalculationTableProps {
  pricingModel: PricingModel
  currency: string
  data: CalculationData
  onChange: (data: CalculationData) => void
}

interface EditingCell {
  rowId: string
  columnKey: string
}

export const CalculationTable: React.FC<CalculationTableProps> = ({
  pricingModel,
  currency,
  data,
  onChange
}) => {
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null)
  const [draggedRowId, setDraggedRowId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const tableRef = useRef<HTMLDivElement>(null)

  const columns = getColumnsForPricingModel(pricingModel)

  // Initialize data if empty
  useEffect(() => {
    if (data.rows.length === 0) {
      const initialRow = createEmptyRow(columns)
      const newData: CalculationData = {
        ...data,
        rows: [initialRow],
        columns,
        totalPrice: 0,
        history: [],
        historyIndex: -1
      }
      onChange(newData)
    }
  }, [data, columns, onChange])

  // Auto-save after editing stops
  useEffect(() => {
    if (saveTimeout) {
      clearTimeout(saveTimeout)
    }

    if (editingCell) {
      const timeout = setTimeout(() => {
        saveCurrentEdit()
      }, 2000)
      setSaveTimeout(timeout)
    }

    return () => {
      if (saveTimeout) clearTimeout(saveTimeout)
    }
  }, [editValue, editingCell])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey)) {
        switch (e.key) {
          case 'z':
            e.preventDefault()
            if (e.shiftKey) {
              redo()
            } else {
              undo()
            }
            break
          case 'y':
            e.preventDefault()
            redo()
            break
          case 'd':
            if (e.shiftKey) {
              e.preventDefault()
              if (editingCell) {
                duplicateRow(editingCell.rowId)
              }
            }
            break
        }
      }

      if (e.key === 'Tab' || e.key === 'Enter') {
        if (editingCell) {
          e.preventDefault()
          navigateToNextCell(e.key === 'Tab' && e.shiftKey)
        }
      }

      if (e.key === 'Escape' && editingCell) {
        cancelEdit()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [editingCell, editValue])

  const addToHistory = useCallback((action: string, previousState: CalculationRow[], newState: CalculationRow[]) => {
    const historyItem: CalculationHistory = {
      id: Date.now().toString(),
      action: action as any,
      timestamp: Date.now(),
      previousState: JSON.parse(JSON.stringify(previousState)),
      newState: JSON.parse(JSON.stringify(newState)),
      description: action
    }

    const newHistory = data.history.slice(0, data.historyIndex + 1)
    newHistory.push(historyItem)

    onChange({
      ...data,
      history: newHistory,
      historyIndex: newHistory.length - 1
    })
  }, [data, onChange])

  const undo = useCallback(() => {
    if (data.historyIndex >= 0) {
      const historyItem = data.history[data.historyIndex]
      onChange({
        ...data,
        rows: JSON.parse(JSON.stringify(historyItem.previousState)),
        historyIndex: data.historyIndex - 1,
        totalPrice: calculateTotalPrice(historyItem.previousState, columns)
      })
    }
  }, [data, columns, onChange])

  const redo = useCallback(() => {
    if (data.historyIndex < data.history.length - 1) {
      const historyItem = data.history[data.historyIndex + 1]
      onChange({
        ...data,
        rows: JSON.parse(JSON.stringify(historyItem.newState)),
        historyIndex: data.historyIndex + 1,
        totalPrice: calculateTotalPrice(historyItem.newState, columns)
      })
    }
  }, [data, columns, onChange])

  const recalculateFormulas = useCallback((rows: CalculationRow[]): CalculationRow[] => {
    const formulaParser = new FormulaParser(rows)
    
    return rows.map((row, rowIndex) => {
      const newRow = { ...row, cells: { ...row.cells } }
      
      columns.forEach(column => {
        if (column.formula) {
          // Execute built-in formula
          const value = column.formula(row, rows)
          newRow.cells[column.key] = {
            ...newRow.cells[column.key],
            value,
            error: undefined
          }
        } else if (row.cells[column.key]?.formula) {
          // Execute custom formula
          const result = formulaParser.evaluateFormula(row.cells[column.key].formula!, rowIndex)
          newRow.cells[column.key] = {
            ...newRow.cells[column.key],
            value: result.value,
            error: result.error
          }
        }
      })
      
      return newRow
    })
  }, [columns])

  const updateData = useCallback((newRows: CalculationRow[], action = 'edit') => {
    const recalculatedRows = recalculateFormulas(newRows)
    const totalPrice = calculateTotalPrice(recalculatedRows, columns)
    
    addToHistory(action, data.rows, recalculatedRows)
    
    onChange({
      ...data,
      rows: recalculatedRows,
      totalPrice,
      isComplete: validateTableCompletion(recalculatedRows, columns)
    })
  }, [data, columns, onChange, recalculateFormulas, addToHistory])

  const startEdit = (rowId: string, columnKey: string) => {
    const row = data.rows.find(r => r.id === rowId)
    if (!row) return

    const column = columns.find(c => c.key === columnKey)
    if (!column || column.type === 'readonly') return

    setEditingCell({ rowId, columnKey })
    
    // Use formula if available, otherwise use display value
    const cell = row.cells[columnKey]
    const value = cell?.formula || cell?.value || ''
    setEditValue(value.toString())

    // Focus input after state updates
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const saveCurrentEdit = () => {
    if (!editingCell) return

    const { rowId, columnKey } = editingCell
    const row = data.rows.find(r => r.id === rowId)
    const column = columns.find(c => c.key === columnKey)
    
    if (!row || !column) return

    // Validate formula if it's a formula
    let formula = undefined
    let value = editValue
    let error = undefined

    if (editValue.startsWith('=')) {
      formula = editValue
      const formulaError = validateFormula(formula)
      if (formulaError) {
        error = formulaError
        value = '0'
      } else {
        const parser = new FormulaParser(data.rows)
        const rowIndex = data.rows.findIndex(r => r.id === rowId)
        const result = parser.evaluateFormula(formula, rowIndex)
        value = result.value.toString()
        error = result.error
      }
    } else {
      // Validate regular value
      if (column.validation) {
        error = column.validation(value, row, data.rows)
      }
    }

    const newRows = data.rows.map(r => {
      if (r.id === rowId) {
        return {
          ...r,
          cells: {
            ...r.cells,
            [columnKey]: {
              value: parseValue(value, column.type),
              formula,
              error: error || undefined
            }
          }
        }
      }
      return r
    })

    updateData(newRows)
    setEditingCell(null)
    setEditValue('')
  }

  const cancelEdit = () => {
    setEditingCell(null)
    setEditValue('')
    if (saveTimeout) {
      clearTimeout(saveTimeout)
      setSaveTimeout(null)
    }
  }

  const navigateToNextCell = (reverse = false) => {
    if (!editingCell) return

    saveCurrentEdit()

    const { rowId, columnKey } = editingCell
    const currentRowIndex = data.rows.findIndex(r => r.id === rowId)
    const currentColIndex = columns.findIndex(c => c.key === columnKey)

    let newRowIndex = currentRowIndex
    let newColIndex = currentColIndex

    if (reverse) {
      newColIndex--
      if (newColIndex < 0) {
        newRowIndex--
        newColIndex = columns.length - 1
      }
    } else {
      newColIndex++
      if (newColIndex >= columns.length) {
        newRowIndex++
        newColIndex = 0
      }
    }

    // Stay within bounds
    if (newRowIndex >= 0 && newRowIndex < data.rows.length) {
      const newRow = data.rows[newRowIndex]
      const newColumn = columns[newColIndex]
      
      if (newColumn.type !== 'readonly') {
        startEdit(newRow.id, newColumn.key)
      }
    }
  }

  const addRow = () => {
    const newRow = createEmptyRow(columns)
    const newRows = [...data.rows, newRow]
    updateData(newRows, 'add')
  }

  const deleteRow = (rowId: string) => {
    if (data.rows.length <= 1) return // Minimum 1 row required
    
    const newRows = data.rows.filter(r => r.id !== rowId)
    updateData(newRows, 'delete')
  }

  const duplicateRow = (rowId: string) => {
    const sourceRow = data.rows.find(r => r.id === rowId)
    if (!sourceRow) return

    const duplicatedRow: CalculationRow = {
      id: Date.now().toString() + Math.random(),
      cells: JSON.parse(JSON.stringify(sourceRow.cells))
    }

    const sourceIndex = data.rows.findIndex(r => r.id === rowId)
    const newRows = [
      ...data.rows.slice(0, sourceIndex + 1),
      duplicatedRow,
      ...data.rows.slice(sourceIndex + 1)
    ]
    
    updateData(newRows, 'add')
  }

  const moveRow = (fromIndex: number, toIndex: number) => {
    const newRows = [...data.rows]
    const [movedRow] = newRows.splice(fromIndex, 1)
    newRows.splice(toIndex, 0, movedRow)
    updateData(newRows, 'reorder')
  }

  const handleDragStart = (e: React.DragEvent, rowId: string) => {
    setDraggedRowId(rowId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, targetRowId: string) => {
    e.preventDefault()
    
    if (!draggedRowId || draggedRowId === targetRowId) return

    const fromIndex = data.rows.findIndex(r => r.id === draggedRowId)
    const toIndex = data.rows.findIndex(r => r.id === targetRowId)
    
    if (fromIndex !== -1 && toIndex !== -1) {
      moveRow(fromIndex, toIndex)
    }
    
    setDraggedRowId(null)
  }

  const parseValue = (value: any, type: string): any => {
    switch (type) {
      case 'number':
      case 'currency':
      case 'percentage':
        const num = parseFloat(value.toString())
        return isNaN(num) ? 0 : num
      default:
        return value?.toString() || ''
    }
  }

  const formatCellValue = (value: any, type: string): string => {
    switch (type) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: currency || 'USD'
        }).format(parseFloat(value) || 0)
      
      case 'percentage':
        return `${parseFloat(value) || 0}%`
      
      case 'number':
        return (parseFloat(value) || 0).toLocaleString()
      
      default:
        return value?.toString() || ''
    }
  }

  const validateTableCompletion = (rows: CalculationRow[], columns: ColumnDefinition[]): boolean => {
    return rows.every(row => {
      return columns.every(column => {
        if (!column.required) return true
        
        const cell = row.cells[column.key]
        if (cell?.error) return false
        
        const value = cell?.value
        if (value === undefined || value === null || value === '') return false
        
        return true
      })
    })
  }

  const getCellClassName = (row: CalculationRow, column: ColumnDefinition) => {
    const cell = row.cells[column.key]
    const classes = [styles.tableCell]
    
    if (cell?.error) {
      classes.push(styles.cellError)
    }
    
    return classes.join(' ')
  }

  const getCellContentClassName = (row: CalculationRow, column: ColumnDefinition) => {
    const cell = row.cells[column.key]
    
    if (column.type === 'readonly') {
      const classes = [styles.readonlyCell]
      if (cell?.formula) {
        classes.push(styles.formulaCell)
      }
      return classes.join(' ')
    }
    
    return styles.cellWrapper
  }

  return (
    <div className="space-y-4">
      {/* Table Controls */}
      <div className={styles.tableControls}>
        <div className={styles.controlsLeft}>
          <button
            onClick={addRow}
            className={styles.addRowButton}
          >
            <PlusIcon className="w-4 h-4" />
            Add Row
          </button>
          
          <div className={styles.historyControls}>
            <button
              onClick={undo}
              className={styles.historyButton}
              disabled={data.historyIndex < 0}
            >
              Undo (Ctrl+Z)
            </button>
            
            <button
              onClick={redo}
              className={styles.historyButton}
              disabled={data.historyIndex >= data.history.length - 1}
            >
              Redo (Ctrl+Y)
            </button>
          </div>
        </div>
        
        <div className={styles.totalDisplay}>
          Total: {formatCellValue(data.totalPrice, 'currency')}
        </div>
      </div>

      {/* Main Table */}
      <div className={styles.tableContainer} ref={tableRef}>
        <div className="overflow-x-auto">
          <table className={`w-full ${styles.calculationTable}`}>
            <thead className={styles.tableHeader}>
              <tr>
                <th className={`${styles.rowNumber} text-xs font-medium uppercase tracking-wider`}>
                  #
                </th>
                {columns.map(column => (
                  <th
                    key={column.key}
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    style={{ width: column.width }}
                  >
                    {column.label}
                    {column.required && <span className={styles.requiredIndicator}>*</span>}
                  </th>
                ))}
                <th className={`${styles.actionsCell} text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                  Actions
                </th>
              </tr>
            </thead>
            
            <tbody>
              {data.rows.map((row, rowIndex) => (
                <tr
                  key={row.id}
                  className={`${styles.tableRow} ${draggedRowId === row.id ? styles.dragging : ''}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, row.id)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, row.id)}
                >
                  <td className={styles.rowNumber}>
                    {rowIndex + 1}
                  </td>
                  
                  {columns.map(column => (
                    <td
                      key={column.key}
                      className={getCellClassName(row, column)}
                      onClick={() => startEdit(row.id, column.key)}
                    >
                      <div className={getCellContentClassName(row, column)}>
                        {editingCell?.rowId === row.id && editingCell?.columnKey === column.key ? (
                          <input
                            ref={inputRef}
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={saveCurrentEdit}
                            className={styles.cellInput}
                          />
                        ) : column.type === 'readonly' ? (
                          formatCellValue(row.cells[column.key]?.value, column.type)
                        ) : (
                          <div className={styles.cellDisplay}>
                            {formatCellValue(row.cells[column.key]?.value, column.type)}
                          </div>
                        )}
                        {row.cells[column.key]?.error && (
                          <div className={styles.cellErrorMessage}>
                            {row.cells[column.key].error}
                          </div>
                        )}
                      </div>
                    </td>
                  ))}
                  
                  <td className={styles.actionsCell}>
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => duplicateRow(row.id)}
                        className={`${styles.actionButton} ${styles.duplicateButton}`}
                        title="Duplicate row (Ctrl+Shift+D)"
                      >
                        <DocumentDuplicateIcon className="w-4 h-4" />
                      </button>
                      
                      {data.rows.length > 1 && (
                        <button
                          onClick={() => deleteRow(row.id)}
                          className={`${styles.actionButton} ${styles.deleteButton}`}
                          title="Delete row"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              
              {/* Total Row */}
              <tr className={styles.totalRow}>
                <td className={styles.rowNumber}>
                  Total
                </td>
                <td colSpan={columns.length} className={`${styles.tableCell} px-3 py-2 text-right font-semibold`}>
                  {formatCellValue(data.totalPrice, 'currency')}
                </td>
                <td className={styles.actionsCell}></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Formula Help */}
      <div className={styles.formulaHelp}>
        <strong>Formula Help:</strong> Use = to start formulas. 
        Functions: SUM(), AVG(), MIN(), MAX(), COUNT(). 
        Cell references: A1, B2, etc. 
        Ranges: A1:A5. 
        Keyboard: Tab/Enter to navigate, Escape to cancel, Ctrl+Z/Y for undo/redo.
      </div>
    </div>
  )
}