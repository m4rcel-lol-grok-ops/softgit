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
      <div className="relative overflow-hidden">
        {/* Hero */}
        <div className="border-b border-[var(--color-border-default)] bg-[var(--color-canvas-subtle)]">
          <div className="max-w-[1100px] mx-auto px-4 py-16 md:py-24">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <p className="text-sm font-semibold text-[var(--color-accent-fg)] mb-3 tracking-wide uppercase">
                  Self-hosted Git hosting
                </p>
                <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-4 tracking-tight">
                  Where your code lives — on your terms
                </h1>
                <p className="text-lg text-[var(--color-fg-muted)] mb-8 max-w-md">
                  SoftGit is a production-oriented Git hosting platform. Repositories, issues,
                  releases, SSH, and access tokens — without giving up control of your data.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link to="/register">
                    <Button variant="primary" size="lg">
                      Create free account
                    </Button>
                  </Link>
                  <Link to="/login">
                    <Button variant="outline" size="lg">
                      Sign in
                    </Button>
                  </Link>
                  <Link to="/explore">
                    <Button variant="ghost" size="lg">
                      Explore public repos
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="hidden md:block">
                <div className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-canvas-default)] shadow-lg overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2 border-b border-[var(--color-border-default)] bg-[var(--color-canvas-subtle)]">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                    <span className="ml-3 text-xs text-[var(--color-fg-muted)] font-mono">
                      alice / hello-world
                    </span>
                  </div>
                  <div className="p-4 font-mono text-xs space-y-2 text-[var(--color-fg-muted)]">
                    <div>
                      <span className="text-[var(--color-success-fg)]">$</span> git clone softgit.example/alice/hello-world.git
                    </div>
                    <div className="text-[var(--color-fg-default)]">Cloning into &apos;hello-world&apos;...</div>
                    <div>
                      <span className="text-[var(--color-success-fg)]">$</span> git push origin main
                    </div>
                    <div className="text-[var(--color-fg-default)]">Enumerating objects: 12, done.</div>
                    <div className="pt-2 border-t border-[var(--color-border-muted)] flex gap-4 text-[var(--color-fg-default)]">
                      <span>★ 128 stars</span>
                      <span>⑂ 14 forks</span>
                      <span className="text-[var(--color-success-fg)]">● 3 open issues</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature grid */}
        <div className="max-w-[1100px] mx-auto px-4 py-16">
          <h2 className="text-2xl font-semibold text-center mb-2">Everything you need to host Git</h2>
          <p className="text-center text-[var(--color-fg-muted)] mb-10 max-w-xl mx-auto">
            Familiar workflows, built independently — not a thin wrapper around another product.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                title: 'Real Git over HTTP & SSH',
                body: 'Clone, fetch, push, and pull against bare repositories with Smart HTTP and SSH.',
              },
              {
                title: 'Issues & releases',
                body: 'Track work with issues, publish versioned releases, and mark verified authors.',
              },
              {
                title: 'Access control',
                body: 'Public and private repos, personal access tokens, and SSH keys for developers.',
              },
              {
                title: 'Profiles & orgs-ready',
                body: 'User profiles, avatars, profile READMEs, and admin tools for your instance.',
              },
              {
                title: 'Themes your way',
                body: 'Dark by default, with Nord, Dracula, Solarized, high-contrast, and more.',
              },
              {
                title: 'Self-hosted first',
                body: 'Docker Compose, PostgreSQL, Redis, and a simple Caddy reverse proxy.',
              },
            ].map((f) => (
              <div
                key={f.title}
                className="border border-[var(--color-border-default)] rounded-lg p-5 bg-[var(--color-canvas-default)] hover:border-[var(--color-fg-muted)] transition-colors"
              >
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-[var(--color-fg-muted)] leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="border-t border-[var(--color-border-default)] bg-[var(--color-canvas-subtle)]">
          <div className="max-w-[1100px] mx-auto px-4 py-12 text-center">
            <h2 className="text-xl font-semibold mb-2">Ready to host your own Git?</h2>
            <p className="text-sm text-[var(--color-fg-muted)] mb-5">
              Spin up SoftGit in minutes and keep your source code under your control.
            </p>
            <Link to="/register">
              <Button variant="primary" size="lg">
                Get started
              </Button>
            </Link>
          </div>
        </div>
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
