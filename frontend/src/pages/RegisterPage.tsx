import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth, getErrorMessage } from '@/hooks/useAuth'
import { Button, Input, Label } from '@/components/ui'

export function RegisterPage() {
  const { register, isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!isLoading && isAuthenticated) {
    return <Navigate to="/" replace />
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setSubmitting(true)
    try {
      await register(username, email, password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-start justify-center pt-16 px-4">
      <div className="w-full max-w-[340px]">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-light tracking-tight">Create your account</h1>
        </div>

        {error && (
          <div
            className="mb-4 px-3 py-2 text-sm rounded-md border border-[var(--color-danger-emphasis)] bg-[var(--color-danger-emphasis)]/10 text-[var(--color-danger-fg)]"
            role="alert"
          >
            {error}
          </div>
        )}

        <form
          onSubmit={onSubmit}
          className="border border-[var(--color-border-default)] rounded-md p-4 bg-[var(--color-canvas-subtle)] space-y-3"
        >
          <div>
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              pattern="[a-zA-Z0-9]([a-zA-Z0-9._-]*[a-zA-Z0-9])?"
              title="Alphanumeric with limited punctuation"
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
            <p className="mt-1 text-xs text-[var(--color-fg-muted)]">
              At least 8 characters. Make it strong.
            </p>
          </div>
          <Button type="submit" variant="primary" className="w-full" loading={submitting}>
            Create account
          </Button>
        </form>

        <div className="mt-4 border border-[var(--color-border-default)] rounded-md p-4 text-sm text-center">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
