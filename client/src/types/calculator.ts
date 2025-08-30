/**
 * Type definitions for the pricing calculator functionality
 */

/**
 * Input parameters for price calculation requests
 */
export interface CalculationInput {
  /** ID of the rate card to use for calculation */
  rateCardId: string
  /** Quantity of units to calculate pricing for */
  quantity: number
  /** Additional parameters specific to pricing model (e.g., base cost, billing period) */
  parameters?: Record<string, any>
}

/**
 * Result structure for price calculations
 */
export interface CalculationResult {
  /** Rate card used for the calculation */
  rateCard: RateCard
  /** Quantity used in calculation */
  quantity: number
  /** Final calculated price */
  totalPrice: number
  /** Detailed breakdown of how price was calculated */
  breakdown: CalculationBreakdown
  /** Parameters used in calculation */
  parameters?: Record<string, any>
  /** Timestamp when calculation was performed */
  calculatedAt: Date
}

/**
 * Detailed breakdown of price calculations
 */
export interface CalculationBreakdown {
  /** Pricing model used */
  model: PricingModel
  /** Total quantity processed */
  totalQuantity: number
  /** Model-specific breakdown details */
  details: TieredBreakdown | SeatBasedBreakdown | FlatRateBreakdown | CostPlusBreakdown | SubscriptionBreakdown
  /** Effective average price per unit */
  effectiveAveragePrice?: number
  /** Any discounts applied */
  discounts?: DiscountBreakdown[]
  /** Additional fees or charges */
  additionalCharges?: AdditionalChargeBreakdown[]
}

/**
 * Breakdown for tiered pricing calculations
 */
export interface TieredBreakdown {
  /** Array of tier calculations */
  tiers: TierCalculation[]
  /** Base price per unit if applicable */
  basePricePerUnit?: number
}

/**
 * Individual tier calculation details
 */
export interface TierCalculation {
  /** Tier number (1-indexed) */
  tierNumber: number
  /** Quantity falling into this tier */
  quantityInTier: number
  /** Price per unit for this tier */
  pricePerUnitInTier: number
  /** Subtotal for this tier */
  tierSubtotal: number
  /** Tier range description */
  tierRange: string
}

/**
 * Breakdown for seat-based pricing calculations
 */
export interface SeatBasedBreakdown {
  /** Number of seats */
  seats: number
  /** Price per seat */
  pricePerSeat: number
  /** Base price before discounts */
  basePrice: number
  /** Volume discount applied */
  volumeDiscount: number
  /** Final price after discounts */
  finalPrice: number
}

/**
 * Breakdown for flat-rate pricing calculations
 */
export interface FlatRateBreakdown {
  /** Fixed rate amount */
  flatRate: number
  /** Description of what the rate covers */
  rateDescription?: string
}

/**
 * Breakdown for cost-plus pricing calculations
 */
export interface CostPlusBreakdown {
  /** Base cost provided */
  baseCost: number
  /** Markup percentage applied */
  markupPercentage: number
  /** Markup amount */
  markupAmount: number
  /** Final price (base cost + markup) */
  finalPrice: number
}

/**
 * Breakdown for subscription pricing calculations
 */
export interface SubscriptionBreakdown {
  /** Base subscription price */
  basePrice: number
  /** Billing period used */
  billingPeriod: 'monthly' | 'quarterly' | 'yearly'
  /** Price per billing period */
  pricePerPeriod: number
  /** Any subscription discounts */
  subscriptionDiscount?: number
}

/**
 * Discount breakdown information
 */
export interface DiscountBreakdown {
  /** Type of discount */
  type: 'volume' | 'loyalty' | 'promotional' | 'custom'
  /** Discount description */
  description: string
  /** Discount amount */
  amount: number
  /** Whether discount is percentage or fixed amount */
  isPercentage: boolean
}

/**
 * Additional charges breakdown
 */
export interface AdditionalChargeBreakdown {
  /** Type of charge */
  type: 'setup' | 'maintenance' | 'support' | 'custom'
  /** Charge description */
  description: string
  /** Charge amount */
  amount: number
}

/**
 * Calculation history entry
 */
export interface CalculationHistoryEntry {
  /** Unique identifier for the calculation */
  id: string
  /** Calculation result */
  result: CalculationResult
  /** User notes about the calculation */
  notes?: string
  /** Whether calculation is saved/bookmarked */
  isBookmarked: boolean
}

/**
 * Calculator state management interface
 */
export interface CalculatorState {
  /** Available rate cards */
  rateCards: RateCard[]
  /** Currently selected rate card */
  selectedRateCard: RateCard | null
  /** Current quantity input */
  quantity: number
  /** Custom parameters for calculation */
  customParameters: Record<string, any>
  /** Current calculation result */
  calculationResult: CalculationResult | null
  /** Calculation history */
  calculationHistory: CalculationHistoryEntry[]
  /** Loading states */
  loading: {
    rateCards: boolean
    calculating: boolean
  }
  /** Error states */
  error: {
    rateCards: string | null
    calculation: string | null
  }
}

// Re-export types from main types file for convenience
export type { RateCard, PricingModel, TieredPricing, SeatBasedPricing, FlatRatePricing, CostPlusPricing, SubscriptionPricing } from '../types'