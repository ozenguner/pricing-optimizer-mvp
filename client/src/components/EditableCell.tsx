import React, { useState, useEffect, useRef } from 'react'

interface EditableCellProps {
  value: string | number
  type: 'text' | 'number' | 'readonly'
  isEditing: boolean
  isEdited: boolean
  hasError: boolean
  errorMessage?: string
  onEdit: () => void
  onChange: (value: string | number) => void
  onSave: () => void
  onCancel: () => void
  onNavigate: (direction: 'up' | 'down' | 'left' | 'right' | 'tab' | 'enter') => void
}

export const EditableCell: React.FC<EditableCellProps> = ({
  value,
  type,
  isEditing,
  isEdited,
  hasError,
  errorMessage,
  onEdit,
  onChange,
  onSave,
  onCancel,
  onNavigate
}) => {
  const [localValue, setLocalValue] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  // Update local value when prop changes
  useEffect(() => {
    if (!isEditing) {
      setLocalValue(value)
    }
  }, [value, isEditing])

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
        e.preventDefault()
        onSave()
        onNavigate('enter')
        break
      case 'Tab':
        e.preventDefault()
        onSave()
        onNavigate('tab')
        break
      case 'Escape':
        e.preventDefault()
        onCancel()
        break
      case 'ArrowUp':
        e.preventDefault()
        onSave()
        onNavigate('up')
        break
      case 'ArrowDown':
        e.preventDefault()
        onSave()
        onNavigate('down')
        break
      case 'ArrowLeft':
        // Only navigate if at start of input
        if (inputRef.current?.selectionStart === 0) {
          e.preventDefault()
          onSave()
          onNavigate('left')
        }
        break
      case 'ArrowRight':
        // Only navigate if at end of input
        if (inputRef.current?.selectionEnd === inputRef.current?.value.length) {
          e.preventDefault()
          onSave()
          onNavigate('right')
        }
        break
      case 'F2':
        e.preventDefault()
        if (!isEditing) {
          onEdit()
        }
        break
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = type === 'number' ? parseFloat(e.target.value) || e.target.value : e.target.value
    setLocalValue(newValue)
    onChange(newValue)
  }

  const handleBlur = () => {
    onSave()
  }

  const handleClick = () => {
    console.log('Cell clicked, isEditing:', isEditing, 'type:', type)
    if (!isEditing) {
      onEdit()
    }
  }

  const handleDoubleClick = () => {
    if (!isEditing) {
      onEdit()
    }
  }

  const formatDisplayValue = (val: string | number): string => {
    if (type === 'number' && typeof val === 'number') {
      return val.toLocaleString()
    }
    return String(val || '')
  }

  const cellClassName = `
    relative cursor-pointer font-sans text-sm min-h-[35px] group
    transition-all duration-150
    ${isEdited ? 'bg-blue-50' : ''}
    ${hasError ? 'bg-red-50' : ''}
    ${type === 'readonly' ? 'bg-gray-50 cursor-default' : ''}
    ${isEditing ? 'ring-2 ring-blue-500 ring-inset z-10 bg-white' : ''}
  `.trim().replace(/\s+/g, ' ')

  if (isEditing && type !== 'readonly') {
    return (
      <td className={cellClassName}>
        <div className="px-3 py-2 h-full flex items-center">
          <input
            ref={inputRef}
            type={type === 'number' ? 'number' : 'text'}
            value={localValue}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className="w-full bg-transparent border-none outline-none font-sans text-sm text-gray-900 placeholder-gray-400"
            step={type === 'number' ? 'any' : undefined}
            placeholder={type === 'number' ? '0' : 'Enter value...'}
          />
        </div>
      </td>
    )
  }

  return (
    <td
      className={cellClassName}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
      tabIndex={type === 'readonly' ? -1 : 0}
    >
      <div className="px-3 py-2 h-full flex items-center justify-between">
        <span className="text-gray-900 truncate flex-1">
          {formatDisplayValue(value) || (type !== 'readonly' && !value && (
            <span className="text-gray-400 italic">Empty</span>
          ))}
        </span>
        {hasError && (
          <div className="ml-2 flex-shrink-0">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
          </div>
        )}
      </div>
      {hasError && (
        <div className="absolute left-0 top-full mt-1 z-20 bg-red-600 text-white text-xs py-1 px-2 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
          {errorMessage || 'Invalid value'}
        </div>
      )}
    </td>
  )
}