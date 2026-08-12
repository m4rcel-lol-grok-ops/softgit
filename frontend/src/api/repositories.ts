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

export async function deleteAvatar(): Promise<import('@/types').User> {
  const { data } = await apiClient.delete('/user/avatar')
  return data
}

export async function starRepository(owner: string, repo: string): Promise<void> {
  await apiClient.put(`/user/starred/${owner}/${repo}`)
}

export async function unstarRepository(owner: string, repo: string): Promise<void> {
  await apiClient.delete(`/user/starred/${owner}/${repo}`)
}

export async function isStarred(owner: string, repo: string): Promise<boolean> {
  try {
    const { data } = await apiClient.get<{ starred: boolean }>(`/user/starred/${owner}/${repo}`)
    return data.starred
  } catch {
    return false
  }
}

export async function exploreRepos() {
  const { data } = await apiClient.get('/explore/repos')
  return data as Array<{
    owner_name: string
    name: string
    full_name: string
    description: string
    stars_count: number
    forks_count: number
    updated_at: string
  }>
}

export async function listIssues(owner: string, repo: string, state = 'open') {
  const { data } = await apiClient.get(`/repos/${owner}/${repo}/issues`, { params: { state } })
  return data as Array<{
    number: number
    title: string
    body: string
    state: string
    author: { username: string; is_verified: boolean }
    comments_count: number
    created_at: string
  }>
}

export async function createIssue(owner: string, repo: string, payload: { title: string; body?: string }) {
  const { data } = await apiClient.post(`/repos/${owner}/${repo}/issues`, payload)
  return data
}

export async function updateIssue(
  owner: string,
  repo: string,
  number: number,
  payload: { title?: string; body?: string; state?: string }
) {
  const { data } = await apiClient.patch(`/repos/${owner}/${repo}/issues/${number}`, payload)
  return data
}

export async function listReleases(owner: string, repo: string) {
  const { data } = await apiClient.get(`/repos/${owner}/${repo}/releases`)
  return data as Array<{
    id: string
    tag_name: string
    name: string
    body: string
    draft: boolean
    prerelease: boolean
    verified?: boolean
    author: { username: string; is_verified: boolean }
    created_at: string
  }>
}

export async function createRelease(
  owner: string,
  repo: string,
  payload: { tag_name: string; name?: string; body?: string; prerelease?: boolean }
) {
  const { data } = await apiClient.post(`/repos/${owner}/${repo}/releases`, payload)
  return data
}

export async function searchAll(q: string) {
  const { data } = await apiClient.get('/search', { params: { q } })
  return data as {
    query: string
    users: Array<{ username: string; display_name: string; is_verified: boolean; avatar_url?: string }>
    repositories: Array<{ full_name: string; description: string; stars_count: number; owner_name: string; name: string }>
  }
}
