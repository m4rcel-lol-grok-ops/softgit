import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useAuth, getErrorMessage } from '@/hooks/useAuth'
import { Button, Input, Label } from '@/components/ui'

export function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string })?.from || '/'

  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!isLoading && isAuthenticated) {
    return <Navigate to={from} replace />
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(loginId, password)
      navigate(from, { replace: true })
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
          <h1 className="text-2xl font-light tracking-tight">Sign in to SoftGit</h1>
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
            <Label htmlFor="login">Username or email address</Label>
            <Input
              id="login"
              autoComplete="username"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <Label htmlFor="password" className="mb-0">
                Password
              </Label>
              <Link to="/forgot-password" className="text-xs">
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" variant="primary" className="w-full" loading={submitting}>
            Sign in
          </Button>
        </form>

        <div className="mt-4 border border-[var(--color-border-default)] rounded-md p-4 text-sm text-center">
          New to SoftGit?{' '}
          <Link to="/register" className="font-semibold">
            Create an account
          </Link>
        </div>
      </div>
    </div>
  )
}
