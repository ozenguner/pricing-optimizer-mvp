import { useState, useEffect, useCallback } from 'react'
import { rateCardService } from '../services/rateCards'
import type { RateCard, CreateRateCardRequest, UpdateRateCardRequest } from '../services/rateCards'

export const useRateCards = (folderId?: string, page: number = 1, limit: number = 20) => {
  const [rateCards, setRateCards] = useState<RateCard[]>([])
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    pageSize: 20,
    hasNext: false,
    hasPrev: false
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRateCards = useCallback(async () => {
    try {
      setLoading(true)
      const response = await rateCardService.getAll(folderId, page, limit)
      setRateCards(response.rateCards)
      if (response.pagination) {
        setPagination(response.pagination)
      }
      setError(null)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch rate cards')
    } finally {
      setLoading(false)
    }
  }, [folderId, page, limit])

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
    pagination,
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