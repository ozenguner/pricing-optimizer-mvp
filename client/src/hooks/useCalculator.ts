import { useState, useEffect, useCallback } from 'react'
import { rateCardService } from '../services/rateCards'
import { extractErrorMessage, ErrorMessages, handleAsyncError } from '../utils/errorHandling'
import type { 
  RateCard, 
  CalculationResult, 
  CalculationHistoryEntry, 
  CalculatorState,
  TieredPricing,
  SeatBasedPricing,
  FlatRatePricing,
  CostPlusPricing,
  SubscriptionPricing
} from '../types/calculator'

/**
 * Custom hook for managing calculator state and operations
 * 
 * Business Logic:
 * - Manages rate card loading and selection
 * - Handles price calculations for different pricing models
 * - Maintains calculation history
 * - Provides consistent error handling and loading states
 * - Separates calculation logic from UI components
 * 
 * @returns Calculator state and operations
 */
export function useCalculator() {
  // State management
  const [calculatorState, setCalculatorState] = useState<CalculatorState>({
    rateCards: [],
    selectedRateCard: null,
    quantity: 1,
    customParameters: {},
    calculationResult: null,
    calculationHistory: [],
    loading: {
      rateCards: true,
      calculating: false
    },
    error: {
      rateCards: null,
      calculation: null
    }
  })

  /**
   * Loads available rate cards from the API
   * Filters to only include active rate cards
   */
  const loadRateCards = useCallback(async () => {
    setCalculatorState(prev => ({
      ...prev,
      loading: { ...prev.loading, rateCards: true },
      error: { ...prev.error, rateCards: null }
    }))

    try {
      const result = await handleAsyncError(
        () => rateCardService.getAll(),
        'useCalculator.loadRateCards'
      )

      const activeRateCards = result.rateCards.filter(rateCard => rateCard.isActive)

      setCalculatorState(prev => ({
        ...prev,
        rateCards: activeRateCards,
        loading: { ...prev.loading, rateCards: false }
      }))
    } catch (error) {
      setCalculatorState(prev => ({
        ...prev,
        loading: { ...prev.loading, rateCards: false },
        error: { ...prev.error, rateCards: extractErrorMessage(error) }
      }))
    }
  }, [])

  /**
   * Calculates price using tiered pricing model
   * 
   * @param tieredPricingData - Tiered pricing configuration
   * @param requestedQuantity - Quantity to calculate for
   * @returns Calculation result with breakdown
   */
  const calculateTieredPricing = useCallback((
    tieredPricingData: TieredPricing, 
    requestedQuantity: number
  ) => {
    if (!tieredPricingData.tiers || tieredPricingData.tiers.length === 0) {
      throw new Error('No pricing tiers configured')
    }
    
    let totalCalculatedPrice = 0
    let remainingQuantityToProcess = requestedQuantity
    const tierCalculations: any[] = []

    // Sort tiers by minimum quantity
    const sortedTiers = [...tieredPricingData.tiers].sort((a, b) => a.min - b.min)

    // Process each tier
    for (let i = 0; i < sortedTiers.length; i++) {
      const tier = sortedTiers[i]
      if (remainingQuantityToProcess <= 0) break

      const tierMin = tier.min
      const tierMax = tier.max || Infinity
      const unitsInTier = Math.min(
        remainingQuantityToProcess,
        Math.max(0, tierMax - Math.max(tierMin, requestedQuantity - remainingQuantityToProcess) + 1)
      )

      if (unitsInTier > 0 && requestedQuantity > tierMin) {
        const tierSubtotal = unitsInTier * tier.pricePerUnit
        totalCalculatedPrice += tierSubtotal
        
        tierCalculations.push({
          tierNumber: i + 1,
          quantityInTier: unitsInTier,
          pricePerUnitInTier: tier.pricePerUnit,
          tierSubtotal,
          tierRange: tierMax === Infinity ? `${tierMin}+` : `${tierMin}-${tierMax}`
        })
        
        remainingQuantityToProcess -= unitsInTier
      }
    }

    return {
      totalPrice: totalCalculatedPrice,
      breakdown: {
        model: 'tiered' as const,
        totalQuantity: requestedQuantity,
        details: {
          tiers: tierCalculations,
          basePricePerUnit: tieredPricingData.basePrice
        },
        effectiveAveragePrice: totalCalculatedPrice / requestedQuantity
      }
    }
  }, [])

  /**
   * Calculates price using seat-based pricing model
   * 
   * @param seatPricingData - Seat-based pricing configuration
   * @param numberOfSeats - Number of seats to calculate for
   * @returns Calculation result with breakdown
   */
  const calculateSeatBasedPricing = useCallback((
    seatPricingData: SeatBasedPricing,
    numberOfSeats: number
  ) => {
    const basePrice = numberOfSeats * seatPricingData.pricePerSeat
    let volumeDiscount = 0

    // Apply volume discount if configured
    if (seatPricingData.volumeDiscounts && seatPricingData.volumeDiscounts.length > 0) {
      const applicableDiscount = seatPricingData.volumeDiscounts
        .filter(discount => numberOfSeats >= discount.minSeats)
        .sort((a, b) => b.minSeats - a.minSeats)[0]

      if (applicableDiscount) {
        volumeDiscount = basePrice * (applicableDiscount.discountPercentage / 100)
      }
    }

    const finalPrice = basePrice - volumeDiscount

    return {
      totalPrice: finalPrice,
      breakdown: {
        model: 'seat-based' as const,
        totalQuantity: numberOfSeats,
        details: {
          seats: numberOfSeats,
          pricePerSeat: seatPricingData.pricePerSeat,
          basePrice,
          volumeDiscount,
          finalPrice
        }
      }
    }
  }, [])

  /**
   * Calculates price for the selected rate card and quantity
   */
  const calculatePrice = useCallback(async () => {
    if (!calculatorState.selectedRateCard) {
      throw new Error('No rate card selected')
    }

    setCalculatorState(prev => ({
      ...prev,
      loading: { ...prev.loading, calculating: true },
      error: { ...prev.error, calculation: null }
    }))

    try {
      const rateCard = calculatorState.selectedRateCard
      let calculationResult

      // Calculate based on pricing model
      switch (rateCard.pricingModel) {
        case 'tiered':
          calculationResult = calculateTieredPricing(
            rateCard.data as TieredPricing,
            calculatorState.quantity
          )
          break
        
        case 'seat-based':
          calculationResult = calculateSeatBasedPricing(
            rateCard.data as SeatBasedPricing,
            calculatorState.quantity
          )
          break
        
        case 'flat-rate':
          const flatRateData = rateCard.data as FlatRatePricing
          calculationResult = {
            totalPrice: flatRateData.price,
            breakdown: {
              model: 'flat-rate' as const,
              totalQuantity: 1,
              details: {
                flatRate: flatRateData.price,
                rateDescription: flatRateData.description
              }
            }
          }
          break
        
        default:
          throw new Error(`Unsupported pricing model: ${rateCard.pricingModel}`)
      }

      // Create full calculation result
      const fullResult: CalculationResult = {
        rateCard,
        quantity: calculatorState.quantity,
        totalPrice: calculationResult.totalPrice,
        breakdown: calculationResult.breakdown,
        parameters: calculatorState.customParameters,
        calculatedAt: new Date()
      }

      setCalculatorState(prev => ({
        ...prev,
        calculationResult: fullResult,
        loading: { ...prev.loading, calculating: false }
      }))

      return fullResult
    } catch (error) {
      const errorMessage = extractErrorMessage(error)
      setCalculatorState(prev => ({
        ...prev,
        loading: { ...prev.loading, calculating: false },
        error: { ...prev.error, calculation: errorMessage }
      }))
      throw error
    }
  }, [calculatorState.selectedRateCard, calculatorState.quantity, calculatorState.customParameters, calculateTieredPricing, calculateSeatBasedPricing])

  /**
   * Updates selected rate card
   */
  const selectRateCard = useCallback((rateCard: RateCard | null) => {
    setCalculatorState(prev => ({
      ...prev,
      selectedRateCard: rateCard,
      calculationResult: null,
      error: { ...prev.error, calculation: null }
    }))
  }, [])

  /**
   * Updates quantity for calculation
   */
  const setQuantity = useCallback((quantity: number) => {
    setCalculatorState(prev => ({
      ...prev,
      quantity: Math.max(1, quantity),
      calculationResult: null,
      error: { ...prev.error, calculation: null }
    }))
  }, [])

  /**
   * Updates custom parameters
   */
  const setCustomParameters = useCallback((parameters: Record<string, any>) => {
    setCalculatorState(prev => ({
      ...prev,
      customParameters: parameters,
      calculationResult: null,
      error: { ...prev.error, calculation: null }
    }))
  }, [])

  /**
   * Adds calculation to history
   */
  const addToHistory = useCallback((calculation: CalculationResult, notes?: string) => {
    const historyEntry: CalculationHistoryEntry = {
      id: Date.now().toString(),
      result: calculation,
      notes,
      isBookmarked: false
    }

    setCalculatorState(prev => ({
      ...prev,
      calculationHistory: [historyEntry, ...prev.calculationHistory].slice(0, 50) // Keep last 50
    }))
  }, [])

  /**
   * Clears calculation error
   */
  const clearCalculationError = useCallback(() => {
    setCalculatorState(prev => ({
      ...prev,
      error: { ...prev.error, calculation: null }
    }))
  }, [])

  // Load rate cards on mount
  useEffect(() => {
    loadRateCards()
  }, [loadRateCards])

  return {
    // State
    ...calculatorState,
    
    // Actions
    selectRateCard,
    setQuantity,
    setCustomParameters,
    calculatePrice,
    addToHistory,
    loadRateCards,
    clearCalculationError
  }
}