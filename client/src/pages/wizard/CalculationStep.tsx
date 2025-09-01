import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalculatorIcon } from '@heroicons/react/24/outline'
import { useRateCardWizard } from '../../contexts/RateCardWizardContext'
import { rateCardService } from '../../services/rateCards'
import { CalculationTable } from '../../components/CalculationTable'
import type { CalculationData } from '../../types/wizard'
import { getColumnsForPricingModel, createEmptyRow } from '../../utils/calculationColumns'

interface CalculationStepProps {
  onCancel: () => void
}

const CalculationStep = ({ onCancel }: CalculationStepProps) => {
  const navigate = useNavigate()
  const { state, actions } = useRateCardWizard()
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  // Initialize calculation data based on pricing model
  const [calculationData, setCalculationData] = useState<CalculationData>(() => {
    if (state.calculationData) {
      return state.calculationData
    }

    const columns = getColumnsForPricingModel(state.pricingModel)
    const initialRow = createEmptyRow(columns)
    
    return {
      rows: [initialRow],
      columns,
      totalPrice: 0,
      validFrom: undefined,
      validUntil: undefined,
      isComplete: false,
      history: [],
      historyIndex: -1
    }
  })

  // Update wizard context when calculation data changes
  useEffect(() => {
    actions.setCalculationData(calculationData)
  }, [calculationData, actions])

  const handleTableChange = (newData: CalculationData) => {
    setCalculationData(newData)
  }

  // Validate form before allowing finish
  const handleFinish = async () => {
    const errors: Record<string, string> = {}
    let hasErrors = false

    // Check if table data is complete
    if (!calculationData.isComplete) {
      errors.table = 'Please complete all required fields in the calculation table'
      hasErrors = true
    }

    // Check if there are any validation errors in the table
    const hasTableErrors = calculationData.rows.some(row => 
      calculationData.columns.some(column => 
        row.cells[column.key]?.error
      )
    )

    if (hasTableErrors) {
      errors.table = 'Please fix all validation errors in the table'
      hasErrors = true
    }

    if (calculationData.totalPrice <= 0) {
      errors.totalPrice = 'Total price must be greater than 0'
      hasErrors = true
    }

    setValidationErrors(errors)

    if (!hasErrors) {
      try {
        const wizardData = actions.getWizardData()
        await rateCardService.create(wizardData)
        actions.resetWizard()
        navigate('/rate-cards')
      } catch (error) {
        console.error('Failed to create rate card:', error)
        // Could add error handling UI here
      }
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <CalculatorIcon className="w-8 h-8 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Pricing Calculation</h2>
            <p className="text-gray-600">Define your cost breakdown and calculate the total price</p>
          </div>
        </div>
      </div>

      {/* Enhanced Calculation Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-6">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {state.pricingModel.charAt(0).toUpperCase() + state.pricingModel.slice(1).replace('-', ' ')} Pricing Breakdown
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Define your pricing structure using the interactive table below. Click any cell to edit, use formulas for calculations.
          </p>
        </div>

        <div className="p-4">
          <CalculationTable
            pricingModel={state.pricingModel}
            currency={state.currency}
            data={calculationData}
            onChange={handleTableChange}
          />
        </div>
      </div>

      {/* Validity Period (Optional) */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Price Validity Period (Optional)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Valid From</label>
            <input
              type="date"
              value={calculationData.validFrom ? calculationData.validFrom.toISOString().split('T')[0] : ''}
              onChange={(e) => {
                const date = e.target.value ? new Date(e.target.value) : undefined
                setCalculationData(prev => ({ ...prev, validFrom: date }))
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Valid Until</label>
            <input
              type="date"
              value={calculationData.validUntil ? calculationData.validUntil.toISOString().split('T')[0] : ''}
              onChange={(e) => {
                const date = e.target.value ? new Date(e.target.value) : undefined
                setCalculationData(prev => ({ ...prev, validUntil: date }))
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between">
        <button
          onClick={actions.previousStep}
          className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Previous
        </button>
        
        <button
          onClick={handleFinish}
          disabled={!calculationData.isComplete}
          className={`px-8 py-3 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
            calculationData.isComplete
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          Create Rate Card
        </button>
      </div>

      {(validationErrors.table || validationErrors.totalPrice || !calculationData.isComplete) && (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-yellow-800 text-sm">
            <strong>Validation Issues:</strong>
          </p>
          <ul className="text-yellow-800 text-sm mt-2 list-disc list-inside">
            {validationErrors.table && <li>{validationErrors.table}</li>}
            {validationErrors.totalPrice && <li>{validationErrors.totalPrice}</li>}
            {!calculationData.isComplete && <li>Please complete all required fields in the table</li>}
          </ul>
        </div>
      )}
    </div>
  )
}

export default CalculationStep