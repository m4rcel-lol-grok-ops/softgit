import { useEffect, useRef, useState, type FormEvent, type ChangeEvent } from 'react'
import { Navigate, NavLink, Outlet } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth, getErrorMessage } from '@/hooks/useAuth'
import { updateCurrentUser } from '@/api/auth'
import { uploadAvatar, deleteAvatar } from '@/api/repositories'
import { listSSHKeys, createSSHKey, deleteSSHKey, listTokens, createToken, deleteToken } from '@/api/settings'
import { Button, Input, Label, Textarea, Avatar, Spinner } from '@/components/ui'
import { resolveAvatarUrl } from '@/utils/avatar'
import { cn } from '@/utils/cn'
import { THEMES, applyTheme, getStoredThemeId, type ThemeId } from '@/themes'

export function SettingsLayout() {
  const { isAuthenticated, isLoading } = useAuth()
  if (!isLoading && !isAuthenticated) {
    return <Navigate to="/login" state={{ from: '/settings/profile' }} replace />
  }

  const links = [
    { to: '/settings/profile', label: 'Public profile' },
    { to: '/settings/appearance', label: 'Appearance' },
    { to: '/settings/account', label: 'Account' },
    { to: '/settings/ssh-keys', label: 'SSH keys' },
    { to: '/settings/tokens', label: 'Access tokens' },
  ]

  return (
    <div className="max-w-[1280px] mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold mb-6">Settings</h1>
      <div className="grid md:grid-cols-[220px_1fr] gap-8">
        <nav className="flex md:flex-col gap-1 text-sm">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                cn(
                  'px-3 py-1.5 rounded-md no-underline text-[var(--color-fg-default)] hover:bg-[var(--color-canvas-subtle)] hover:no-underline',
                  isActive && 'bg-[var(--color-canvas-subtle)] font-semibold'
                )
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div>
          <Outlet />
        </div>
      </div>
    </div>
  )
}

export function SettingsProfilePage() {
  const { user, refresh } = useAuth()
  const [displayName, setDisplayName] = useState(user?.display_name || '')
  const [bio, setBio] = useState(user?.bio || '')
  const [website, setWebsite] = useState(user?.website || '')
  const [location, setLocation] = useState(user?.location || '')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name || '')
      setBio(user.bio || '')
      setWebsite(user.website || '')
      setLocation(user.location || '')
    }
  }, [user])

  const mutation = useMutation({
    mutationFn: updateCurrentUser,
    onSuccess: () => {
      setMessage('Profile updated successfully.')
      setError('')
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
      refresh()
    },
    onError: (err) => {
      setError(getErrorMessage(err))
      setMessage('')
    },
  })

  const avatarMutation = useMutation({
    mutationFn: uploadAvatar,
    onSuccess: () => {
      setMessage('Profile picture updated.')
      setError('')
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
      refresh()
      if (fileRef.current) fileRef.current.value = ''
    },
    onError: (err) => {
      setError(getErrorMessage(err))
      setMessage('')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteAvatar,
    onSuccess: () => {
      setMessage('Profile picture removed.')
      setError('')
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
      refresh()
    },
    onError: (err) => {
      setError(getErrorMessage(err))
      setMessage('')
    },
  })

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    mutation.mutate({
      display_name: displayName,
      bio,
      website,
      location,
    })
  }

  const onAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setError('Avatar must be 5MB or smaller.')
      return
    }
    avatarMutation.mutate(file)
  }

  const hasAvatar = Boolean(user?.avatar_url)

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4 border-b border-[var(--color-border-default)] pb-2">
        Public profile
      </h2>
      {message && (
        <div className="mb-3 text-sm text-[var(--color-success-fg)]" role="status">
          {message}
        </div>
      )}
      {error && (
        <div className="mb-3 text-sm text-[var(--color-danger-fg)]" role="alert">
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start gap-5 mb-8 p-4 border border-[var(--color-border-default)] rounded-md bg-[var(--color-canvas-subtle)]">
        <Avatar
          name={user?.username || 'user'}
          src={resolveAvatarUrl(user?.avatar_url)}
          size={96}
          className="rounded-full border border-[var(--color-border-default)] shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold mb-1">Profile picture</p>
          <p className="text-xs text-[var(--color-fg-muted)] mb-3">
            {hasAvatar
              ? 'You can replace your current picture or remove it.'
              : 'Upload a picture so others can recognize you. PNG, JPG, GIF or WebP. Max 5MB.'}
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            className="hidden"
            onChange={onAvatarChange}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="primary"
              size="sm"
              loading={avatarMutation.isPending}
              onClick={() => fileRef.current?.click()}
            >
              {hasAvatar ? 'Change picture' : 'Upload picture'}
            </Button>
            {hasAvatar && (
              <Button
                type="button"
                variant="danger"
                size="sm"
                loading={deleteMutation.isPending}
                onClick={() => {
                  if (confirm('Remove your profile picture?')) deleteMutation.mutate()
                }}
              >
                Delete picture
              </Button>
            )}
          </div>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 max-w-md">
        <div>
          <Label htmlFor="display_name">Name</Label>
          <Input id="display_name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="bio">Bio</Label>
          <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="website">URL</Label>
          <Input id="website" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="location">Location</Label>
          <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} />
        </div>
        <Button type="submit" variant="primary" loading={mutation.isPending}>
          Update profile
        </Button>
      </form>

      <div className="mt-8 p-4 border border-[var(--color-border-default)] rounded-md bg-[var(--color-canvas-subtle)] text-sm max-w-lg">
        <p className="font-semibold mb-1">Profile README</p>
        <p className="text-[var(--color-fg-muted)]">
          Create a public repository named the same as your username (
          <code className="text-xs">{user?.username}/{user?.username}</code>
          ) with a <code className="text-xs">README.md</code>. It will be shown at the top of your
          profile page.
        </p>
      </div>
    </div>
  )
}

export function SettingsAppearancePage() {
  const [themeId, setThemeId] = useState<ThemeId>(() => getStoredThemeId())

  const select = (id: ThemeId) => {
    setThemeId(id)
    applyTheme(id)
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-1 border-b border-[var(--color-border-default)] pb-2">
        Appearance
      </h2>
      <p className="text-sm text-[var(--color-fg-muted)] mt-3 mb-4">
        Choose any theme you like. Your preference is saved in this browser.
      </p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {THEMES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => select(t.id)}
            className={cn(
              'text-left p-3 rounded-md border transition-colors',
              themeId === t.id
                ? 'border-[var(--color-accent-emphasis)] ring-2 ring-[var(--color-accent-emphasis)]/30'
                : 'border-[var(--color-border-default)] hover:border-[var(--color-fg-muted)]'
            )}
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="font-semibold text-sm">{t.label}</span>
              {themeId === t.id && (
                <span className="text-xs text-[var(--color-accent-fg)] font-medium">Active</span>
              )}
            </div>
            <p className="text-xs text-[var(--color-fg-muted)]">{t.description}</p>
            <div className="flex gap-1 mt-2">
              {t.id === 'system' ? (
                <>
                  <span className="h-4 w-6 rounded-sm bg-white border border-[var(--color-border-default)]" />
                  <span className="h-4 w-6 rounded-sm bg-[#0d1117] border border-[var(--color-border-default)]" />
                </>
              ) : (
                <>
                  <span
                    className="h-4 w-6 rounded-sm border border-[var(--color-border-default)]"
                    style={{ background: t.vars['--color-canvas-default'] || '#fff' }}
                  />
                  <span
                    className="h-4 w-6 rounded-sm border border-[var(--color-border-default)]"
                    style={{ background: t.vars['--color-accent-emphasis'] || '#0969da' }}
                  />
                  <span
                    className="h-4 w-6 rounded-sm border border-[var(--color-border-default)]"
                    style={{ background: t.vars['--color-fg-default'] || '#000' }}
                  />
                </>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

export function SettingsPlaceholder({ title }: { title: string }) {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4 border-b border-[var(--color-border-default)] pb-2">
        {title}
      </h2>
      <p className="text-sm text-[var(--color-fg-muted)]">
        This section is wired for backend support. Controls will appear when the corresponding API
        endpoints are fully available.
      </p>
    </div>
  )
}


export function SettingsSSHKeysPage() {
  const [title, setTitle] = useState('')
  const [key, setKey] = useState('')
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const qc = useQueryClient()
  const { data: keys, isLoading, error: loadError } = useQuery({
    queryKey: ['ssh-keys'],
    queryFn: listSSHKeys,
  })
  const createMut = useMutation({
    mutationFn: () => createSSHKey({ title, public_key: key }),
    onSuccess: () => {
      setMsg('SSH key added.')
      setError('')
      setTitle('')
      setKey('')
      qc.invalidateQueries({ queryKey: ['ssh-keys'] })
    },
    onError: (e) => setError(getErrorMessage(e)),
  })
  const delMut = useMutation({
    mutationFn: (id: string) => deleteSSHKey(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ssh-keys'] }),
  })

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4 border-b border-[var(--color-border-default)] pb-2">
        SSH keys
      </h2>
      <p className="text-sm text-[var(--color-fg-muted)] mb-4">
        Keys used to authenticate Git over SSH. SoftGit accepts OpenSSH public keys (ed25519, RSA, ECDSA).
      </p>
      {msg && <p className="text-sm text-[var(--color-success-fg)] mb-2">{msg}</p>}
      {error && <p className="text-sm text-[var(--color-danger-fg)] mb-2">{error}</p>}
      {loadError && (
        <p className="text-sm text-[var(--color-danger-fg)] mb-2">{getErrorMessage(loadError)}</p>
      )}
      {isLoading && (
        <div className="flex justify-center py-6">
          <Spinner />
        </div>
      )}
      <ul className="space-y-2 mb-6">
        {(keys || []).map((k) => (
          <li
            key={k.id}
            className="border border-[var(--color-border-default)] rounded-md p-3 flex flex-wrap items-center justify-between gap-2 text-sm"
          >
            <div>
              <div className="font-semibold">{k.title}</div>
              <code className="text-xs text-[var(--color-fg-muted)]">{k.fingerprint}</code>
            </div>
            <Button size="sm" variant="danger" onClick={() => delMut.mutate(k.id)}>
              Delete
            </Button>
          </li>
        ))}
        {!isLoading && (!keys || keys.length === 0) && (
          <li className="border border-dashed border-[var(--color-border-default)] rounded-md p-6 text-center text-sm text-[var(--color-fg-muted)]">
            No SSH keys yet. Add one below to push and pull over SSH.
          </li>
        )}
      </ul>
      <h3 className="font-semibold text-sm mb-2">Add a new SSH key</h3>
      <div className="space-y-3 max-w-lg">
        <div>
          <Label htmlFor="ssh-title">Title</Label>
          <Input id="ssh-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Work laptop" />
        </div>
        <div>
          <Label htmlFor="ssh-key">Key</Label>
          <Textarea
            id="ssh-key"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="ssh-ed25519 AAAA... comment"
            className="font-mono text-xs min-h-[100px]"
          />
        </div>
        <Button
          variant="primary"
          loading={createMut.isPending}
          onClick={() => createMut.mutate()}
          disabled={!title || !key}
        >
          Add SSH key
        </Button>
      </div>
    </div>
  )
}

export function SettingsTokensPage() {
  const [name, setName] = useState('')
  const [newToken, setNewToken] = useState('')
  const [error, setError] = useState('')
  const qc = useQueryClient()
  const { data: tokens, isLoading, error: loadError } = useQuery({
    queryKey: ['tokens'],
    queryFn: listTokens,
  })
  const createMut = useMutation({
    mutationFn: () => createToken({ name }),
    onSuccess: (data) => {
      setNewToken(data.token)
      setName('')
      setError('')
      qc.invalidateQueries({ queryKey: ['tokens'] })
    },
    onError: (e) => setError(getErrorMessage(e)),
  })
  const delMut = useMutation({
    mutationFn: (id: string) => deleteToken(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tokens'] }),
  })

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4 border-b border-[var(--color-border-default)] pb-2">
        Personal access tokens
      </h2>
      <p className="text-sm text-[var(--color-fg-muted)] mb-4">
        Tokens authenticate to the SoftGit API (prefix <code className="text-xs">sgt_</code>).
        Treat them like passwords — they are only shown once at creation.
      </p>
      {loadError && (
        <p className="text-sm text-[var(--color-danger-fg)] mb-2">{getErrorMessage(loadError)}</p>
      )}
      {newToken && (
        <div className="mb-4 p-3 border border-[var(--color-success-emphasis)] rounded-md bg-[var(--color-canvas-subtle)] text-sm">
          <p className="font-semibold mb-1">Copy your new token now — you won&apos;t see it again.</p>
          <code className="text-xs break-all">{newToken}</code>
        </div>
      )}
      {error && <p className="text-sm text-[var(--color-danger-fg)] mb-2">{error}</p>}
      {isLoading && <Spinner />}
      <ul className="space-y-2 mb-6">
        {(tokens || []).map((tok) => (
          <li
            key={tok.id}
            className="border border-[var(--color-border-default)] rounded-md p-3 flex flex-wrap items-center justify-between gap-2 text-sm"
          >
            <div>
              <div className="font-semibold">{tok.name}</div>
              <code className="text-xs text-[var(--color-fg-muted)]">{tok.token_prefix}…</code>
            </div>
            <Button size="sm" variant="danger" onClick={() => delMut.mutate(tok.id)}>
              Revoke
            </Button>
          </li>
        ))}
        {!isLoading && (!tokens || tokens.length === 0) && (
          <li className="border border-dashed border-[var(--color-border-default)] rounded-md p-6 text-center text-sm text-[var(--color-fg-muted)]">
            No tokens yet. Generate one below for CI or API access.
          </li>
        )}
      </ul>
      <div className="flex flex-wrap gap-2 items-end max-w-md">
        <div className="flex-1">
          <Label htmlFor="tok-name">Token name</Label>
          <Input id="tok-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="CI token" />
        </div>
        <Button variant="primary" loading={createMut.isPending} disabled={!name} onClick={() => createMut.mutate()}>
          Generate token
        </Button>
      </div>
    </div>
  )
}
