import { useNavigate } from 'react-router-dom'
import { RateCardWizardProvider, useRateCardWizard } from '../contexts/RateCardWizardContext'
import CardDetailsStep from './wizard/CardDetailsStep'
import PricingStep from './wizard/PricingStep'
import CalculationStep from './wizard/CalculationStep'

function WizardContent() {
  const navigate = useNavigate()
  const { state, actions } = useRateCardWizard()

  const handleCancel = () => {
    actions.resetWizard()
    navigate('/rate-cards')
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <nav className="flex text-sm text-gray-500" aria-label="Breadcrumb">
        <ol className="inline-flex items-center space-x-1 md:space-x-3">
          <li className="inline-flex items-center">
            <button
              onClick={() => navigate('/rate-cards')}
              className="inline-flex items-center text-gray-700 hover:text-primary-600 transition-colors"
            >
              Rate Cards
            </button>
          </li>
          <li>
            <div className="flex items-center">
              <svg className="w-4 h-4 text-gray-400 mx-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path>
              </svg>
              <span className="text-gray-500">Create New</span>
            </div>
          </li>
          <li>
            <div className="flex items-center">
              <svg className="w-4 h-4 text-gray-400 mx-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path>
              </svg>
              <span className="text-primary-600 font-medium">
                {state.currentStep === 1 ? 'Card Details' : state.currentStep === 2 ? 'Pricing Model' : 'Calculation'}
              </span>
            </div>
          </li>
        </ol>
      </nav>

      {/* Wizard Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Create Rate Card</h1>
        <p className="mt-2 text-gray-600">
          Build a new pricing structure for your products or services
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div className={`flex items-center space-x-2 md:space-x-3 ${state.currentStep >= 1 ? 'text-primary-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              state.currentStep >= 1 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              1
            </div>
            <span className="font-medium text-sm md:text-base">Card Details</span>
          </div>
          
          <div className={`flex-1 h-px mx-2 md:mx-4 ${state.currentStep >= 2 ? 'bg-primary-600' : 'bg-gray-200'}`}></div>
          
          <div className={`flex items-center space-x-2 md:space-x-3 ${state.currentStep >= 2 ? 'text-primary-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              state.currentStep >= 2 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              2
            </div>
            <span className="font-medium text-sm md:text-base">Pricing Model</span>
          </div>

          <div className={`flex-1 h-px mx-2 md:mx-4 ${state.currentStep >= 3 ? 'bg-primary-600' : 'bg-gray-200'}`}></div>
          
          <div className={`flex items-center space-x-2 md:space-x-3 ${state.currentStep >= 3 ? 'text-primary-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              state.currentStep >= 3 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              3
            </div>
            <span className="font-medium text-sm md:text-base">Calculation</span>
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-lg border border-gray-200">
        {state.currentStep === 1 && (
          <CardDetailsStep onCancel={handleCancel} />
        )}
        {state.currentStep === 2 && (
          <PricingStep onCancel={handleCancel} />
        )}
        {state.currentStep === 3 && (
          <CalculationStep onCancel={handleCancel} />
        )}
      </div>
    </div>
  )
}

export default function RateCardWizard() {
  return (
    <RateCardWizardProvider>
      <WizardContent />
    </RateCardWizardProvider>
  )
}