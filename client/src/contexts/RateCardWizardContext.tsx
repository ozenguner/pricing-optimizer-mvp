import React, { createContext, useContext, useReducer, ReactNode } from 'react'
import type { Currency, OwnerTeam, PricingModel, SharingPermissions } from '../types'
import type { CalculationData } from '../types/wizard'

export interface RateCardWizardState {
  cardName: string
  skuId: string
  ownerTeam: OwnerTeam
  currency: Currency
  permissions: SharingPermissions
  pricingModel: PricingModel
  pricingData: any
  calculationData?: CalculationData
  currentStep: number
  isValid: {
    step1: boolean
    step2: boolean
    step3: boolean
  }
}

export type RateCardWizardAction =
  | { type: 'SET_CARD_NAME'; payload: string }
  | { type: 'SET_SKU_ID'; payload: string }
  | { type: 'SET_OWNER_TEAM'; payload: OwnerTeam }
  | { type: 'SET_CURRENCY'; payload: Currency }
  | { type: 'SET_PERMISSIONS'; payload: SharingPermissions }
  | { type: 'SET_PRICING_MODEL'; payload: PricingModel }
  | { type: 'SET_PRICING_DATA'; payload: any }
  | { type: 'SET_CALCULATION_DATA'; payload: CalculationData }
  | { type: 'SET_CURRENT_STEP'; payload: number }
  | { type: 'VALIDATE_STEP'; payload: { step: number; isValid: boolean } }
  | { type: 'RESET_WIZARD' }

const initialState: RateCardWizardState = {
  cardName: '',
  skuId: '',
  ownerTeam: 'Pricing',
  currency: 'USD',
  permissions: {
    type: 'internal',
    permissions: {
      level: 'view',
      allowSharing: false,
      allowDownload: true
    }
  },
  pricingModel: 'tiered',
  pricingData: {},
  currentStep: 1,
  isValid: {
    step1: false,
    step2: false,
    step3: false
  }
}

function wizardReducer(state: RateCardWizardState, action: RateCardWizardAction): RateCardWizardState {
  switch (action.type) {
    case 'SET_CARD_NAME':
      return {
        ...state,
        cardName: action.payload,
        isValid: {
          ...state.isValid,
          step1: action.payload.trim().length > 0
        }
      }

    case 'SET_SKU_ID':
      return {
        ...state,
        skuId: action.payload
      }

    case 'SET_OWNER_TEAM':
      return {
        ...state,
        ownerTeam: action.payload
      }

    case 'SET_CURRENCY':
      return {
        ...state,
        currency: action.payload
      }

    case 'SET_PERMISSIONS':
      return {
        ...state,
        permissions: action.payload
      }

    case 'SET_PRICING_MODEL':
      return {
        ...state,
        pricingModel: action.payload,
        pricingData: getDefaultPricingData(action.payload),
        isValid: {
          ...state.isValid,
          step2: true
        }
      }

    case 'SET_PRICING_DATA':
      return {
        ...state,
        pricingData: action.payload
      }

    case 'SET_CALCULATION_DATA':
      return {
        ...state,
        calculationData: action.payload,
        isValid: {
          ...state.isValid,
          step3: action.payload.isComplete
        }
      }

    case 'SET_CURRENT_STEP':
      return {
        ...state,
        currentStep: action.payload
      }

    case 'VALIDATE_STEP':
      return {
        ...state,
        isValid: {
          ...state.isValid,
          [`step${action.payload.step}`]: action.payload.isValid
        }
      }

    case 'RESET_WIZARD':
      return initialState

    default:
      return state
  }
}

function getDefaultPricingData(model: PricingModel) {
  switch (model) {
    case 'tiered':
      return {
        tiers: [
          { min: 1, max: 100, pricePerUnit: 0 },
          { min: 101, max: null, pricePerUnit: 0 }
        ]
      }
    case 'seat-based':
      return {
        lineItems: [{ name: 'Basic Seat', pricePerSeat: 0 }],
        minimumSeats: 1
      }
    case 'flat-rate':
      return {
        price: 0,
        billingPeriod: 'one-time'
      }
    case 'cost-plus':
      return {
        baseCost: 0,
        markupPercent: 0,
        units: ''
      }
    case 'subscription':
      return {
        termType: 'months',
        pricePerTerm: 0,
        numberOfTerms: 1
      }
    default:
      return { price: 0 }
  }
}

interface RateCardWizardContextType {
  state: RateCardWizardState
  dispatch: React.Dispatch<RateCardWizardAction>
  actions: {
    setCardName: (name: string) => void
    setSkuId: (skuId: string) => void
    setOwnerTeam: (team: OwnerTeam) => void
    setCurrency: (currency: Currency) => void
    setPermissions: (permissions: SharingPermissions) => void
    setPricingModel: (model: PricingModel) => void
    setPricingData: (data: any) => void
    setCalculationData: (data: CalculationData) => void
    goToStep: (step: number) => void
    nextStep: () => void
    previousStep: () => void
    validateStep: (step: number, isValid: boolean) => void
    resetWizard: () => void
    canProceedToStep: (step: number) => boolean
    isWizardComplete: () => boolean
    getWizardData: () => {
      name: string
      description?: string
      currency: Currency
      ownerTeam: OwnerTeam
      pricingModel: PricingModel
      data: any
      isActive: boolean
      skuId?: string
      sharingPermissions: SharingPermissions
      calculationData?: CalculationData
    }
  }
}

const RateCardWizardContext = createContext<RateCardWizardContextType | undefined>(undefined)

export function RateCardWizardProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(wizardReducer, initialState)

  const actions = {
    setCardName: (name: string) => dispatch({ type: 'SET_CARD_NAME', payload: name }),
    setSkuId: (skuId: string) => dispatch({ type: 'SET_SKU_ID', payload: skuId }),
    setOwnerTeam: (team: OwnerTeam) => dispatch({ type: 'SET_OWNER_TEAM', payload: team }),
    setCurrency: (currency: Currency) => dispatch({ type: 'SET_CURRENCY', payload: currency }),
    setPermissions: (permissions: SharingPermissions) => dispatch({ type: 'SET_PERMISSIONS', payload: permissions }),
    setPricingModel: (model: PricingModel) => dispatch({ type: 'SET_PRICING_MODEL', payload: model }),
    setPricingData: (data: any) => dispatch({ type: 'SET_PRICING_DATA', payload: data }),
    setCalculationData: (data: CalculationData) => dispatch({ type: 'SET_CALCULATION_DATA', payload: data }),
    goToStep: (step: number) => dispatch({ type: 'SET_CURRENT_STEP', payload: step }),
    nextStep: () => dispatch({ type: 'SET_CURRENT_STEP', payload: Math.min(state.currentStep + 1, 3) }),
    previousStep: () => dispatch({ type: 'SET_CURRENT_STEP', payload: Math.max(state.currentStep - 1, 1) }),
    validateStep: (step: number, isValid: boolean) => dispatch({ type: 'VALIDATE_STEP', payload: { step, isValid } }),
    resetWizard: () => dispatch({ type: 'RESET_WIZARD' }),

    canProceedToStep: (step: number): boolean => {
      if (step === 1) return true
      if (step === 2) return state.isValid.step1
      if (step === 3) return state.isValid.step1 && state.isValid.step2
      return false
    },

    isWizardComplete: (): boolean => {
      return state.isValid.step1 && state.isValid.step2 && state.isValid.step3
    },

    getWizardData: () => ({
      name: state.cardName,
      description: undefined, // Optional field not in wizard
      currency: state.currency,
      ownerTeam: state.ownerTeam,
      pricingModel: state.pricingModel,
      data: state.pricingData,
      isActive: true,
      skuId: state.skuId || undefined,
      sharingPermissions: state.permissions,
      calculationData: state.calculationData
    })
  }

  return (
    <RateCardWizardContext.Provider value={{ state, dispatch, actions }}>
      {children}
    </RateCardWizardContext.Provider>
  )
}

export function useRateCardWizard() {
  const context = useContext(RateCardWizardContext)
  if (context === undefined) {
    throw new Error('useRateCardWizard must be used within a RateCardWizardProvider')
  }
  return context
}