import { Navigate, NavLink, Outlet, Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import {
  getAdminStats,
  listAdminUsers,
  updateAdminUser,
  listAdminRepos,
  getAdminSettings,
  updateAdminSettings,
  listAuditLogs,
} from '@/api/admin'
import { Button, Spinner, Badge, Input, Label } from '@/components/ui'
import { cn } from '@/utils/cn'
import { useState } from 'react'
import { format } from 'date-fns'

export function AdminLayout() {
  const { user, isAuthenticated, isLoading } = useAuth()
  if (!isLoading && (!isAuthenticated || !user?.is_admin)) {
    return <Navigate to="/" replace />
  }

  const links = [
    { to: '/admin', label: 'Overview', end: true },
    { to: '/admin/users', label: 'Users' },
    { to: '/admin/repositories', label: 'Repositories' },
    { to: '/admin/settings', label: 'Site settings' },
    { to: '/admin/audit', label: 'Audit log' },
  ]

  return (
    <div className="max-w-[1280px] mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold mb-1">Site administration</h1>
      <p className="text-sm text-[var(--color-fg-muted)] mb-6">
        Manage users, repositories, and instance configuration.
      </p>
      <div className="grid md:grid-cols-[200px_1fr] gap-8">
        <nav className="flex md:flex-col gap-1 text-sm">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
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

export function AdminOverviewPage() {
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'stats'], queryFn: getAdminStats })
  if (isLoading || !data) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    )
  }
  const cards = [
    { label: 'Users', value: data.users },
    { label: 'Repositories', value: data.repositories },
    { label: 'Public repos', value: data.public_repos },
    { label: 'Private repos', value: data.private_repos },
  ]
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Overview</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {cards.map((c) => (
          <div
            key={c.label}
            className="border border-[var(--color-border-default)] rounded-md p-4 bg-[var(--color-canvas-subtle)]"
          >
            <div className="text-2xl font-semibold">{c.value}</div>
            <div className="text-sm text-[var(--color-fg-muted)]">{c.label}</div>
          </div>
        ))}
      </div>
      <dl className="text-sm space-y-2">
        <div className="flex gap-2">
          <dt className="text-[var(--color-fg-muted)] w-40">Registration</dt>
          <dd>{data.registration ? 'Enabled' : 'Disabled'} (config)</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-[var(--color-fg-muted)] w-40">Server time (UTC)</dt>
          <dd>{format(new Date(data.server_time), 'PPpp')}</dd>
        </div>
      </dl>
    </div>
  )
}

export function AdminUsersPage() {
  const qc = useQueryClient()
  const { data: users, isLoading } = useQuery({ queryKey: ['admin', 'users'], queryFn: listAdminUsers })
  const mutation = useMutation({
    mutationFn: ({ id, ...payload }: { id: string; is_active?: boolean; is_admin?: boolean }) =>
      updateAdminUser(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Users</h2>
      <div className="border border-[var(--color-border-default)] rounded-md overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-canvas-subtle)] text-left">
            <tr>
              <th className="px-3 py-2 font-semibold">User</th>
              <th className="px-3 py-2 font-semibold">Email</th>
              <th className="px-3 py-2 font-semibold">Status</th>
              <th className="px-3 py-2 font-semibold">Role</th>
              <th className="px-3 py-2 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border-muted)]">
            {(users || []).map((u) => (
              <tr key={u.id}>
                <td className="px-3 py-2">
                  <Link to={`/${u.username}`} className="font-semibold text-[var(--color-accent-fg)]">
                    {u.username}
                  </Link>
                  <div className="text-xs text-[var(--color-fg-muted)]">{u.display_name}</div>
                </td>
                <td className="px-3 py-2 text-[var(--color-fg-muted)]">{u.email}</td>
                <td className="px-3 py-2">
                  <Badge variant={u.is_active ? 'success' : 'danger'}>
                    {u.is_active ? 'Active' : 'Disabled'}
                  </Badge>
                </td>
                <td className="px-3 py-2">
                  {u.is_admin ? <Badge variant="attention">Admin</Badge> : 'User'}
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={mutation.isPending}
                      onClick={() => mutation.mutate({ id: u.id, is_active: !u.is_active })}
                    >
                      {u.is_active ? 'Disable' : 'Enable'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={mutation.isPending}
                      onClick={() => mutation.mutate({ id: u.id, is_admin: !u.is_admin })}
                    >
                      {u.is_admin ? 'Revoke admin' : 'Make admin'}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function AdminReposPage() {
  const { data: repos, isLoading } = useQuery({
    queryKey: ['admin', 'repos'],
    queryFn: listAdminRepos,
  })
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    )
  }
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Repositories</h2>
      <ul className="border border-[var(--color-border-default)] rounded-md divide-y divide-[var(--color-border-muted)]">
        {(repos || []).map((r) => (
          <li key={r.id} className="px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-sm">
            <div>
              <Link
                to={`/${r.owner_name}/${r.name}`}
                className="font-semibold text-[var(--color-accent-fg)]"
              >
                {r.full_name}
              </Link>
              {r.description && (
                <p className="text-xs text-[var(--color-fg-muted)] mt-0.5">{r.description}</p>
              )}
            </div>
            <Badge variant={r.visibility === 'private' ? 'attention' : 'default'}>{r.visibility}</Badge>
          </li>
        ))}
        {(!repos || repos.length === 0) && (
          <li className="px-4 py-8 text-center text-[var(--color-fg-muted)]">No repositories</li>
        )}
      </ul>
    </div>
  )
}

export function AdminSettingsPage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'settings'], queryFn: getAdminSettings })
  const [form, setForm] = useState<Record<string, unknown> | null>(null)
  const [msg, setMsg] = useState('')

  const values = form || data || {}

  const mutation = useMutation({
    mutationFn: updateAdminSettings,
    onSuccess: (saved) => {
      setForm(saved)
      setMsg('Settings saved.')
      qc.invalidateQueries({ queryKey: ['admin', 'settings'] })
    },
  })

  if (isLoading && !data) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    )
  }

  const set = (key: string, value: unknown) => {
    setForm({ ...values, [key]: value })
    setMsg('')
  }

  return (
    <div className="max-w-lg">
      <h2 className="text-lg font-semibold mb-4">Site settings</h2>
      {msg && <p className="text-sm text-[var(--color-success-fg)] mb-3">{msg}</p>}
      <div className="space-y-4">
        <div>
          <Label htmlFor="site_name">Site name</Label>
          <Input
            id="site_name"
            value={String(values.site_name ?? '')}
            onChange={(e) => set('site_name', e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="site_description">Site description</Label>
          <Input
            id="site_description"
            value={String(values.site_description ?? '')}
            onChange={(e) => set('site_description', e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="footer_text">Footer text</Label>
          <Input
            id="footer_text"
            value={String(values.footer_text ?? '')}
            onChange={(e) => set('footer_text', e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={Boolean(values.registration_enabled)}
            onChange={(e) => set('registration_enabled', e.target.checked)}
          />
          Allow new user registration
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={Boolean(values.allow_public_repos)}
            onChange={(e) => set('allow_public_repos', e.target.checked)}
          />
          Allow public repositories
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={Boolean(values.maintenance_mode)}
            onChange={(e) => set('maintenance_mode', e.target.checked)}
          />
          Maintenance mode
        </label>
        <div>
          <Label htmlFor="default_vis">Default repository visibility</Label>
          <select
            id="default_vis"
            className="w-full h-8 px-2 text-sm rounded-md border border-[var(--color-border-default)] bg-[var(--color-canvas-default)]"
            value={String(values.default_repo_visibility ?? 'private')}
            onChange={(e) => set('default_repo_visibility', e.target.value)}
          >
            <option value="private">Private</option>
            <option value="public">Public</option>
          </select>
        </div>
        <Button
          variant="primary"
          loading={mutation.isPending}
          onClick={() => mutation.mutate(values)}
        >
          Save settings
        </Button>
      </div>
    </div>
  )
}

export function AdminAuditPage() {
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'audit'], queryFn: listAuditLogs })
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    )
  }
  const logs = data || []
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Audit log</h2>
      {logs.length === 0 ? (
        <p className="text-sm text-[var(--color-fg-muted)]">No audit events recorded yet.</p>
      ) : (
        <ul className="border border-[var(--color-border-default)] rounded-md divide-y divide-[var(--color-border-muted)] text-sm">
          {logs.map((l) => (
            <li key={l.id} className="px-4 py-2 flex flex-wrap gap-3">
              <span className="font-mono text-xs text-[var(--color-fg-muted)]">
                {format(new Date(l.created_at), 'yyyy-MM-dd HH:mm')}
              </span>
              <span className="font-semibold">{l.action}</span>
              <span className="text-[var(--color-fg-muted)]">
                {l.entity_type}
                {l.entity_id ? ` ${l.entity_id.slice(0, 8)}…` : ''}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
