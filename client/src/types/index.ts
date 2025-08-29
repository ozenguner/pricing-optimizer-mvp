export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'USER' | 'ADMIN'
  createdAt: string
  updatedAt?: string
}

export interface AuthResponse {
  message: string
  user: User
  token: string
}

export interface RateCard {
  id: string
  name: string
  description?: string
  isActive: boolean
  isPublic: boolean
  userId: string
  items: RateCardItem[]
  createdAt: string
  updatedAt: string
}

export interface RateCardItem {
  id: string
  name: string
  description?: string
  basePrice: number
  unit: string
  category?: string
  pricingType: 'FIXED' | 'TIERED' | 'VOLUME' | 'PERCENTAGE'
  tiers: PricingTier[]
  rateCardId: string
  createdAt: string
  updatedAt: string
}

export interface PricingTier {
  id: string
  minQty: number
  maxQty?: number
  price: number
  discount: number
  itemId: string
}

export interface CalculationRequest {
  items: {
    itemId: string
    quantity: number
  }[]
  rateCardId: string
}

export interface CalculationResult {
  itemId: string
  itemName: string
  quantity: number
  unitPrice: number
  totalPrice: number
  appliedTier?: PricingTier
  discount: number
}