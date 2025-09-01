import { api } from './api'
import type { AuthResponse, User } from '../types'

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterCredentials {
  email: string
  password: string
  name: string
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/login', credentials)
    const { token, user } = response.data
    
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
    
    return response.data
  },

  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/register', credentials)
    
    // Only store auth data if verification is not required
    if (!response.data.requiresVerification && response.data.token) {
      const { token, user } = response.data
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))
    }
    
    return response.data
  },

  async getProfile(): Promise<{ user: User }> {
    const response = await api.get<{ user: User }>('/auth/profile')
    return response.data
  },

  logout(): void {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  },

  getStoredUser(): User | null {
    const user = localStorage.getItem('user')
    return user ? JSON.parse(user) : null
  },

  getStoredToken(): string | null {
    return localStorage.getItem('token')
  },

  isAuthenticated(): boolean {
    return !!this.getStoredToken()
  },

  async verifyEmail(token: string): Promise<{ message: string; user: any }> {
    const response = await api.post('/email-verification/verify', { token })
    const { user } = response.data
    
    if (user) {
      // Store user data after successful verification
      localStorage.setItem('user', JSON.stringify(user))
    }
    
    return response.data
  },

  async resendVerificationEmail(email: string): Promise<{ message: string }> {
    const response = await api.post('/email-verification/resend', { email })
    return response.data
  },

  async checkVerificationStatus(email: string): Promise<{ verified: boolean; verifiedAt?: string }> {
    const response = await api.get(`/email-verification/status?email=${encodeURIComponent(email)}`)
    return response.data
  }
}