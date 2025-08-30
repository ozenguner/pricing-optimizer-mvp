import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { rateCardService } from '../services/rateCards'
import { formatCurrency, formatNumber } from '../utils/formatting'
import { extractErrorMessage, ErrorMessages } from '../utils/errorHandling'
import type { RateCard, PricingModel, TieredPricing, SeatBasedPricing, FlatRatePricing, CostPlusPricing, SubscriptionPricing } from '../types'

interface CalculationInput {
  rateCardId: string
  quantity: number
  parameters?: Record<string, any>
}

interface CalculationResult {
  rateCard: RateCard
  quantity: number
  totalPrice: number
  breakdown: any
  parameters?: Record<string, any>
}

export function Calculator() {
  const [rateCards, setRateCards] = useState<RateCard[]>([])
  const [selectedRateCard, setSelectedRateCard] = useState<RateCard | null>(null)
  const [quantity, setQuantity] = useState<number>(1)
  const [customParameters, setCustomParameters] = useState<Record<string, any>>({})
  const [savedCalculationResult, setSavedCalculationResult] = useState<CalculationResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [calculationHistory, setCalculationHistory] = useState<CalculationResult[]>([])

  useEffect(() => {
    const loadRateCards = async () => {
      try {
        const response = await rateCardService.getAll()
        setRateCards(response.rateCards.filter(rc => rc.isActive))
      } catch (error) {
        setError(extractErrorMessage(error) || ErrorMessages.GENERIC_ERROR)
      } finally {
        setLoading(false)
      }
    }

    loadRateCards()
  }, [])

  const calculatePrice = (rateCard: RateCard, quantity: number) => {
    try {
      switch (rateCard.pricingModel) {
        case 'tiered':
          return calculateTieredPricing(rateCard.data as TieredPricing, quantity)
        case 'seat-based':
          return calculateSeatBasedPrice(rateCard.data as SeatBasedPricing, quantity)
        case 'flat-rate':
          return calculateFlatRatePrice(rateCard.data as FlatRatePricing)
        case 'cost-plus':
          return calculateCostPlusPrice(rateCard.data as CostPlusPricing, customParameters.baseCost || 0)
        case 'subscription':
          return calculateSubscriptionPrice(rateCard.data as SubscriptionPricing, customParameters.billingPeriod || 'monthly')
        default:
          return { totalPrice: 0, breakdown: {} }
      }
    } catch (err) {
      return { totalPrice: 0, breakdown: { error: 'Invalid pricing data' } }
    }
  }

  /**
   * Calculates pricing using tiered model where different quantities have different prices
   * 
   * Business Logic:
   * - Tiers define quantity ranges (min-max) with specific pricing per unit
   * - Customer pays different rates for units falling into different tiers
   * - Example: 1-100 units = $10/unit, 101-500 units = $8/unit, 501+ = $6/unit
   * - Total calculation distributes quantity across applicable tiers
   * 
   * @param tieredPricingData - Configuration with tier definitions and pricing rules
   * @param requestedQuantity - Total quantity to calculate pricing for
   * @returns Price breakdown showing cost per tier and total amount
   */
  const calculateTieredPricing = (tieredPricingData: TieredPricing, requestedQuantity: number) => {
    // Validate tier configuration exists
    if (!tieredPricingData.tiers || tieredPricingData.tiers.length === 0) {
      return { totalPrice: 0, breakdown: { error: 'No pricing tiers configured' } }
    }
    
    let totalCalculatedPrice = 0
    let remainingQuantityToProcess = requestedQuantity
    const tierPricingBreakdown: Array<{ 
      tierNumber: number; 
      quantityInTier: number; 
      pricePerUnitInTier: number; 
      tierSubtotal: number 
    }> = []

    // Sort tiers by minimum quantity to ensure correct tier processing order
    const tiersOrderedByMinQuantity = [...tieredPricingData.tiers].sort((tierA, tierB) => tierA.min - tierB.min)

    // Process each tier to distribute quantity and calculate pricing
    for (let tierIndex = 0; tierIndex < tiersOrderedByMinQuantity.length; tierIndex++) {
      const currentTier = tiersOrderedByMinQuantity[tierIndex]
      
      // Exit early if no more quantity to process
      if (remainingQuantityToProcess <= 0) break

      const tierMinimumQuantity = currentTier.min
      const tierMaximumQuantity = currentTier.max || Infinity
      
      // Calculate how many units fall into this tier
      const unitsInCurrentTier = Math.min(
        remainingQuantityToProcess, 
        Math.max(0, tierMaximumQuantity - Math.max(tierMinimumQuantity, requestedQuantity - remainingQuantityToProcess) + 1)
      )

      // Only process tier if it has applicable units and meets minimum quantity threshold
      if (unitsInCurrentTier > 0 && requestedQuantity > tierMinimumQuantity) {
        const tierSubtotalAmount = unitsInCurrentTier * currentTier.pricePerUnit
        totalCalculatedPrice += tierSubtotalAmount
        
        tierPricingBreakdown.push({
          tierNumber: tierIndex + 1,
          quantityInTier: unitsInCurrentTier,
          pricePerUnitInTier: currentTier.pricePerUnit,
          tierSubtotal: tierSubtotalAmount
        })
        
        // Reduce remaining quantity by amount processed in this tier
        remainingQuantityToProcess -= unitsInCurrentTier
      }
    }

    return {
      totalPrice: totalCalculatedPrice,
      breakdown: {
        model: 'tiered',
        totalQuantity: requestedQuantity,
        tiers: tierPricingBreakdown,
        effectiveAveragePrice: totalCalculatedPrice / requestedQuantity
      }
    }
  }

  const calculateSeatBasedPrice = (data: SeatBasedPricing, seats: number) => {
    const basePrice = seats * data.pricePerSeat
    let discount = 0
    let appliedDiscount = null

    if (data.volumeDiscounts) {
      const applicableDiscount = data.volumeDiscounts
        .filter(d => seats >= d.minSeats)
        .sort((a, b) => b.discountPercent - a.discountPercent)[0]
      
      if (applicableDiscount) {
        discount = basePrice * (applicableDiscount.discountPercent / 100)
        appliedDiscount = applicableDiscount
      }
    }

    const totalPrice = basePrice - discount

    return {
      totalPrice,
      breakdown: {
        model: 'seat-based',
        seats,
        pricePerSeat: data.pricePerSeat,
        basePrice,
        discount,
        appliedDiscount,
        minimumSeats: data.minimumSeats
      }
    }
  }

  const calculateFlatRatePrice = (data: FlatRatePricing) => {
    return {
      totalPrice: data.price,
      breakdown: {
        model: 'flat-rate',
        price: data.price,
        billingPeriod: data.billingPeriod
      }
    }
  }

  const calculateCostPlusPrice = (data: CostPlusPricing, baseCost: number = 0) => {
    const actualBaseCost = baseCost || data.baseCost
    const markup = actualBaseCost * (data.markupPercent / 100)
    const totalPrice = actualBaseCost + markup

    return {
      totalPrice,
      breakdown: {
        model: 'cost-plus',
        baseCost: actualBaseCost,
        markupPercent: data.markupPercent,
        markup,
        totalPrice
      }
    }
  }

  const calculateSubscriptionPrice = (data: SubscriptionPricing, billingPeriod: string = 'monthly') => {
    let price = data.monthlyPrice
    if (billingPeriod === 'yearly' && data.yearlyPrice) {
      price = data.yearlyPrice
    }

    const setupFee = data.setupFee || 0
    const totalPrice = price + setupFee

    return {
      totalPrice,
      breakdown: {
        model: 'subscription',
        billingPeriod,
        price,
        setupFee,
        totalPrice,
        features: data.features
      }
    }
  }

  /**
   * Memoized calculation result to prevent expensive recalculations
   * Only recalculates when rate card, quantity, or parameters change
   */
  const calculationResult = useMemo(() => {
    if (!selectedRateCard || quantity <= 0) return null

    try {
      const result = calculatePrice(selectedRateCard, quantity)
      return {
        rateCard: selectedRateCard,
        quantity,
        totalPrice: result.totalPrice,
        breakdown: result.breakdown,
        parameters: customParameters
      }
    } catch (err) {
      return null
    }
  }, [selectedRateCard, quantity, customParameters])

  const handleCalculate = useCallback(() => {
    if (!calculationResult) return

    setCalculating(true)
    setError(null)

    try {
      setSavedCalculationResult(calculationResult)
      setCalculationHistory(prev => [calculationResult, ...prev.slice(0, 9)]) // Keep last 10 calculations
    } catch (err) {
      setError('Calculation failed. Please check your inputs.')
    } finally {
      setCalculating(false)
    }
  }, [calculationResult])

  const handleRateCardChange = (rateCardId: string) => {
    const rateCard = rateCards.find(rc => rc.id === rateCardId)
    setSelectedRateCard(rateCard || null)
    setCalculationResult(null)
    setCustomParameters({})
    setQuantity(1)
  }

  const getQuantityLabel = () => {
    if (!selectedRateCard) return 'Quantity'
    switch (selectedRateCard.pricingModel) {
      case 'seat-based':
        return 'Number of Seats'
      case 'tiered':
        return 'Quantity'
      case 'flat-rate':
      case 'subscription':
        return 'Units (for display only)'
      case 'cost-plus':
        return 'Units'
      default:
        return 'Quantity'
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const exportResult = () => {
    if (!calculationResult) return

    const data = {
      rateCard: calculationResult.rateCard.name,
      pricingModel: calculationResult.rateCard.pricingModel,
      quantity: calculationResult.quantity,
      totalPrice: calculationResult.totalPrice,
      breakdown: calculationResult.breakdown,
      timestamp: new Date().toISOString()
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pricing-calculation-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pricing Calculator</h1>
        <p className="mt-2 text-gray-600">
          Calculate pricing based on your rate cards and quantities
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Panel */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-medium text-gray-900">Calculate Pricing</h2>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              <div>
                <label className="form-label">Rate Card</label>
                <select 
                  className="form-input"
                  value={selectedRateCard?.id || ''}
                  onChange={(e) => handleRateCardChange(e.target.value)}
                >
                  <option value="">Select a rate card...</option>
                  {rateCards.map(rateCard => (
                    <option key={rateCard.id} value={rateCard.id}>
                      {rateCard.name} ({rateCard.pricingModel})
                    </option>
                  ))}
                </select>
              </div>

              {selectedRateCard && (
                <>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <h3 className="font-medium text-gray-900">{selectedRateCard.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {selectedRateCard.description || 'No description'}
                    </p>
                    <span className="inline-block mt-2 px-2 py-1 text-xs font-medium rounded-full bg-primary-100 text-primary-800">
                      {selectedRateCard.pricingModel.replace('-', ' ')}
                    </span>
                  </div>

                  {selectedRateCard.pricingModel !== 'flat-rate' && (
                    <div>
                      <label className="form-label">{getQuantityLabel()}</label>
                      <input
                        type="number"
                        value={quantity}
                        onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        className="form-input"
                        min="1"
                      />
                    </div>
                  )}

                  {/* Custom parameters for specific models */}
                  {selectedRateCard.pricingModel === 'cost-plus' && (
                    <div>
                      <label className="form-label">Custom Base Cost (optional)</label>
                      <input
                        type="number"
                        value={customParameters.baseCost || ''}
                        onChange={(e) => setCustomParameters({
                          ...customParameters,
                          baseCost: parseFloat(e.target.value) || 0
                        })}
                        className="form-input"
                        step="0.01"
                        min="0"
                        placeholder="Use rate card default"
                      />
                    </div>
                  )}

                  {selectedRateCard.pricingModel === 'subscription' && (
                    <div>
                      <label className="form-label">Billing Period</label>
                      <select
                        value={customParameters.billingPeriod || 'monthly'}
                        onChange={(e) => setCustomParameters({
                          ...customParameters,
                          billingPeriod: e.target.value
                        })}
                        className="form-input"
                      >
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                    </div>
                  )}

                  <button 
                    className="btn-primary w-full"
                    onClick={handleCalculate}
                    disabled={calculating}
                  >
                    {calculating ? 'Calculating...' : 'Calculate Pricing'}
                  </button>
                </>
              )}

              {!selectedRateCard && (
                <div className="text-center py-8 text-gray-500">
                  <span className="text-4xl">📋</span>
                  <p className="mt-2">Select a rate card to start calculating</p>
                  {rateCards.length === 0 && (
                    <p className="text-sm mt-1">No active rate cards found</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Results Panel */}
        <div className="card">
          <div className="card-header">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">Results</h2>
              {calculationResult && (
                <button
                  onClick={exportResult}
                  className="text-sm text-primary-600 hover:text-primary-800"
                >
                  Export
                </button>
              )}
            </div>
          </div>
          <div className="card-body">
            {calculationResult ? (
              <div className="space-y-4">
                <div className="text-center p-6 bg-primary-50 border border-primary-200 rounded-lg">
                  <div className="text-3xl font-bold text-primary-900">
                    {formatCurrency(calculationResult.totalPrice)}
                  </div>
                  <div className="text-sm text-primary-600 mt-1">
                    {calculationResult.rateCard.pricingModel !== 'flat-rate' && 
                     calculationResult.rateCard.pricingModel !== 'subscription' && (
                      <>for {calculationResult.quantity} units</>
                    )}
                  </div>
                </div>

                {/* Breakdown */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Calculation Breakdown</h3>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    {calculationResult.breakdown.model === 'tiered' && (
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Total Quantity:</span>
                          <span>{calculationResult.breakdown.totalQuantity}</span>
                        </div>
                        {calculationResult.breakdown.tiers?.map((tier: any, index: number) => (
                          <div key={index} className="flex justify-between">
                            <span>Tier {tier.tier} ({tier.quantity} × {formatCurrency(tier.pricePerUnit)}):</span>
                            <span>{formatCurrency(tier.subtotal)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {calculationResult.breakdown.model === 'seat-based' && (
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Seats:</span>
                          <span>{calculationResult.breakdown.seats}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Price per Seat:</span>
                          <span>{formatCurrency(calculationResult.breakdown.pricePerSeat)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Base Price:</span>
                          <span>{formatCurrency(calculationResult.breakdown.basePrice)}</span>
                        </div>
                        {calculationResult.breakdown.discount > 0 && (
                          <>
                            <div className="flex justify-between text-green-600">
                              <span>Volume Discount ({calculationResult.breakdown.appliedDiscount.discountPercent}%):</span>
                              <span>-{formatCurrency(calculationResult.breakdown.discount)}</span>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {calculationResult.breakdown.model === 'cost-plus' && (
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Base Cost:</span>
                          <span>{formatCurrency(calculationResult.breakdown.baseCost)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Markup ({calculationResult.breakdown.markupPercent}%):</span>
                          <span>{formatCurrency(calculationResult.breakdown.markup)}</span>
                        </div>
                      </div>
                    )}

                    {calculationResult.breakdown.model === 'subscription' && (
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Billing Period:</span>
                          <span className="capitalize">{calculationResult.breakdown.billingPeriod}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Base Price:</span>
                          <span>{formatCurrency(calculationResult.breakdown.price)}</span>
                        </div>
                        {calculationResult.breakdown.setupFee > 0 && (
                          <div className="flex justify-between">
                            <span>Setup Fee:</span>
                            <span>{formatCurrency(calculationResult.breakdown.setupFee)}</span>
                          </div>
                        )}
                        {calculationResult.breakdown.features && calculationResult.breakdown.features.length > 0 && (
                          <div className="mt-3">
                            <span className="font-medium">Features:</span>
                            <ul className="mt-1 ml-4 space-y-1">
                              {calculationResult.breakdown.features.map((feature: string, index: number) => (
                                <li key={index} className="text-xs">• {feature}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {calculationResult.breakdown.model === 'flat-rate' && (
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Price:</span>
                          <span>{formatCurrency(calculationResult.breakdown.price)}</span>
                        </div>
                        {calculationResult.breakdown.billingPeriod && (
                          <div className="flex justify-between">
                            <span>Billing Period:</span>
                            <span className="capitalize">{calculationResult.breakdown.billingPeriod}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <span className="text-6xl">🧮</span>
                <p className="mt-4">Calculation results will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Calculation History */}
      {calculationHistory.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-medium text-gray-900">Recent Calculations</h2>
          </div>
          <div className="card-body">
            <div className="space-y-3">
              {calculationHistory.slice(0, 5).map((calc, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="font-medium text-gray-900">{calc.rateCard.name}</h3>
                    <p className="text-sm text-gray-600">
                      {calc.rateCard.pricingModel !== 'flat-rate' && calc.rateCard.pricingModel !== 'subscription' && (
                        `${calc.quantity} units • `
                      )}
                      {calc.rateCard.pricingModel.replace('-', ' ')}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">
                      {formatCurrency(calc.totalPrice)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Calculator