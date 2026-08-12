import apiClient from './client'
import type { Repository, CommitInfo, TreeEntry, Branch } from '@/types'

export async function createRepository(payload: {
  name: string
  description?: string
  visibility?: string
  default_branch?: string
}): Promise<Repository> {
  const { data } = await apiClient.post<Repository>('/user/repos', payload)
  return data
}

export async function getRepository(owner: string, repo: string): Promise<Repository> {
  const { data } = await apiClient.get<Repository>(`/repos/${owner}/${repo}`)
  return data
}

export async function updateRepository(
  owner: string,
  repo: string,
  payload: { description?: string; visibility?: string }
): Promise<Repository> {
  const { data } = await apiClient.patch<Repository>(`/repos/${owner}/${repo}`, payload)
  return data
}

export async function deleteRepository(owner: string, repo: string): Promise<void> {
  await apiClient.delete(`/repos/${owner}/${repo}`)
}

export async function renameRepository(owner: string, repo: string, name: string): Promise<Repository> {
  const { data } = await apiClient.post<Repository>(`/repos/${owner}/${repo}/rename`, { name })
  return data
}

export async function listBranches(owner: string, repo: string): Promise<Branch[]> {
  const { data } = await apiClient.get<Branch[]>(`/repos/${owner}/${repo}/branches`)
  return data
}

export async function listTags(owner: string, repo: string): Promise<string[]> {
  const { data } = await apiClient.get<string[]>(`/repos/${owner}/${repo}/tags`)
  return data
}

export async function listCommits(owner: string, repo: string, sha?: string): Promise<CommitInfo[]> {
  const { data } = await apiClient.get<CommitInfo[]>(`/repos/${owner}/${repo}/commits`, {
    params: sha ? { sha } : undefined,
  })
  return data
}

export async function getContents(
  owner: string,
  repo: string,
  path: string = '',
  ref?: string
): Promise<{ type: string; path: string; entries?: TreeEntry[]; content?: string; encoding?: string }> {
  const p = path ? `/${path}` : ''
  const { data } = await apiClient.get(`/repos/${owner}/${repo}/contents${p}`, {
    params: ref ? { ref } : undefined,
  })
  return data
}

export async function starRepository(owner: string, repo: string): Promise<void> {
  await apiClient.put(`/user/starred/${owner}/${repo}`)
}

export async function unstarRepository(owner: string, repo: string): Promise<void> {
  await apiClient.delete(`/user/starred/${owner}/${repo}`)
}

export async function getUser(username: string) {
  const { data } = await apiClient.get(`/users/${username}`)
  return data
}

export async function search(q: string) {
  const { data } = await apiClient.get('/search', { params: { q } })
  return data
}

export async function listUserRepos(username: string): Promise<Repository[]> {
  const { data } = await apiClient.get<Repository[]>(`/users/${username}/repos`)
  return data
}

export async function listMyRepos(): Promise<Repository[]> {
  const { data } = await apiClient.get<Repository[]>('/user/repos')
  return data
}

export async function getProfileReadme(username: string): Promise<{
  name: string
  path: string
  content: string
  encoding: string
  repo: string
} | null> {
  try {
    const { data } = await apiClient.get(`/users/${username}/profile-readme`)
    return data
  } catch {
    return null
  }
}

export async function uploadAvatar(file: File): Promise<import('@/types').User> {
  const form = new FormData()
  form.append('avatar', file)
  const { data } = await apiClient.post('/user/avatar', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}
