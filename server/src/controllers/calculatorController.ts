import { Request, Response } from 'express'
import { validationResult } from 'express-validator'
import { prisma } from '../index.js'
import { AuthRequest } from '../middleware/auth.js'
import { 
  calculatePrice, 
  validatePricingData,
  CalculationInput,
  CalculationResult
} from '../utils/pricingCalculators.js'
import type { PricingModel, PricingData } from '../../client/src/types/index.js'

export interface CalculateRequest {
  rateCardId: string
  quantity: number
  baseCost?: number
  billingPeriod?: 'monthly' | 'yearly'
  parameters?: Record<string, any>
}

export interface BulkCalculateRequest {
  calculations: Array<{
    rateCardId: string
    quantity: number
    baseCost?: number
    billingPeriod?: 'monthly' | 'yearly'
    parameters?: Record<string, any>
    label?: string
  }>
}

export const calculatePricing = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { rateCardId, quantity, baseCost, billingPeriod, parameters } = req.body as CalculateRequest
    const userId = req.user!.id

    // Fetch rate card and verify ownership
    const rateCard = await prisma.rateCard.findFirst({
      where: { 
        id: rateCardId, 
        userId,
        isActive: true 
      }
    })

    if (!rateCard) {
      return res.status(404).json({ error: 'Rate card not found or inactive' })
    }

    // Parse pricing data
    let pricingData: PricingData
    try {
      pricingData = JSON.parse(rateCard.data)
    } catch (error) {
      return res.status(400).json({ error: 'Invalid pricing data format' })
    }

    // Validate pricing data structure
    if (!validatePricingData(rateCard.pricingModel as PricingModel, pricingData)) {
      return res.status(400).json({ error: 'Invalid pricing data structure' })
    }

    // Prepare calculation input
    const calculationInput: CalculationInput = {
      quantity,
      baseCost,
      billingPeriod,
      parameters
    }

    // Calculate pricing
    const result = calculatePrice(
      rateCard.pricingModel as PricingModel,
      pricingData,
      calculationInput
    )

    res.json({
      success: true,
      rateCard: {
        id: rateCard.id,
        name: rateCard.name,
        pricingModel: rateCard.pricingModel
      },
      calculation: result,
      input: calculationInput
    })

  } catch (error) {
    console.error('Calculate pricing error:', error)
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message })
    }
    res.status(500).json({ error: 'Internal server error' })
  }
}

export const bulkCalculatePricing = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { calculations } = req.body as BulkCalculateRequest
    const userId = req.user!.id

    if (!Array.isArray(calculations) || calculations.length === 0) {
      return res.status(400).json({ error: 'Calculations array is required and cannot be empty' })
    }

    if (calculations.length > 50) {
      return res.status(400).json({ error: 'Maximum 50 calculations allowed per request' })
    }

    // Get all unique rate card IDs
    const rateCardIds = [...new Set(calculations.map(calc => calc.rateCardId))]

    // Fetch all required rate cards
    const rateCards = await prisma.rateCard.findMany({
      where: {
        id: { in: rateCardIds },
        userId,
        isActive: true
      }
    })

    // Create rate card lookup map
    const rateCardMap = new Map(
      rateCards.map(card => [card.id, card])
    )

    const results: Array<{
      success: boolean
      rateCardId: string
      label?: string
      calculation?: CalculationResult
      error?: string
      input: any
    }> = []

    // Process each calculation
    for (const calc of calculations) {
      const { rateCardId, quantity, baseCost, billingPeriod, parameters, label } = calc

      const rateCard = rateCardMap.get(rateCardId)
      
      if (!rateCard) {
        results.push({
          success: false,
          rateCardId,
          label,
          error: 'Rate card not found or inactive',
          input: calc
        })
        continue
      }

      try {
        // Parse pricing data
        const pricingData: PricingData = JSON.parse(rateCard.data)

        // Validate pricing data structure
        if (!validatePricingData(rateCard.pricingModel as PricingModel, pricingData)) {
          results.push({
            success: false,
            rateCardId,
            label,
            error: 'Invalid pricing data structure',
            input: calc
          })
          continue
        }

        // Prepare calculation input
        const calculationInput: CalculationInput = {
          quantity,
          baseCost,
          billingPeriod,
          parameters
        }

        // Calculate pricing
        const result = calculatePrice(
          rateCard.pricingModel as PricingModel,
          pricingData,
          calculationInput
        )

        results.push({
          success: true,
          rateCardId,
          label,
          calculation: result,
          input: calculationInput
        })

      } catch (error) {
        results.push({
          success: false,
          rateCardId,
          label,
          error: error instanceof Error ? error.message : 'Calculation failed',
          input: calc
        })
      }
    }

    // Calculate summary statistics
    const successful = results.filter(r => r.success)
    const failed = results.filter(r => !r.success)
    const totalAmount = successful.reduce((sum, r) => sum + (r.calculation?.totalPrice || 0), 0)

    res.json({
      success: true,
      summary: {
        total: results.length,
        successful: successful.length,
        failed: failed.length,
        totalAmount: Math.round(totalAmount * 100) / 100
      },
      results
    })

  } catch (error) {
    console.error('Bulk calculate pricing error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export const calculatePublicPricing = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { shareToken } = req.params
    const { quantity, baseCost, billingPeriod, parameters } = req.body

    // Fetch rate card by share token
    const rateCard = await prisma.rateCard.findFirst({
      where: { 
        shareToken,
        isActive: true 
      },
      select: {
        id: true,
        name: true,
        pricingModel: true,
        data: true,
        user: {
          select: { id: true, name: true }
        }
      }
    })

    if (!rateCard) {
      return res.status(404).json({ error: 'Rate card not found or inactive' })
    }

    // Parse pricing data
    let pricingData: PricingData
    try {
      pricingData = JSON.parse(rateCard.data)
    } catch (error) {
      return res.status(400).json({ error: 'Invalid pricing data format' })
    }

    // Validate pricing data structure
    if (!validatePricingData(rateCard.pricingModel as PricingModel, pricingData)) {
      return res.status(400).json({ error: 'Invalid pricing data structure' })
    }

    // Prepare calculation input
    const calculationInput: CalculationInput = {
      quantity,
      baseCost,
      billingPeriod,
      parameters
    }

    // Calculate pricing
    const result = calculatePrice(
      rateCard.pricingModel as PricingModel,
      pricingData,
      calculationInput
    )

    res.json({
      success: true,
      rateCard: {
        id: rateCard.id,
        name: rateCard.name,
        pricingModel: rateCard.pricingModel,
        owner: rateCard.user.name
      },
      calculation: result,
      input: calculationInput
    })

  } catch (error) {
    console.error('Calculate public pricing error:', error)
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message })
    }
    res.status(500).json({ error: 'Internal server error' })
  }
}

export const validatePricingModel = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { pricingModel, data } = req.body

    const isValid = validatePricingData(pricingModel, data)

    res.json({
      success: true,
      valid: isValid,
      pricingModel,
      message: isValid ? 'Pricing data is valid' : 'Pricing data validation failed'
    })

  } catch (error) {
    console.error('Validate pricing model error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}