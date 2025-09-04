import React, { useState, useCallback, useMemo } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
  flexRender
} from '@tanstack/react-table'
import { EditableCell } from './EditableCell'
import { useSpreadsheetNavigation } from '../hooks/useSpreadsheetNavigation'
import {
  updateCalculatedValues,
  calculateGrandTotal,
  validateAllRows,
  hasValidationErrors,
  formatDisplayValue
} from '../utils/calculateTotals'
import { createEmptyRow } from '../utils/calculationColumns'
import type { CalculationRow, CalculationData } from '../types/wizard'
import styles from './PricingCalculationTable.module.css'

interface PricingCalculationTableProps {
  data: CalculationData
  onDataChange: (data: CalculationData) => void
  currency?: string
}

export const PricingCalculationTable: React.FC<PricingCalculationTableProps> = ({
  data,
  onDataChange,
  currency = 'USD'
}) => {
  const [editingCell, setEditingCell] = useState<{ rowIndex: number; columnKey: string } | null>(null)
  const [focusedCell, setFocusedCell] = useState<{ rowIndex: number; columnKey: string } | null>(null)

  console.log('PricingCalculationTable render, data:', data)

  // Ensure we always have at least one row
  const tableData = useMemo(() => {
    console.log('tableData useMemo, data.rows.length:', data.rows.length)
    if (data.rows.length === 0) {
      const newRow = createEmptyRow(data.columns)
      console.log('Created new row:', newRow)
      const newData = {
        ...data,
        rows: [newRow]
      }
      console.log('Returning new tableData:', newData)
      return newData
    }
    console.log('Returning existing data:', data)
    return data
  }, [data])

  const addRow = useCallback(() => {
    const newRow = createEmptyRow(tableData.columns)
    const updatedRows = [...tableData.rows, newRow]
    const calculatedRows = updateCalculatedValues(updatedRows, tableData.columns)
    const newTotalPrice = calculateGrandTotal(calculatedRows, tableData.columns)

    onDataChange({
      ...tableData,
      rows: calculatedRows,
      totalPrice: newTotalPrice,
      isComplete: !hasValidationErrors(calculatedRows, tableData.columns) && calculatedRows.length > 0
    })
  }, [tableData, onDataChange])

  const deleteRow = useCallback((rowId: string) => {
    const updatedRows = tableData.rows.filter(row => row.id !== rowId)
    const calculatedRows = updateCalculatedValues(updatedRows, tableData.columns)
    const newTotalPrice = calculateGrandTotal(calculatedRows, tableData.columns)

    onDataChange({
      ...tableData,
      rows: calculatedRows,
      totalPrice: newTotalPrice,
      isComplete: !hasValidationErrors(calculatedRows, tableData.columns) && calculatedRows.length > 0
    })
  }, [tableData, onDataChange])

  const handleCellEdit = useCallback((rowIndex: number, columnKey: string, value: any) => {
    console.log('handleCellEdit called:', { rowIndex, columnKey, value })
    const updatedRows = tableData.rows.map((row, index) => {
      if (index === rowIndex) {
        return {
          ...row,
          cells: {
            ...row.cells,
            [columnKey]: {
              ...row.cells[columnKey],
              value
            }
          }
        }
      }
      return row
    })

    const calculatedRows = updateCalculatedValues(updatedRows, tableData.columns)
    const newTotalPrice = calculateGrandTotal(calculatedRows, tableData.columns)

    onDataChange({
      ...tableData,
      rows: calculatedRows,
      totalPrice: newTotalPrice,
      isComplete: !hasValidationErrors(calculatedRows, tableData.columns) && calculatedRows.length > 0
    })
  }, [tableData, onDataChange])

  const {
    tableRef,
    handleNavigation,
    handleCellClick,
    handleKeyDown,
    handleCellSave,
    handleCellCancel
  } = useSpreadsheetNavigation({
    rows: tableData.rows,
    columns: tableData.columns,
    editingCell,
    setEditingCell,
    focusedCell,
    setFocusedCell,
    onCellEdit: handleCellEdit,
    addRow
  })

  const validationErrors = useMemo(() => {
    return validateAllRows(tableData.rows, tableData.columns)
  }, [tableData.rows, tableData.columns])

  const getErrorMessage = useCallback((rowId: string, columnKey: string) => {
    return validationErrors[rowId]?.[columnKey] || undefined
  }, [validationErrors])

  const columnHelper = createColumnHelper<CalculationRow>()

  const tableColumns = useMemo(() => {
    const cols = tableData.columns.map(column => 
      columnHelper.accessor(
        row => row.cells[column.key]?.value,
        {
          id: column.key,
          header: column.label,
          size: column.width || 120,
          cell: ({ row, getValue }) => {
            const rowIndex = row.index
            const value = getValue()
            const isEditing = editingCell?.rowIndex === rowIndex && editingCell?.columnKey === column.key
            // const isFocused = focusedCell?.rowIndex === rowIndex && focusedCell?.columnKey === column.key
            const hasError = validationErrors[row.original.id]?.[column.key]
            const isEdited = row.original.cells[column.key]?.value !== (column.type === 'readonly' ? 0 : '')

            return (
              <EditableCell
                value={column.type === 'readonly' ? 
                  formatDisplayValue(value, column.type, currency) : 
                  value || (column.type === 'number' || column.type === 'currency' || column.type === 'percentage' ? 0 : '')
                }
                type={column.type === 'currency' || column.type === 'percentage' ? 'number' : 
                      column.type === 'readonly' ? 'readonly' : 
                      column.type}
                isEditing={isEditing}
                isEdited={isEdited}
                hasError={!!hasError}
                errorMessage={getErrorMessage(row.original.id, column.key)}
                onEdit={() => handleCellClick(rowIndex, column.key)}
                onChange={(newValue) => handleCellEdit(rowIndex, column.key, newValue)}
                onSave={() => handleCellSave(rowIndex, column.key, row.original.cells[column.key]?.value)}
                onCancel={handleCellCancel}
                onNavigate={handleNavigation}
              />
            )
          }
        }
      )
    )

    // Add action column for delete button
    cols.push(
      columnHelper.display({
        id: 'actions',
        header: '',
        size: 50,
        cell: ({ row }) => (
          <div className="px-3 py-2 h-full flex items-center justify-center group">
            <button
              onClick={() => deleteRow(row.original.id)}
              className="opacity-0 group-hover:opacity-100 w-5 h-5 text-gray-400 hover:text-red-600 transition-all duration-150 flex items-center justify-center rounded hover:bg-red-50"
              disabled={tableData.rows.length <= 1}
              title="Delete row"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        )
      }) as any
    )

    return cols
  }, [tableData.columns, tableData.rows.length, editingCell, focusedCell, validationErrors, currency, columnHelper, handleCellClick, handleCellEdit, handleCellSave, handleCellCancel, handleNavigation, deleteRow])

  const table = useReactTable({
    data: tableData.rows,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel()
  })

  const hasErrors = Object.keys(validationErrors).length > 0

  return (
    <div className="space-y-4">
      {/* Airtable-style table container */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[500px]">
          <table 
            ref={tableRef}
            className={`w-full font-sans text-sm border-separate border-spacing-0 ${styles.airtableTable}`}
            onKeyDown={handleKeyDown}
            tabIndex={0}
          >
            <thead className="bg-gray-50 sticky top-0 z-20">
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header, headerIndex) => (
                    <th
                      key={header.id}
                      className={`
                        px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider 
                        border-r border-b relative group transition-colors duration-150
                        ${headerIndex === 0 ? 'border-l-0' : ''}
                        ${styles.headerCell}
                      `}
                      style={{ width: header.getSize(), minWidth: header.getSize() }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="truncate">
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </span>
                        {!header.isPlaceholder && header.column.id !== 'actions' && (
                          <div className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="bg-white">
              {table.getRowModel().rows.map((row, index) => (
                <tr
                  key={row.id}
                  className={`
                    group transition-colors duration-150 ${styles.tableRow}
                    ${index % 2 === 0 ? styles.evenRow : styles.oddRow}
                  `}
                >
                  {row.getVisibleCells().map((cell, cellIndex) => (
                    <td
                      key={cell.id}
                      data-row={row.index}
                      data-col={cell.column.id}
                      className={`
                        border-r border-b p-0 relative ${styles.cell}
                        ${cellIndex === 0 ? 'border-l-0' : ''}
                      `}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
              {/* Empty state row */}
              {tableData.rows.length === 0 && (
                <tr>
                  <td colSpan={tableData.columns.length + 1} className="px-6 py-12 text-center text-gray-500 border-b border-gray-300">
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-3">
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      </div>
                      <p className="text-sm font-medium">No data yet</p>
                      <p className="text-xs text-gray-400 mt-1">Click "Add Row" to get started</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Airtable-style controls */}
      <div className="flex justify-between items-center px-1">
        <div className="flex items-center space-x-3">
          <button
            onClick={addRow}
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-150"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add row
          </button>
          
          <div className="text-xs text-gray-500">
            {tableData.rows.length} {tableData.rows.length === 1 ? 'row' : 'rows'}
          </div>
        </div>
        
        <div className="flex items-center space-x-6">
          {hasErrors && (
            <div className="flex items-center text-red-600 text-sm">
              <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {Object.keys(validationErrors).length} validation {Object.keys(validationErrors).length === 1 ? 'error' : 'errors'}
            </div>
          )}
          
          <div className="text-right">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Total Price</div>
            <div className="text-lg font-semibold text-gray-900">
              {formatDisplayValue(tableData.totalPrice, 'currency', currency)}
            </div>
          </div>
        </div>
      </div>

      {hasErrors && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-red-800 mb-2">
                {Object.keys(validationErrors).length === 1 ? '1 validation error' : `${Object.keys(validationErrors).length} validation errors`}
              </h4>
              <div className="space-y-1">
                {Object.entries(validationErrors).map(([rowId, errors]) => {
                  const rowIndex = tableData.rows.findIndex(row => row.id === rowId)
                  return Object.entries(errors).map(([columnKey, error]) => {
                    const column = tableData.columns.find(col => col.key === columnKey)
                    return (
                      <div key={`${rowId}-${columnKey}`} className="text-sm text-red-700">
                        <span className="font-medium">Row {rowIndex + 1}, {column?.label}:</span> {error}
                      </div>
                    )
                  })
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}