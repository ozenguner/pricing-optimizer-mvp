import type { Currency, OwnerTeam, PricingModel, SharingPermissions } from './index'

// Enhanced calculation table types
export interface CalculationCell {
  value: any
  formula?: string
  error?: string
}

export interface CalculationRow {
  id: string
  cells: Record<string, CalculationCell>
}

export interface ColumnDefinition {
  key: string
  label: string
  type: 'text' | 'number' | 'percentage' | 'currency' | 'readonly'
  required?: boolean
  validation?: (value: any, row: CalculationRow, allRows: CalculationRow[]) => string | null
  formula?: (row: CalculationRow, allRows: CalculationRow[]) => any
  width?: number
}

export interface CalculationHistory {
  id: string
  action: 'edit' | 'add' | 'delete' | 'reorder'
  timestamp: number
  previousState: CalculationRow[]
  newState: CalculationRow[]
  description: string
}

export interface CalculationData {
  rows: CalculationRow[]
  columns: ColumnDefinition[]
  totalPrice: number
  validFrom?: Date
  validUntil?: Date
  isComplete: boolean
  history: CalculationHistory[]
  historyIndex: number
}

export interface WizardData {
  // Step 1: Card Details
  name: string
  skuId?: string
  ownerTeam: OwnerTeam
  currency: Currency
  sharingPermissions: SharingPermissions
  
  // Step 2: Pricing
  pricingModel: PricingModel
  data: any
  isActive: boolean
  description?: string
  
  // Step 3: Calculation
  calculationData?: CalculationData
}

export interface WizardStepProps {
  data: WizardData
  onUpdate: (updates: Partial<WizardData>) => void
  onCancel: () => void
}

export interface CardDetailsStepProps extends WizardStepProps {
  onNext: () => void
}

export interface PricingStepProps extends WizardStepProps {
  onPrevious: () => void
  onNext: () => void
}

export interface CalculationStepProps extends WizardStepProps {
  onPrevious: () => void
  onFinish: () => void
}