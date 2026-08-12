/** Resolve avatar URL against the API origin when relative. */
export function resolveAvatarUrl(url?: string | null): string | undefined {
  if (!url) return undefined
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url
  }
  const api = import.meta.env.VITE_API_URL || '/api/v1'
  // VITE_API_URL is like http://host/api/v1 — avatars are under /api/v1/avatars/...
  const base = api.replace(/\/api\/v1\/?$/, '')
  return `${base}${url.startsWith('/') ? url : '/' + url}`
}
