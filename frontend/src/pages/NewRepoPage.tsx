import { useState, type FormEvent } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { useAuth, getErrorMessage } from '@/hooks/useAuth'
import { createRepository } from '@/api/repositories'
import { Button, Input, Label, Textarea } from '@/components/ui'

export function NewRepoPage() {
  const { isAuthenticated, isLoading, user } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [visibility, setVisibility] = useState<'public' | 'private'>('private')
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: createRepository,
    onSuccess: (repo) => {
      navigate(`/${repo.owner_name}/${repo.name}`)
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

  if (!isLoading && !isAuthenticated) {
    return <Navigate to="/login" state={{ from: '/new' }} replace />
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError('')
    mutation.mutate({
      name,
      description,
      visibility,
      default_branch: 'main',
    })
  }

  return (
    <div className="max-w-[768px] mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-1">Create a new repository</h1>
      <p className="text-sm text-[var(--color-fg-muted)] mb-6">
        A repository contains all project files, including revision history.
      </p>

      {error && (
        <div className="mb-4 px-3 py-2 text-sm rounded-md border border-[var(--color-danger-emphasis)] bg-[var(--color-danger-emphasis)]/10 text-[var(--color-danger-fg)]" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="owner">Owner</Label>
          <Input id="owner" value={user?.username || ''} disabled className="max-w-xs opacity-70" />
        </div>
        <div>
          <Label htmlFor="name">Repository name *</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            pattern="[a-zA-Z0-9]([a-zA-Z0-9._-]*[a-zA-Z0-9])?"
            className="max-w-md"
            autoFocus
          />
        </div>
        <div>
          <Label htmlFor="description">Description (optional)</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="max-w-xl min-h-[80px]"
          />
        </div>
        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold mb-1">Visibility</legend>
          <label className="flex items-start gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              name="visibility"
              checked={visibility === 'public'}
              onChange={() => setVisibility('public')}
              className="mt-1"
            />
            <span>
              <span className="font-semibold">Public</span>
              <span className="block text-[var(--color-fg-muted)]">Anyone on the internet can see this repository.</span>
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              name="visibility"
              checked={visibility === 'private'}
              onChange={() => setVisibility('private')}
              className="mt-1"
            />
            <span>
              <span className="font-semibold">Private</span>
              <span className="block text-[var(--color-fg-muted)]">You choose who can see and commit to this repository.</span>
            </span>
          </label>
        </fieldset>
        <div className="border-t border-[var(--color-border-default)] pt-4">
          <Button type="submit" variant="primary" loading={mutation.isPending}>
            Create repository
          </Button>
        </div>
      </form>
    </div>
  )
}
