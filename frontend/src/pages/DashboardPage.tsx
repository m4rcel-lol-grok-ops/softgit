import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { listMyRepos } from '@/api/repositories'
import { Button, EmptyState, Spinner, Badge } from '@/components/ui'
import { BookMarked, Plus, Lock, Star } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export function DashboardPage() {
  const { user, isAuthenticated } = useAuth()

  const { data: repos, isLoading } = useQuery({
    queryKey: ['my-repos'],
    queryFn: listMyRepos,
    enabled: isAuthenticated,
  })

  if (!isAuthenticated) {
    return (
      <div className="max-w-[720px] mx-auto px-4 py-20 md:py-28">
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">
          SoftGit
        </h1>
        <p className="text-lg text-[var(--color-fg-muted)] mb-8 leading-relaxed max-w-xl">
          Self-hosted Git hosting. Repositories, issues, releases, and SSH — under your control.
        </p>
        <div className="flex flex-wrap gap-3 mb-16">
          <Link to="/register">
            <Button variant="primary" size="lg">
              Sign up
            </Button>
          </Link>
          <Link to="/login">
            <Button variant="outline" size="lg">
              Sign in
            </Button>
          </Link>
        </div>
        <ul className="space-y-3 text-sm text-[var(--color-fg-muted)] border-t border-[var(--color-border-default)] pt-8">
          <li className="flex gap-3">
            <span className="text-[var(--color-fg-default)] font-medium w-36 shrink-0">Git</span>
            <span>Clone, push, and pull over HTTPS and SSH</span>
          </li>
          <li className="flex gap-3">
            <span className="text-[var(--color-fg-default)] font-medium w-36 shrink-0">Collaboration</span>
            <span>Issues, releases, stars, and verified accounts</span>
          </li>
          <li className="flex gap-3">
            <span className="text-[var(--color-fg-default)] font-medium w-36 shrink-0">Access</span>
            <span>Personal tokens, SSH keys, public and private repos</span>
          </li>
          <li className="flex gap-3">
            <span className="text-[var(--color-fg-default)] font-medium w-36 shrink-0">Deploy</span>
            <span>Docker Compose, PostgreSQL, Redis, Caddy</span>
          </li>
        </ul>
      </div>
    )
  }

  return (
    <div className="max-w-[1280px] mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Home</h1>
        <Link to="/new">
          <Button variant="primary" size="sm">
            <Plus size={14} /> New
          </Button>
        </Link>
      </div>

      <div className="grid md:grid-cols-[1fr_300px] gap-6">
        <div>
          <div className="border border-[var(--color-border-default)] rounded-md">
            <div className="px-4 py-3 border-b border-[var(--color-border-default)] font-semibold text-sm flex items-center gap-2">
              <BookMarked size={16} />
              Your repositories
            </div>
            {isLoading && (
              <div className="flex justify-center py-10"><Spinner /></div>
            )}
            {!isLoading && (!repos || repos.length === 0) && (
              <EmptyState
                title="No repositories yet"
                description="Create your first repository to get started with SoftGit."
                action={
                  <Link to="/new">
                    <Button variant="primary" size="sm">Create repository</Button>
                  </Link>
                }
              />
            )}
            {repos && repos.length > 0 && (
              <ul className="divide-y divide-[var(--color-border-muted)]">
                {repos.map((repo) => (
                  <li key={repo.id}>
                    <Link
                      to={`/${repo.owner_name}/${repo.name}`}
                      className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-[var(--color-canvas-subtle)] no-underline text-[var(--color-fg-default)] hover:no-underline"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[var(--color-accent-fg)] truncate">{repo.name}</span>
                          <Badge variant={repo.visibility === 'private' ? 'attention' : 'default'}>
                            {repo.visibility === 'private' ? (
                              <span className="inline-flex items-center gap-0.5"><Lock size={10} /> private</span>
                            ) : 'public'}
                          </Badge>
                        </div>
                        {repo.description && (
                          <p className="text-xs text-[var(--color-fg-muted)] truncate mt-0.5">{repo.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-[var(--color-fg-muted)] shrink-0">
                        <span className="inline-flex items-center gap-1"><Star size={12} /> {repo.stars_count}</span>
                        {repo.updated_at && (
                          <span className="hidden sm:inline">
                            {formatDistanceToNow(new Date(repo.updated_at), { addSuffix: true })}
                          </span>
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-6 border border-[var(--color-border-default)] rounded-md">
            <div className="px-4 py-3 border-b border-[var(--color-border-default)] font-semibold text-sm">
              Recent activity
            </div>
            <EmptyState
              title="Your feed is empty"
              description="Activity from repositories you watch will show up here."
            />
          </div>
        </div>

        <aside className="space-y-4">
          <div className="border border-[var(--color-border-default)] rounded-md p-4">
            <h2 className="text-sm font-semibold mb-2">Welcome, {user?.display_name || user?.username}</h2>
            <p className="text-xs text-[var(--color-fg-muted)] mb-3">
              Get started by creating a repository or setting up a profile README.
            </p>
            <div className="flex flex-col gap-2">
              <Link to="/new">
                <Button variant="outline" size="sm" className="w-full">Create repository</Button>
              </Link>
              <Link to={`/${user?.username}`}>
                <Button variant="ghost" size="sm" className="w-full">Your profile</Button>
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
