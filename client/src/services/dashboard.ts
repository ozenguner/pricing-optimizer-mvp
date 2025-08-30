import { api } from './api'

export interface DashboardStats {
  totalRateCards: number
  activeRateCards: number
  calculationsToday: number
  recentRateCards: Array<{
    id: string
    name: string
    pricingModel: string
    updatedAt: string
  }>
}

export const dashboardService = {
  async getStats(): Promise<DashboardStats> {
    const response = await api.get<DashboardStats>('/dashboard/stats')
    return response.data
  }
}