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

export type SharingType = 'internal' | 'external'
export type PermissionLevel = 'view' | 'edit' | 'admin'

export interface SharingPermissions {
  type: SharingType
  allowedDomains?: string[] // For internal sharing
  permissions: {
    level: PermissionLevel
    allowSharing?: boolean // Can reshare with others
    allowDownload?: boolean // Can download/export
    expiresAt?: string // Optional expiration
  }
}

export interface RateCard {
  id: string
  name: string
  description?: string
  pricingModel: PricingModel
  data: PricingData
  isActive: boolean
  shareToken?: string
  sharingPermissions: SharingPermissions
  folderId?: string
  userId: string
  createdAt: string
  updatedAt: string
  user: User
  folder?: Folder
}

export type PricingModel = 'tiered' | 'seat-based' | 'flat-rate' | 'cost-plus' | 'subscription'

// Different data structures for each pricing model
export interface TieredPricing {
  tiers: Array<{
    min: number
    max: number | null
    pricePerUnit: number
  }>
}

export interface SeatBasedPricing {
  pricePerSeat: number
  minimumSeats?: number
  volumeDiscounts?: Array<{
    minSeats: number
    discountPercent: number
  }>
}

export interface FlatRatePricing {
  price: number
  billingPeriod?: 'one-time' | 'monthly' | 'yearly'
}

export interface CostPlusPricing {
  baseCost: number
  markupPercent: number
}

export interface SubscriptionPricing {
  monthlyPrice: number
  yearlyPrice?: number
  setupFee?: number
  features?: string[]
}

export type PricingData = TieredPricing | SeatBasedPricing | FlatRatePricing | CostPlusPricing | SubscriptionPricing

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