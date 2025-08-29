import { api } from './api'
import type { RateCard, PricingModel, PricingData } from '../types'

export interface CreateRateCardRequest {
  name: string
  description?: string
  pricingModel: PricingModel
  data: PricingData
  isActive?: boolean
  folderId?: string
}

export interface UpdateRateCardRequest {
  name?: string
  description?: string
  pricingModel?: PricingModel
  data?: PricingData
  isActive?: boolean
  folderId?: string
}

export interface RateCardResponse {
  message: string
  rateCard: RateCard
}

export interface RateCardsResponse {
  rateCards: RateCard[]
}

export const rateCardService = {
  async create(data: CreateRateCardRequest): Promise<RateCardResponse> {
    const response = await api.post<RateCardResponse>('/rate-cards', data)
    return response.data
  },

  async getAll(folderId?: string): Promise<RateCardsResponse> {
    const params = folderId ? { folderId } : {}
    const response = await api.get<RateCardsResponse>('/rate-cards', { params })
    return response.data
  },

  async getById(id: string): Promise<{ rateCard: RateCard }> {
    const response = await api.get<{ rateCard: RateCard }>(`/rate-cards/${id}`)
    return response.data
  },

  async update(id: string, data: UpdateRateCardRequest): Promise<RateCardResponse> {
    const response = await api.put<RateCardResponse>(`/rate-cards/${id}`, data)
    return response.data
  },

  async delete(id: string): Promise<{ message: string }> {
    const response = await api.delete<{ message: string }>(`/rate-cards/${id}`)
    return response.data
  },

  async generateShareToken(id: string): Promise<RateCardResponse & { shareToken: string }> {
    const response = await api.post<RateCardResponse & { shareToken: string }>(`/rate-cards/${id}/share`)
    return response.data
  },

  async revokeShareToken(id: string): Promise<RateCardResponse> {
    const response = await api.delete<RateCardResponse>(`/rate-cards/${id}/share`)
    return response.data
  },

  async getByShareToken(shareToken: string): Promise<{ rateCard: RateCard }> {
    const response = await api.get<{ rateCard: RateCard }>(`/rate-cards/shared/${shareToken}`)
    return response.data
  },

  // Validation helpers for different pricing models
  validateTieredPricing(data: any): boolean {
    if (!data.tiers || !Array.isArray(data.tiers)) return false
    return data.tiers.every((tier: any) => 
      typeof tier.min === 'number' &&
      (tier.max === null || typeof tier.max === 'number') &&
      typeof tier.pricePerUnit === 'number' &&
      tier.min >= 0 &&
      tier.pricePerUnit >= 0 &&
      (tier.max === null || tier.max > tier.min)
    )
  },

  validateSeatBasedPricing(data: any): boolean {
    if (typeof data.pricePerSeat !== 'number' || data.pricePerSeat < 0) return false
    if (data.minimumSeats && (typeof data.minimumSeats !== 'number' || data.minimumSeats < 0)) return false
    if (data.volumeDiscounts && Array.isArray(data.volumeDiscounts)) {
      return data.volumeDiscounts.every((discount: any) =>
        typeof discount.minSeats === 'number' &&
        typeof discount.discountPercent === 'number' &&
        discount.minSeats >= 0 &&
        discount.discountPercent >= 0 &&
        discount.discountPercent <= 100
      )
    }
    return true
  },

  validateFlatRatePricing(data: any): boolean {
    if (typeof data.price !== 'number' || data.price < 0) return false
    if (data.billingPeriod && !['one-time', 'monthly', 'yearly'].includes(data.billingPeriod)) return false
    return true
  },

  validateCostPlusPricing(data: any): boolean {
    return typeof data.baseCost === 'number' &&
           typeof data.markupPercent === 'number' &&
           data.baseCost >= 0 &&
           data.markupPercent >= 0
  },

  validateSubscriptionPricing(data: any): boolean {
    if (typeof data.monthlyPrice !== 'number' || data.monthlyPrice < 0) return false
    if (data.yearlyPrice && (typeof data.yearlyPrice !== 'number' || data.yearlyPrice < 0)) return false
    if (data.setupFee && (typeof data.setupFee !== 'number' || data.setupFee < 0)) return false
    if (data.features && !Array.isArray(data.features)) return false
    return true
  },

  validatePricingData(pricingModel: PricingModel, data: PricingData): boolean {
    switch (pricingModel) {
      case 'tiered':
        return this.validateTieredPricing(data)
      case 'seat-based':
        return this.validateSeatBasedPricing(data)
      case 'flat-rate':
        return this.validateFlatRatePricing(data)
      case 'cost-plus':
        return this.validateCostPlusPricing(data)
      case 'subscription':
        return this.validateSubscriptionPricing(data)
      default:
        return false
    }
  }
}