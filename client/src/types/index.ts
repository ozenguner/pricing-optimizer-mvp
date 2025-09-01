export interface User {
  id: string
  email: string
  password?: string
  name: string
  verified?: boolean
  verifiedAt?: string
  createdAt: string
  updatedAt: string
  folders?: Folder[]
  rateCards?: RateCard[]
}

export interface AuthResponse {
  message: string
  user?: User
  token?: string
  requiresVerification?: boolean
  verificationEmailSent?: boolean
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

export interface Account {
  id: string
  name: string
  createdAt: string
  productSuites?: ProductSuite[]
}

export interface ProductSuite {
  id: string
  name: string
  accountId: string
  account?: Account
  skus?: SKU[]
  createdAt: string
}

export interface SKU {
  id: string
  code: string
  name: string
  productSuiteId: string
  productSuite?: ProductSuite
  rateCards?: RateCard[]
  createdAt: string
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
  currency: Currency
  ownerTeam: OwnerTeam
  pricingModel: PricingModel
  data: PricingData
  isActive: boolean
  shareToken?: string
  sharingPermissions: SharingPermissions
  skuId?: string
  folderId?: string
  userId?: string
  createdAt: string
  updatedAt: string
  sku?: SKU
  user?: User
  folder?: Folder
}

export type PricingModel = 'tiered' | 'seat-based' | 'flat-rate' | 'cost-plus' | 'subscription'
export type Currency = 'USD' | 'CAD' | 'EUR' | 'GBP' | 'JPY'
export type OwnerTeam = 'Marketing' | 'Sales' | 'Pricing' | 'Finance'

export const CurrencySymbols: Record<Currency, string> = {
  'USD': '$',
  'CAD': 'C$',
  'EUR': '€', 
  'GBP': '£',
  'JPY': '¥'
}

// Different data structures for each pricing model
export interface TieredPricing {
  tiers: Array<{
    min: number
    max: number | null
    pricePerUnit: number
    costPerUnit?: number
  }>
}

export interface SeatBasedPricing {
  lineItems: Array<{
    name: string
    pricePerSeat: number
    costPerSeat?: number
  }>
  minimumSeats?: number
}

export interface FlatRatePricing {
  price: number
  cost?: number
  billingPeriod?: 'one-time' | 'monthly' | 'yearly'
}

export interface CostPlusPricing {
  baseCost: number
  costPerUnit?: number
  markupPercent: number
  units: string
}

export interface SubscriptionPricing {
  termType: 'days' | 'months' | 'quarters' | 'years'
  pricePerTerm: number
  costPerTerm?: number
  numberOfTerms: number
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