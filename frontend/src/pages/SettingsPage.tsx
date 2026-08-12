import { useState, type FormEvent } from 'react'
import { Navigate, NavLink, Outlet } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth, getErrorMessage } from '@/hooks/useAuth'
import { updateCurrentUser } from '@/api/auth'
import { Button, Input, Label, Textarea } from '@/components/ui'
import { cn } from '@/utils/cn'

export function SettingsLayout() {
  const { isAuthenticated, isLoading } = useAuth()
  if (!isLoading && !isAuthenticated) {
    return <Navigate to="/login" state={{ from: '/settings/profile' }} replace />
  }

  const links = [
    { to: '/settings/profile', label: 'Public profile' },
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
  const queryClient = useQueryClient()

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

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    mutation.mutate({
      display_name: displayName,
      bio,
      website,
      location,
    })
  }

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
        This section is wired for backend support. Controls will appear when the corresponding API endpoints are fully available.
      </p>
    </div>
  )
}
