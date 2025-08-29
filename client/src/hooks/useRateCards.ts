import { useState, useEffect, useCallback } from 'react'
import { rateCardService } from '../services/rateCards'
import type { RateCard, CreateRateCardRequest, UpdateRateCardRequest } from '../services/rateCards'

export const useRateCards = (folderId?: string) => {
  const [rateCards, setRateCards] = useState<RateCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRateCards = useCallback(async () => {
    try {
      setLoading(true)
      const response = await rateCardService.getAll(folderId)
      setRateCards(response.rateCards)
      setError(null)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch rate cards')
    } finally {
      setLoading(false)
    }
  }, [folderId])

  const createRateCard = useCallback(async (data: CreateRateCardRequest) => {
    try {
      const response = await rateCardService.create(data)
      await fetchRateCards() // Refresh the list
      return response.rateCard
    } catch (err: any) {
      throw new Error(err.response?.data?.error || 'Failed to create rate card')
    }
  }, [fetchRateCards])

  const updateRateCard = useCallback(async (id: string, data: UpdateRateCardRequest) => {
    try {
      const response = await rateCardService.update(id, data)
      await fetchRateCards() // Refresh the list
      return response.rateCard
    } catch (err: any) {
      throw new Error(err.response?.data?.error || 'Failed to update rate card')
    }
  }, [fetchRateCards])

  const deleteRateCard = useCallback(async (id: string) => {
    try {
      await rateCardService.delete(id)
      await fetchRateCards() // Refresh the list
    } catch (err: any) {
      throw new Error(err.response?.data?.error || 'Failed to delete rate card')
    }
  }, [fetchRateCards])

  const generateShareToken = useCallback(async (id: string) => {
    try {
      const response = await rateCardService.generateShareToken(id)
      await fetchRateCards() // Refresh to get updated share token
      return response.shareToken
    } catch (err: any) {
      throw new Error(err.response?.data?.error || 'Failed to generate share token')
    }
  }, [fetchRateCards])

  const revokeShareToken = useCallback(async (id: string) => {
    try {
      await rateCardService.revokeShareToken(id)
      await fetchRateCards() // Refresh to clear share token
    } catch (err: any) {
      throw new Error(err.response?.data?.error || 'Failed to revoke share token')
    }
  }, [fetchRateCards])

  useEffect(() => {
    fetchRateCards()
  }, [fetchRateCards])

  return {
    rateCards,
    loading,
    error,
    fetchRateCards,
    createRateCard,
    updateRateCard,
    deleteRateCard,
    generateShareToken,
    revokeShareToken
  }
}