import type {
  TieredPricing,
  SeatBasedPricing,
  FlatRatePricing,
  CostPlusPricing,
  SubscriptionPricing,
  PricingModel,
  PricingData
} from '../../client/src/types/index.js'

export interface CalculationResult {
  totalPrice: number
  breakdown: {
    baseAmount?: number
    discountAmount?: number
    markupAmount?: number
    setupFee?: number
    details: Array<{
      description: string
      quantity: number
      unitPrice: number
      subtotal: number
    }>
  }
  appliedModel: PricingModel
  metadata?: Record<string, any>
}

export interface CalculationInput {
  quantity: number
  baseCost?: number // For cost-plus pricing
  billingPeriod?: 'monthly' | 'yearly' // For subscription pricing
  parameters?: Record<string, any>
}

/**
 * Calculate tiered pricing based on quantity and tier structure
 */
export function calculateTieredPrice(
  quantity: number, 
  pricing: TieredPricing
): CalculationResult {
  if (quantity <= 0) {
    throw new Error('Quantity must be greater than 0')
  }

  let totalPrice = 0
  let remainingQuantity = quantity
  const breakdown: CalculationResult['breakdown'] = { details: [] }

  // Sort tiers by minimum quantity to ensure correct processing
  const sortedTiers = [...pricing.tiers].sort((a, b) => a.min - b.min)

  for (const tier of sortedTiers) {
    if (remainingQuantity <= 0) break

    const tierMin = tier.min
    const tierMax = tier.max || Infinity
    const tierPrice = tier.pricePerUnit

    // Calculate quantity for this tier
    const quantityInTier = Math.min(
      remainingQuantity,
      Math.max(0, tierMax - tierMin + 1)
    )

    if (quantity >= tierMin && quantityInTier > 0) {
      const tierTotal = quantityInTier * tierPrice
      totalPrice += tierTotal

      breakdown.details.push({
        description: `Tier ${tierMin}-${tier.max || '∞'} @ $${tierPrice} each`,
        quantity: quantityInTier,
        unitPrice: tierPrice,
        subtotal: tierTotal
      })

      remainingQuantity -= quantityInTier
    }
  }

  return {
    totalPrice: Math.round(totalPrice * 100) / 100,
    breakdown,
    appliedModel: 'tiered',
    metadata: {
      totalQuantity: quantity,
      tiersUsed: breakdown.details.length
    }
  }
}

/**
 * Calculate seat-based pricing with volume discounts
 */
export function calculateSeatBasedPrice(
  seats: number,
  pricing: SeatBasedPricing
): CalculationResult {
  if (seats <= 0) {
    throw new Error('Number of seats must be greater than 0')
  }

  const minimumSeats = pricing.minimumSeats || 1
  const effectiveSeats = Math.max(seats, minimumSeats)
  
  let basePrice = effectiveSeats * pricing.pricePerSeat
  let discountPercent = 0
  let discountAmount = 0

  // Apply volume discount if applicable
  if (pricing.volumeDiscounts && pricing.volumeDiscounts.length > 0) {
    const applicableDiscounts = pricing.volumeDiscounts
      .filter(discount => effectiveSeats >= discount.minSeats)
      .sort((a, b) => b.discountPercent - a.discountPercent)

    if (applicableDiscounts.length > 0) {
      discountPercent = applicableDiscounts[0].discountPercent
      discountAmount = basePrice * (discountPercent / 100)
    }
  }

  const totalPrice = basePrice - discountAmount

  const breakdown: CalculationResult['breakdown'] = {
    baseAmount: basePrice,
    discountAmount,
    details: [
      {
        description: `${effectiveSeats} seats @ $${pricing.pricePerSeat} per seat`,
        quantity: effectiveSeats,
        unitPrice: pricing.pricePerSeat,
        subtotal: basePrice
      }
    ]
  }

  if (discountAmount > 0) {
    breakdown.details.push({
      description: `Volume discount (${discountPercent}% off)`,
      quantity: 1,
      unitPrice: -discountAmount,
      subtotal: -discountAmount
    })
  }

  return {
    totalPrice: Math.round(totalPrice * 100) / 100,
    breakdown,
    appliedModel: 'seat-based',
    metadata: {
      requestedSeats: seats,
      effectiveSeats,
      discountPercent,
      minimumSeatsApplied: seats < minimumSeats
    }
  }
}

/**
 * Calculate flat rate pricing
 */
export function calculateFlatRatePrice(
  quantity: number,
  pricing: FlatRatePricing
): CalculationResult {
  if (quantity <= 0) {
    throw new Error('Quantity must be greater than 0')
  }

  const totalPrice = pricing.price * quantity
  const billingPeriod = pricing.billingPeriod || 'one-time'

  const breakdown: CalculationResult['breakdown'] = {
    details: [
      {
        description: `${quantity} × $${pricing.price} (${billingPeriod})`,
        quantity,
        unitPrice: pricing.price,
        subtotal: totalPrice
      }
    ]
  }

  return {
    totalPrice: Math.round(totalPrice * 100) / 100,
    breakdown,
    appliedModel: 'flat-rate',
    metadata: {
      billingPeriod,
      unitPrice: pricing.price
    }
  }
}

/**
 * Calculate cost-plus pricing
 */
export function calculateCostPlusPrice(
  quantity: number,
  pricing: CostPlusPricing,
  baseCost?: number
): CalculationResult {
  if (quantity <= 0) {
    throw new Error('Quantity must be greater than 0')
  }

  const effectiveBaseCost = baseCost || pricing.baseCost
  const markupAmount = effectiveBaseCost * (pricing.markupPercent / 100)
  const unitPrice = effectiveBaseCost + markupAmount
  const totalPrice = unitPrice * quantity

  const breakdown: CalculationResult['breakdown'] = {
    baseAmount: effectiveBaseCost * quantity,
    markupAmount: markupAmount * quantity,
    details: [
      {
        description: `Base cost: ${quantity} × $${effectiveBaseCost}`,
        quantity,
        unitPrice: effectiveBaseCost,
        subtotal: effectiveBaseCost * quantity
      },
      {
        description: `Markup (${pricing.markupPercent}%)`,
        quantity,
        unitPrice: markupAmount,
        subtotal: markupAmount * quantity
      }
    ]
  }

  return {
    totalPrice: Math.round(totalPrice * 100) / 100,
    breakdown,
    appliedModel: 'cost-plus',
    metadata: {
      baseCost: effectiveBaseCost,
      markupPercent: pricing.markupPercent,
      unitPrice
    }
  }
}

/**
 * Calculate subscription pricing
 */
export function calculateSubscriptionPrice(
  quantity: number,
  pricing: SubscriptionPricing,
  billingPeriod: 'monthly' | 'yearly' = 'monthly'
): CalculationResult {
  if (quantity <= 0) {
    throw new Error('Quantity must be greater than 0')
  }

  let unitPrice: number
  let periodLabel: string

  if (billingPeriod === 'yearly' && pricing.yearlyPrice) {
    unitPrice = pricing.yearlyPrice
    periodLabel = 'yearly'
  } else {
    unitPrice = pricing.monthlyPrice
    periodLabel = 'monthly'
  }

  const subscriptionTotal = unitPrice * quantity
  const setupFee = pricing.setupFee || 0
  const totalPrice = subscriptionTotal + setupFee

  const breakdown: CalculationResult['breakdown'] = {
    setupFee,
    details: [
      {
        description: `${quantity} × $${unitPrice} (${periodLabel})`,
        quantity,
        unitPrice,
        subtotal: subscriptionTotal
      }
    ]
  }

  if (setupFee > 0) {
    breakdown.details.push({
      description: 'Setup fee',
      quantity: 1,
      unitPrice: setupFee,
      subtotal: setupFee
    })
  }

  return {
    totalPrice: Math.round(totalPrice * 100) / 100,
    breakdown,
    appliedModel: 'subscription',
    metadata: {
      billingPeriod,
      features: pricing.features || [],
      monthlyEquivalent: billingPeriod === 'yearly' && pricing.yearlyPrice 
        ? Math.round((pricing.yearlyPrice / 12) * 100) / 100 
        : pricing.monthlyPrice
    }
  }
}

/**
 * Main calculation function that routes to appropriate calculator
 */
export function calculatePrice(
  pricingModel: PricingModel,
  pricingData: PricingData,
  input: CalculationInput
): CalculationResult {
  const { quantity, baseCost, billingPeriod, parameters } = input

  switch (pricingModel) {
    case 'tiered':
      return calculateTieredPrice(quantity, pricingData as TieredPricing)
    
    case 'seat-based':
      return calculateSeatBasedPrice(quantity, pricingData as SeatBasedPricing)
    
    case 'flat-rate':
      return calculateFlatRatePrice(quantity, pricingData as FlatRatePricing)
    
    case 'cost-plus':
      return calculateCostPlusPrice(quantity, pricingData as CostPlusPricing, baseCost)
    
    case 'subscription':
      return calculateSubscriptionPrice(
        quantity, 
        pricingData as SubscriptionPricing, 
        billingPeriod
      )
    
    default:
      throw new Error(`Unsupported pricing model: ${pricingModel}`)
  }
}

/**
 * Validate pricing data structure for a given model
 */
export function validatePricingData(
  pricingModel: PricingModel,
  pricingData: any
): boolean {
  try {
    switch (pricingModel) {
      case 'tiered':
        const tiered = pricingData as TieredPricing
        return Array.isArray(tiered.tiers) && 
               tiered.tiers.length > 0 &&
               tiered.tiers.every(tier => 
                 typeof tier.min === 'number' && 
                 tier.min >= 0 &&
                 (tier.max === null || (typeof tier.max === 'number' && tier.max >= tier.min)) &&
                 typeof tier.pricePerUnit === 'number' && 
                 tier.pricePerUnit >= 0
               )

      case 'seat-based':
        const seatBased = pricingData as SeatBasedPricing
        return typeof seatBased.pricePerSeat === 'number' && 
               seatBased.pricePerSeat >= 0 &&
               (seatBased.minimumSeats === undefined || 
                (typeof seatBased.minimumSeats === 'number' && seatBased.minimumSeats >= 0)) &&
               (seatBased.volumeDiscounts === undefined || 
                (Array.isArray(seatBased.volumeDiscounts) && 
                 seatBased.volumeDiscounts.every(discount =>
                   typeof discount.minSeats === 'number' && 
                   discount.minSeats >= 0 &&
                   typeof discount.discountPercent === 'number' && 
                   discount.discountPercent >= 0 && 
                   discount.discountPercent <= 100
                 )))

      case 'flat-rate':
        const flatRate = pricingData as FlatRatePricing
        return typeof flatRate.price === 'number' && 
               flatRate.price >= 0 &&
               (flatRate.billingPeriod === undefined || 
                ['one-time', 'monthly', 'yearly'].includes(flatRate.billingPeriod))

      case 'cost-plus':
        const costPlus = pricingData as CostPlusPricing
        return typeof costPlus.baseCost === 'number' && 
               costPlus.baseCost >= 0 &&
               typeof costPlus.markupPercent === 'number' && 
               costPlus.markupPercent >= 0

      case 'subscription':
        const subscription = pricingData as SubscriptionPricing
        return typeof subscription.monthlyPrice === 'number' && 
               subscription.monthlyPrice >= 0 &&
               (subscription.yearlyPrice === undefined || 
                (typeof subscription.yearlyPrice === 'number' && subscription.yearlyPrice >= 0)) &&
               (subscription.setupFee === undefined || 
                (typeof subscription.setupFee === 'number' && subscription.setupFee >= 0)) &&
               (subscription.features === undefined || Array.isArray(subscription.features))

      default:
        return false
    }
  } catch (error) {
    return false
  }
}