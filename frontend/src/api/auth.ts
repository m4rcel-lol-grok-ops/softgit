import apiClient from './client'
import type { LoginResponse, User } from '@/types'

export async function register(username: string, email: string, password: string): Promise<User> {
  const { data } = await apiClient.post<User>('/auth/register', { username, email, password })
  return data
}

export async function login(login: string, password: string): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('/auth/login', { login, password })
  if (data.token) {
    localStorage.setItem('softgit_token', data.token)
  }
  return data
}

export async function logout(): Promise<void> {
  try {
    await apiClient.post('/auth/logout')
  } finally {
    localStorage.removeItem('softgit_token')
  }
}

export async function getMe(): Promise<User> {
  const { data } = await apiClient.get<User>('/auth/me')
  return data
}

export async function getCurrentUser(): Promise<User> {
  const { data } = await apiClient.get<User>('/user')
  return data
}

export async function updateCurrentUser(payload: {
  display_name?: string
  bio?: string
  website?: string
  location?: string
}): Promise<User> {
  const { data } = await apiClient.patch<User>('/user', payload)
  return data
}
