export interface User {
  id: string
  email: string
  password: string
  name: string
  createdAt: string
  updatedAt: string
  folders: Folder[]
  rateCards: RateCard[]
}

export interface AuthResponse {
  message: string
  user: User
  token: string
}

export interface Folder {
  id: string
  name: string
  parentId?: string
  userId: string
  createdAt: string
  updatedAt: string
  user: User
  parent?: Folder
  children: Folder[]
  rateCards: RateCard[]
}

export interface RateCard {
  id: string
  name: string
  description?: string
  pricingModel: 'tiered' | 'seat-based' | 'flat-rate' | 'cost-plus' | 'subscription'
  data: string // JSON string for flexible pricing structures
  isActive: boolean
  shareToken?: string
  folderId?: string
  userId: string
  createdAt: string
  updatedAt: string
  user: User
  folder?: Folder
}

// Utility type for parsed pricing data
export interface PricingData {
  [key: string]: any
}

export interface CalculationRequest {
  rateCardId: string
  quantity?: number
  parameters?: Record<string, any>
}

export interface CalculationResult {
  rateCardId: string
  totalPrice: number
  breakdown: Record<string, any>
  appliedModel: string
}