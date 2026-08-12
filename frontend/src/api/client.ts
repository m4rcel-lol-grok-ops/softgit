import axios, { type AxiosError, type AxiosInstance } from 'axios'
import type { ApiError } from '@/types'

const API_URL = import.meta.env.VITE_API_URL || '/api/v1'

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  withCredentials: true,
  timeout: 30000,
})

// Attach bearer token from localStorage
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('softgit_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (res) => res,
  (error: AxiosError<ApiError>) => {
    if (error.response?.status === 401) {
      // Clear stale session on unauthorized (except login/register)
      const url = error.config?.url || ''
      if (!url.includes('/auth/login') && !url.includes('/auth/register')) {
        localStorage.removeItem('softgit_token')
      }
    }
    return Promise.reject(error)
  }
)

export function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as ApiError | undefined
    if (data?.error?.message) return data.error.message
    if (err.response?.status === 429) return 'Too many requests. Please try again later.'
    if (err.response?.status === 403) return 'You do not have permission to perform this action.'
    if (err.response?.status === 404) return 'Resource not found.'
    if (err.message) return err.message
  }
  if (err instanceof Error) return err.message
  return 'An unexpected error occurred'
}

export default apiClient
