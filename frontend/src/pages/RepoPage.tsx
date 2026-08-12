import { Link, useParams, useSearchParams, NavLink, Outlet } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getRepository,
  listBranches,
  listCommits,
  getContents,
  starRepository,
  unstarRepository,
} from '@/api/repositories'
import { Badge, Button, Spinner, ErrorState, EmptyState } from '@/components/ui'
import { getErrorMessage } from '@/api/client'
import {
  Code2,
  GitBranch,
  GitCommit,
  GitPullRequest,
  CircleDot,
  Star,
  Eye,
  GitFork,
  Tag,
  Settings,
  File,
  Folder,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { formatDistanceToNow } from 'date-fns'

export function RepoLayout() {
  const { owner = '', repo = '' } = useParams()
  const queryClient = useQueryClient()

  const { data: repository, isLoading, error, refetch } = useQuery({
    queryKey: ['repo', owner, repo],
    queryFn: () => getRepository(owner, repo),
    enabled: !!owner && !!repo,
  })

  const starMutation = useMutation({
    mutationFn: () => starRepository(owner, repo),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['repo', owner, repo] }),
  })
  const unstarMutation = useMutation({
    mutationFn: () => unstarRepository(owner, repo),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['repo', owner, repo] }),
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (error || !repository) {
    return (
      <ErrorState
        message={getErrorMessage(error) || 'Repository not found'}
        onRetry={() => refetch()}
      />
    )
  }

  const tabs = [
    { to: `/${owner}/${repo}`, label: 'Code', icon: Code2, end: true },
    { to: `/${owner}/${repo}/issues`, label: 'Issues', icon: CircleDot, count: repository.open_issues_count },
    { to: `/${owner}/${repo}/pulls`, label: 'Pull requests', icon: GitPullRequest },
    { to: `/${owner}/${repo}/settings`, label: 'Settings', icon: Settings },
  ]

  return (
    <div>
      {/* Repo header */}
      <div className="border-b border-[var(--color-border-default)] bg-[var(--color-canvas-subtle)]">
        <div className="max-w-[1280px] mx-auto px-4 pt-4">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div>
              <h1 className="text-xl font-semibold flex flex-wrap items-center gap-2">
                <Link to={`/${owner}`} className="text-[var(--color-accent-fg)]">
                  {owner}
                </Link>
                <span className="text-[var(--color-fg-muted)]">/</span>
                <Link to={`/${owner}/${repo}`} className="text-[var(--color-accent-fg)]">
                  {repo}
                </Link>
                <Badge variant={repository.visibility === 'private' ? 'attention' : 'default'}>
                  {repository.visibility}
                </Badge>
              </h1>
              {repository.description && (
                <p className="text-sm text-[var(--color-fg-muted)] mt-1">{repository.description}</p>
              )}
              {repository.topics && repository.topics.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {repository.topics.map((t) => (
                    <Badge key={t} className="bg-[var(--color-accent-emphasis)]/10 text-[var(--color-accent-fg)]">
                      {t}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm">
                <Eye size={14} /> Watch
                <Badge variant="counter" className="ml-1">
                  {repository.watchers_count}
                </Badge>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => starMutation.mutate()}
                loading={starMutation.isPending}
              >
                <Star size={14} /> Star
                <Badge variant="counter" className="ml-1">
                  {repository.stars_count}
                </Badge>
              </Button>
              <Button variant="outline" size="sm">
                <GitFork size={14} /> Fork
                <Badge variant="counter" className="ml-1">
                  {repository.forks_count}
                </Badge>
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <nav className="flex gap-1 overflow-x-auto -mb-px" aria-label="Repository">
            {tabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.end}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 border-transparent no-underline text-[var(--color-fg-default)] hover:no-underline whitespace-nowrap',
                    isActive
                      ? 'border-[var(--color-danger-emphasis)] font-semibold'
                      : 'hover:border-[var(--color-border-default)]'
                  )
                }
              >
                <tab.icon size={16} />
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <Badge variant="counter">{tab.count}</Badge>
                )}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>

      <Outlet context={{ repository }} />
    </div>
  )
}

export function RepoCodePage() {
  const { owner = '', repo = '' } = useParams()
  const [searchParams] = useSearchParams()
  const path = searchParams.get('path') || ''
  const ref = searchParams.get('ref') || ''

  const { data: repository } = useQuery({
    queryKey: ['repo', owner, repo],
    queryFn: () => getRepository(owner, repo),
  })

  const branch = ref || repository?.default_branch || 'main'

  const { data: branches } = useQuery({
    queryKey: ['branches', owner, repo],
    queryFn: () => listBranches(owner, repo),
    enabled: !!owner && !!repo,
  })

  const { data: commits } = useQuery({
    queryKey: ['commits', owner, repo, branch],
    queryFn: () => listCommits(owner, repo, branch),
    enabled: !!owner && !!repo,
  })

  const { data: contents, isLoading, error } = useQuery({
    queryKey: ['contents', owner, repo, path, branch],
    queryFn: () => getContents(owner, repo, path, branch),
    enabled: !!owner && !!repo,
  })

  const latestCommit = commits?.[0]

  // Clone URL
  const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/api\/v1\/?$/, '')
  const cloneUrl = `${apiBase || window.location.origin}/${owner}/${repo}.git`

  return (
    <div className="max-w-[1280px] mx-auto px-4 py-4">
      {/* Branch + clone */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Button variant="outline" size="sm" className="gap-1">
          <GitBranch size={14} />
          {branch}
        </Button>
        <div className="flex-1" />
        <div className="flex items-center gap-1 border border-[var(--color-border-default)] rounded-md overflow-hidden text-xs">
          <span className="px-2 py-1.5 bg-[var(--color-canvas-subtle)] border-r border-[var(--color-border-default)] font-medium">
            HTTPS
          </span>
          <input
            readOnly
            value={cloneUrl}
            className="px-2 py-1.5 bg-transparent min-w-[200px] max-w-[320px] text-[var(--color-fg-default)] outline-none"
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
        </div>
        <Link to={`/${owner}/${repo}/commits`}>
          <Button variant="outline" size="sm">
            <GitCommit size={14} />
            {commits?.length ?? '—'} Commits
          </Button>
        </Link>
        <Link to={`/${owner}/${repo}/branches`}>
          <Button variant="outline" size="sm">
            <GitBranch size={14} />
            {branches?.length ?? '—'} Branches
          </Button>
        </Link>
      </div>

      {/* Breadcrumb */}
      {path && (
        <div className="flex items-center gap-1 text-sm mb-3 flex-wrap">
          <Link to={`/${owner}/${repo}`} className="font-semibold text-[var(--color-accent-fg)]">
            {repo}
          </Link>
          {path.split('/').map((seg, i, arr) => {
            const sub = arr.slice(0, i + 1).join('/')
            return (
              <span key={sub} className="flex items-center gap-1">
                <ChevronRight size={14} className="text-[var(--color-fg-muted)]" />
                {i === arr.length - 1 ? (
                  <span className="font-semibold">{seg}</span>
                ) : (
                  <Link
                    to={`/${owner}/${repo}?path=${encodeURIComponent(sub)}`}
                    className="text-[var(--color-accent-fg)]"
                  >
                    {seg}
                  </Link>
                )}
              </span>
            )
          })}
        </div>
      )}

      {/* Latest commit bar */}
      {latestCommit && (
        <div className="border border-[var(--color-border-default)] rounded-t-md px-3 py-2 flex flex-wrap items-center gap-2 text-sm bg-[var(--color-canvas-subtle)]">
          <span className="font-semibold">{latestCommit.author}</span>
          <span className="text-[var(--color-fg-muted)] truncate flex-1">{latestCommit.subject}</span>
          <Link
            to={`/${owner}/${repo}/commit/${latestCommit.sha}`}
            className="font-mono text-xs text-[var(--color-fg-muted)] hover:text-[var(--color-accent-fg)]"
          >
            {latestCommit.sha.slice(0, 7)}
          </Link>
          <span className="text-xs text-[var(--color-fg-muted)]">
            {formatDistanceToNow(new Date(Number(latestCommit.date) * 1000), { addSuffix: true })}
          </span>
        </div>
      )}

      {/* File tree / content */}
      <div
        className={cn(
          'border border-[var(--color-border-default)] rounded-b-md overflow-hidden',
          !latestCommit && 'rounded-md'
        )}
      >
        {isLoading && (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        )}
        {error && (
          <EmptyState
            title="This repository is empty"
            description="Push code to get started, or create files using the API."
          />
        )}
        {contents?.type === 'dir' && contents.entries && (
          <ul className="divide-y divide-[var(--color-border-muted)]">
            {contents.entries
              .slice()
              .sort((a, b) => {
                if (a.type === b.type) return a.path.localeCompare(b.path)
                return a.type === 'tree' ? -1 : 1
              })
              .map((entry) => {
                const name = entry.path.includes('/')
                  ? entry.path.slice(entry.path.lastIndexOf('/') + 1)
                  : entry.path
                const isDir = entry.type === 'tree'
                const href = isDir
                  ? `/${owner}/${repo}?path=${encodeURIComponent(entry.path)}`
                  : `/${owner}/${repo}/blob/${branch}/${entry.path}`
                return (
                  <li key={entry.path}>
                    <Link
                      to={href}
                      className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-[var(--color-canvas-subtle)] no-underline text-[var(--color-fg-default)] hover:no-underline"
                    >
                      {isDir ? (
                        <Folder size={16} className="text-[var(--color-accent-fg)] shrink-0" />
                      ) : (
                        <File size={16} className="text-[var(--color-fg-muted)] shrink-0" />
                      )}
                      <span className={cn(isDir && 'font-medium')}>{name}</span>
                    </Link>
                  </li>
                )
              })}
          </ul>
        )}
        {contents?.type === 'file' && (
          <pre className="p-4 text-xs overflow-x-auto font-mono whitespace-pre bg-[var(--color-canvas-default)]">
            {contents.content}
          </pre>
        )}
      </div>
    </div>
  )
}

// Placeholder tab pages
export function RepoIssuesPage() {
  const { owner = '', repo = '' } = useParams()
  return (
    <div className="max-w-[1280px] mx-auto px-4 py-6">
      <div className="flex justify-between mb-4">
        <h2 className="text-lg font-semibold">Issues</h2>
        <Button variant="primary" size="sm" disabled title="Coming when backend supports create">
          New issue
        </Button>
      </div>
      <EmptyState
        title="No issues"
        description={`Issues for ${owner}/${repo} will appear here once created via the API.`}
      />
    </div>
  )
}

export function RepoPullsPage() {
  return (
    <div className="max-w-[1280px] mx-auto px-4 py-6">
      <EmptyState title="No pull requests" description="Pull requests will appear here." />
    </div>
  )
}

export function RepoSettingsPage() {
  const { owner = '', repo = '' } = useParams()
  const { data: repository } = useQuery({
    queryKey: ['repo', owner, repo],
    queryFn: () => getRepository(owner, repo),
  })

  return (
    <div className="max-w-[768px] mx-auto px-4 py-6">
      <h2 className="text-xl font-semibold mb-4">Settings</h2>
      <section className="border border-[var(--color-border-default)] rounded-md p-4 mb-6">
        <h3 className="font-semibold mb-2">General</h3>
        <dl className="text-sm space-y-2">
          <div>
            <dt className="text-[var(--color-fg-muted)]">Name</dt>
            <dd className="font-medium">{repository?.name}</dd>
          </div>
          <div>
            <dt className="text-[var(--color-fg-muted)]">Visibility</dt>
            <dd className="font-medium">{repository?.visibility}</dd>
          </div>
          <div>
            <dt className="text-[var(--color-fg-muted)]">Default branch</dt>
            <dd className="font-medium">{repository?.default_branch}</dd>
          </div>
        </dl>
      </section>
      <section className="border border-[var(--color-danger-emphasis)] rounded-md p-4">
        <h3 className="font-semibold text-[var(--color-danger-fg)] mb-2">Danger Zone</h3>
        <p className="text-sm text-[var(--color-fg-muted)] mb-3">
          Delete this repository. This action cannot be undone.
        </p>
        <Button variant="danger" size="sm" disabled>
          Delete this repository
        </Button>
      </section>
    </div>
  )
}

export function RepoCommitsPage() {
  const { owner = '', repo = '' } = useParams()
  const { data: commits, isLoading, error } = useQuery({
    queryKey: ['commits', owner, repo],
    queryFn: () => listCommits(owner, repo),
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    )
  }
  if (error) {
    return <ErrorState message={getErrorMessage(error)} />
  }

  return (
    <div className="max-w-[1280px] mx-auto px-4 py-4">
      <h2 className="text-lg font-semibold mb-4">Commits</h2>
      <ul className="border border-[var(--color-border-default)] rounded-md divide-y divide-[var(--color-border-muted)]">
        {commits?.map((c) => (
          <li key={c.sha} className="px-4 py-3 flex flex-wrap items-center gap-3 text-sm">
            <div className="flex-1 min-w-0">
              <Link
                to={`/${owner}/${repo}/commit/${c.sha}`}
                className="font-medium text-[var(--color-fg-default)] hover:text-[var(--color-accent-fg)] no-underline"
              >
                {c.subject}
              </Link>
              <div className="text-xs text-[var(--color-fg-muted)] mt-0.5">
                {c.author} committed{' '}
                {formatDistanceToNow(new Date(Number(c.date) * 1000), { addSuffix: true })}
              </div>
            </div>
            <code className="text-xs font-mono text-[var(--color-fg-muted)]">{c.sha.slice(0, 7)}</code>
          </li>
        ))}
        {(!commits || commits.length === 0) && (
          <EmptyState title="No commits yet" />
        )}
      </ul>
    </div>
  )
}

void Tag
void unstarRepository
