import apiClient from './client'

export async function listSSHKeys() {
  const { data } = await apiClient.get('/user/ssh_keys')
  return data as Array<{
    id: string
    title: string
    fingerprint: string
    public_key: string
    created_at: string
  }>
}

export async function createSSHKey(payload: { title: string; public_key: string }) {
  const { data } = await apiClient.post('/user/ssh_keys', payload)
  return data
}

export async function deleteSSHKey(id: string) {
  await apiClient.delete(`/user/ssh_keys/${id}`)
}

export async function listTokens() {
  const { data } = await apiClient.get('/user/tokens')
  return data as Array<{
    id: string
    name: string
    token_prefix: string
    scopes: string[]
    created_at: string
  }>
}

export async function createToken(payload: { name: string; scopes?: string[] }) {
  const { data } = await apiClient.post('/user/tokens', payload)
  return data as { id: string; name: string; token: string; token_prefix: string }
}

export async function deleteToken(id: string) {
  await apiClient.delete(`/user/tokens/${id}`)
}
