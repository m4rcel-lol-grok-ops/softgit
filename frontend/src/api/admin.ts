import apiClient from './client'
import type { User, Repository } from '@/types'

export async function getAdminStats() {
  const { data } = await apiClient.get('/admin/stats')
  return data as {
    users: number
    repositories: number
    public_repos: number
    private_repos: number
    registration: boolean
    server_time: string
  }
}

export async function listAdminUsers(): Promise<User[]> {
  const { data } = await apiClient.get<User[]>('/admin/users')
  return data
}

export async function updateAdminUser(
  id: string,
  payload: { is_active?: boolean; is_admin?: boolean }
): Promise<User> {
  const { data } = await apiClient.patch<User>(`/admin/users/${id}`, payload)
  return data
}

export async function listAdminRepos(): Promise<Repository[]> {
  const { data } = await apiClient.get<Repository[]>('/admin/repositories')
  return data
}

export async function getAdminSettings(): Promise<Record<string, unknown>> {
  const { data } = await apiClient.get('/admin/settings')
  return data
}

export async function updateAdminSettings(
  payload: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const { data } = await apiClient.patch('/admin/settings', payload)
  return data
}

export async function listAuditLogs() {
  const { data } = await apiClient.get('/admin/audit_logs')
  return data as Array<{
    id: string
    actor_id?: string
    action: string
    entity_type: string
    entity_id?: string
    created_at: string
  }>
}
