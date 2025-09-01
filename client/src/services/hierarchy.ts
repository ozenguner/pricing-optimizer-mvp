import { api } from './api'
import type { Account, ProductSuite, SKU } from '../types'

interface ApiResponse<T> {
  [key: string]: T | any
}

interface PaginatedResponse<T> {
  [key: string]: T[] | any
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export const hierarchyService = {
  // Account methods
  async getAccounts(params?: { page?: number; limit?: number; search?: string }): Promise<PaginatedResponse<Account>> {
    const response = await api.get('/hierarchy/accounts', { params })
    return response.data
  },

  async getAccount(id: string): Promise<ApiResponse<Account>> {
    const response = await api.get(`/hierarchy/accounts/${id}`)
    return response.data
  },

  async createAccount(data: { name: string }): Promise<ApiResponse<Account>> {
    const response = await api.post('/hierarchy/accounts', data)
    return response.data
  },

  // Product Suite methods
  async getProductSuites(params?: { accountId?: string; page?: number; limit?: number; search?: string }): Promise<PaginatedResponse<ProductSuite>> {
    const response = await api.get('/hierarchy/product-suites', { params })
    return response.data
  },

  async getProductSuite(id: string): Promise<ApiResponse<ProductSuite>> {
    const response = await api.get(`/hierarchy/product-suites/${id}`)
    return response.data
  },

  async createProductSuite(data: { name: string; accountId: string }): Promise<ApiResponse<ProductSuite>> {
    const response = await api.post('/hierarchy/product-suites', data)
    return response.data
  },

  // SKU methods
  async getSKUs(params?: { productSuiteId?: string; page?: number; limit?: number; search?: string }): Promise<PaginatedResponse<SKU>> {
    const response = await api.get('/hierarchy/skus', { params })
    return response.data
  },

  async getSKU(id: string): Promise<ApiResponse<SKU>> {
    const response = await api.get(`/hierarchy/skus/${id}`)
    return response.data
  },

  async createSKU(data: { code: string; name: string; productSuiteId: string }): Promise<ApiResponse<SKU>> {
    const response = await api.post('/hierarchy/skus', data)
    return response.data
  }
}