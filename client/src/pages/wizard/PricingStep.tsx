import { useState } from 'react'
import { useRateCardWizard } from '../../contexts/RateCardWizardContext'
import type { PricingModel } from '../../types'

interface PricingModelOption {
  id: PricingModel
  title: string
  description: string
  icon: string
}

const pricingModels: PricingModelOption[] = [
  {
    id: 'tiered',
    title: 'Tiered Pricing',
    description: 'Set different prices based on quantity ranges',
    icon: '📊'
  },
  {
    id: 'seat-based',
    title: 'Seat-Based Pricing',
    description: 'Price per user with volume discounts',
    icon: '👥'
  },
  {
    id: 'flat-rate',
    title: 'Flat-Rate Pricing',
    description: 'Single fixed price regardless of usage',
    icon: '💰'
  },
  {
    id: 'cost-plus',
    title: 'Cost-Plus Pricing',
    description: 'Base cost plus markup percentage',
    icon: '📈'
  },
  {
    id: 'subscription',
    title: 'Subscription Pricing',
    description: 'Recurring monthly or annual pricing',
    icon: '🔄'
  }
]

export default function PricingStep({ onCancel }: { onCancel: () => void }) {
  const { state, actions } = useRateCardWizard()
  const [selectedModel, setSelectedModel] = useState<PricingModel>(state.pricingModel)

  const handleModelSelect = (modelId: PricingModel) => {
    setSelectedModel(modelId)
    actions.setPricingModel(modelId)
  }

  const getDefaultPricingData = (model: PricingModel) => {
    switch (model) {
      case 'tiered':
        return { tiers: [{ min: 1, max: 100, pricePerUnit: 0 }, { min: 101, max: null, pricePerUnit: 0 }] }
      case 'seat-based':
        return { lineItems: [{ name: 'Basic Seat', pricePerSeat: 0 }], minimumSeats: 1 }
      case 'flat-rate':
        return { price: 0, billingPeriod: 'one-time' }
      case 'cost-plus':
        return { baseCost: 0, markupPercent: 0, units: '' }
      case 'subscription':
        return { termType: 'months', pricePerTerm: 0, numberOfTerms: 1 }
      default:
        return { price: 0 }
    }
  }

  const handleNext = () => {
    actions.nextStep()
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">Pricing Method</h2>
        <p className="text-sm text-gray-600 mb-6">
          Choose the pricing structure that best fits your product or service.
        </p>
      </div>


      {/* Pricing Model Selection */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
        {pricingModels.map((model) => (
          <div
            key={model.id}
            className={`relative rounded-lg border-2 p-4 cursor-pointer transition-colors ${
              selectedModel === model.id
                ? 'border-primary-600 bg-primary-50'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
            onClick={() => handleModelSelect(model.id)}
          >
            <div className="flex items-center">
              <input
                type="radio"
                name="pricingModel"
                value={model.id}
                checked={selectedModel === model.id}
                onChange={() => handleModelSelect(model.id)}
                className="h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
              />
              <div className="ml-3 flex-1">
                <div className="flex items-center">
                  <span className="text-xl mr-3">{model.icon}</span>
                  <div>
                    <label className="font-medium text-gray-900 cursor-pointer">
                      {model.title}
                    </label>
                    <p className="text-sm text-gray-500" style={{ color: '#6B7280' }}>
                      {model.description}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary of selected options */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Summary</h3>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-600">Card Name:</dt>
            <dd className="text-gray-900 font-medium">{state.cardName}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600">Owner Team:</dt>
            <dd className="text-gray-900 font-medium">{state.ownerTeam}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600">Currency:</dt>
            <dd className="text-gray-900 font-medium">{state.currency}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600">Product:</dt>
            <dd className="text-gray-900 font-medium">{state.skuId ? 'Linked to SKU' : 'Standalone'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600">Pricing Model:</dt>
            <dd className="text-gray-900 font-medium">
              {pricingModels.find(m => m.id === selectedModel)?.title || 'Not selected'}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600">Sharing:</dt>
            <dd className="text-gray-900 font-medium capitalize">{state.permissions.type}</dd>
          </div>
        </dl>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row justify-between space-y-4 sm:space-y-0 border-t pt-6">
        <button
          type="button"
          onClick={actions.previousStep}
          className="btn-secondary w-full sm:w-auto"
        >
          Back
        </button>
        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary w-full sm:w-auto order-2 sm:order-1"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="btn-primary w-full sm:w-auto order-1 sm:order-2"
          >
            Next: Calculation
          </button>
        </div>
      </div>
    </div>
  )
}