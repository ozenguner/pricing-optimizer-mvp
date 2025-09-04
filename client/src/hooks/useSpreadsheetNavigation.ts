import { useCallback, useRef } from 'react'
import type { ColumnDefinition } from '../types/wizard'

// interface NavigationState {
//   editingCell: { rowIndex: number; columnKey: string } | null
//   focusedCell: { rowIndex: number; columnKey: string } | null
// }

interface UseSpreadsheetNavigationProps {
  rows: any[]
  columns: ColumnDefinition[]
  editingCell: { rowIndex: number; columnKey: string } | null
  setEditingCell: (cell: { rowIndex: number; columnKey: string } | null) => void
  focusedCell: { rowIndex: number; columnKey: string } | null
  setFocusedCell: (cell: { rowIndex: number; columnKey: string } | null) => void
  onCellEdit: (rowIndex: number, columnKey: string, value: any) => void
  addRow: () => void
}

export const useSpreadsheetNavigation = ({
  rows,
  columns,
  editingCell,
  setEditingCell,
  focusedCell,
  setFocusedCell,
  onCellEdit,
  addRow
}: UseSpreadsheetNavigationProps) => {
  const tableRef = useRef<HTMLTableElement>(null)

  const getEditableColumns = useCallback(() => {
    return columns.filter(col => col.type !== 'readonly')
  }, [columns])

  const findNextEditableCell = useCallback((
    currentRow: number,
    currentCol: string,
    direction: 'up' | 'down' | 'left' | 'right' | 'tab' | 'enter'
  ): { rowIndex: number; columnKey: string } | null => {
    const editableColumns = getEditableColumns()
    const currentColIndex = editableColumns.findIndex(col => col.key === currentCol)
    
    let nextRowIndex = currentRow
    let nextColIndex = currentColIndex

    switch (direction) {
      case 'up':
        nextRowIndex = Math.max(0, currentRow - 1)
        break
      case 'down':
      case 'enter':
        nextRowIndex = currentRow + 1
        if (nextRowIndex >= rows.length) {
          addRow()
          nextRowIndex = rows.length
        }
        break
      case 'left':
        nextColIndex = Math.max(0, currentColIndex - 1)
        break
      case 'right':
      case 'tab':
        nextColIndex = currentColIndex + 1
        if (nextColIndex >= editableColumns.length) {
          nextColIndex = 0
          nextRowIndex = currentRow + 1
          if (nextRowIndex >= rows.length) {
            addRow()
            nextRowIndex = rows.length
          }
        }
        break
    }

    if (nextRowIndex < 0 || nextRowIndex >= rows.length + (direction === 'down' || direction === 'enter' || direction === 'tab' ? 1 : 0)) {
      return null
    }

    if (nextColIndex < 0 || nextColIndex >= editableColumns.length) {
      return null
    }

    return {
      rowIndex: nextRowIndex,
      columnKey: editableColumns[nextColIndex].key
    }
  }, [rows.length, getEditableColumns, addRow])

  const handleNavigation = useCallback((direction: 'up' | 'down' | 'left' | 'right' | 'tab' | 'enter') => {
    if (!editingCell) return

    const nextCell = findNextEditableCell(editingCell.rowIndex, editingCell.columnKey, direction)
    if (nextCell) {
      setEditingCell(null)
      setFocusedCell(nextCell)
      
      // Focus the next cell after a short delay
      setTimeout(() => {
        setEditingCell(nextCell)
      }, 10)
    }
  }, [editingCell, findNextEditableCell, setEditingCell, setFocusedCell])

  const handleCellClick = useCallback((rowIndex: number, columnKey: string) => {
    console.log('handleCellClick called:', { rowIndex, columnKey })
    const column = columns.find(col => col.key === columnKey)
    if (column?.type === 'readonly') {
      console.log('Cell is readonly, ignoring click')
      return
    }

    console.log('Setting focused and editing cell')
    setFocusedCell({ rowIndex, columnKey })
    setEditingCell({ rowIndex, columnKey })
  }, [columns, setFocusedCell, setEditingCell])

  const handleCellDoubleClick = useCallback((rowIndex: number, columnKey: string) => {
    const column = columns.find(col => col.key === columnKey)
    if (column?.type === 'readonly') return

    setFocusedCell({ rowIndex, columnKey })
    setEditingCell({ rowIndex, columnKey })
  }, [columns, setFocusedCell, setEditingCell])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Handle global keyboard shortcuts
    if (!editingCell && focusedCell) {
      const { rowIndex: currentRow, columnKey: currentCol } = focusedCell
      
      switch (e.key) {
        case 'F2':
          e.preventDefault()
          setEditingCell(focusedCell)
          break
        case 'Enter':
          e.preventDefault()
          setEditingCell(focusedCell)
          break
        case 'ArrowUp':
          e.preventDefault()
          const upCell = findNextEditableCell(currentRow, currentCol, 'up')
          if (upCell) setFocusedCell(upCell)
          break
        case 'ArrowDown':
          e.preventDefault()
          const downCell = findNextEditableCell(currentRow, currentCol, 'down')
          if (downCell) setFocusedCell(downCell)
          break
        case 'ArrowLeft':
          e.preventDefault()
          const leftCell = findNextEditableCell(currentRow, currentCol, 'left')
          if (leftCell) setFocusedCell(leftCell)
          break
        case 'ArrowRight':
          e.preventDefault()
          const rightCell = findNextEditableCell(currentRow, currentCol, 'right')
          if (rightCell) setFocusedCell(rightCell)
          break
        case 'Tab':
          e.preventDefault()
          const tabCell = findNextEditableCell(currentRow, currentCol, 'tab')
          if (tabCell) setFocusedCell(tabCell)
          break
      }
    }
  }, [editingCell, focusedCell, setEditingCell, setFocusedCell, findNextEditableCell])

  const handleCellSave = useCallback((rowIndex: number, columnKey: string, value: any) => {
    onCellEdit(rowIndex, columnKey, value)
    setEditingCell(null)
  }, [onCellEdit, setEditingCell])

  const handleCellCancel = useCallback(() => {
    setEditingCell(null)
  }, [setEditingCell])

  const focusCell = useCallback((rowIndex: number, columnKey: string) => {
    const column = columns.find(col => col.key === columnKey)
    if (column?.type === 'readonly') return

    setFocusedCell({ rowIndex, columnKey })
    
    // Find the cell element and focus it
    if (tableRef.current) {
      const cellElement = tableRef.current.querySelector(
        `[data-row="${rowIndex}"][data-col="${columnKey}"]`
      ) as HTMLElement
      if (cellElement) {
        cellElement.focus()
      }
    }
  }, [columns, setFocusedCell])

  return {
    tableRef,
    handleNavigation,
    handleCellClick,
    handleCellDoubleClick,
    handleKeyDown,
    handleCellSave,
    handleCellCancel,
    focusCell
  }
}