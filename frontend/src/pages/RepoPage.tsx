import { useState } from 'react'
import { Link, useParams, useSearchParams, NavLink, Outlet } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getRepository,
  listBranches,
  listCommits,
  getContents,
  starRepository,
  unstarRepository,
  isStarred,
  listIssues,
  createIssue,
  updateIssue,
  listReleases,
  createRelease,
} from '@/api/repositories'
import { Badge, Button, Spinner, ErrorState, EmptyState, Input, Textarea } from '@/components/ui'
import { getErrorMessage } from '@/api/client'
import { useAuth } from '@/hooks/useAuth'
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
import { Markdown } from '@/components/Markdown'
import { VerifiedBadge, VerifiedCommitBadge } from '@/components/VerifiedBadge'

export function RepoLayout() {
  const { owner = '', repo = '' } = useParams()
  const queryClient = useQueryClient()

  const { isAuthenticated } = useAuth()
  const { data: repository, isLoading, error, refetch } = useQuery({
    queryKey: ['repo', owner, repo],
    queryFn: () => getRepository(owner, repo),
    enabled: !!owner && !!repo,
  })
  const { data: starred } = useQuery({
    queryKey: ['starred', owner, repo],
    queryFn: () => isStarred(owner, repo),
    enabled: isAuthenticated && !!owner && !!repo,
  })
  const starMutation = useMutation({
    mutationFn: async () => {
      if (starred) await unstarRepository(owner, repo)
      else await starRepository(owner, repo)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repo', owner, repo] })
      queryClient.invalidateQueries({ queryKey: ['starred', owner, repo] })
    },
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
    { to: `/${owner}/${repo}/releases`, label: 'Releases', icon: Tag },
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
                variant={starred ? 'primary' : 'outline'}
                size="sm"
                disabled={!isAuthenticated}
                onClick={() => starMutation.mutate()}
                loading={starMutation.isPending}
              >
                <Star size={14} /> {starred ? 'Starred' : 'Star'}
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
          <button
            type="button"
            className="px-2 py-1.5 border-l border-[var(--color-border-default)] hover:bg-[var(--color-canvas-subtle)] font-medium"
            onClick={() => navigator.clipboard?.writeText(cloneUrl)}
            title="Copy clone URL"
          >
            Copy
          </button>
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

      {/* Root README */}
      {!path && contents?.type === 'dir' && (
        <RepoReadme owner={owner} repo={repo} branch={branch} entries={contents.entries || []} />
      )}
    </div>
  )
}

function RepoReadme({
  owner,
  repo,
  branch,
  entries,
}: {
  owner: string
  repo: string
  branch: string
  entries: { path: string; type: string }[]
}) {
  const readmeEntry = entries.find((e) => {
    const name = e.path.includes('/') ? e.path.slice(e.path.lastIndexOf('/') + 1) : e.path
    return /^readme\.(md|markdown|txt)$/i.test(name)
  })
  const { data } = useQuery({
    queryKey: ['readme', owner, repo, branch, readmeEntry?.path],
    queryFn: () => getContents(owner, repo, readmeEntry!.path, branch),
    enabled: !!readmeEntry,
  })
  if (!readmeEntry || !data?.content) return null
  return (
    <div className="mt-4 border border-[var(--color-border-default)] rounded-md overflow-hidden">
      <div className="px-4 py-2 border-b border-[var(--color-border-default)] bg-[var(--color-canvas-subtle)] text-sm font-semibold">
        {readmeEntry.path}
      </div>
      <div className="px-4 py-4">
        {/\.md$/i.test(readmeEntry.path) ? (
          <Markdown content={data.content} />
        ) : (
          <pre className="text-xs whitespace-pre-wrap font-mono">{data.content}</pre>
        )}
      </div>
    </div>
  )
}

// Placeholder tab pages
export function RepoIssuesPage() {
  const { owner = '', repo = '' } = useParams()
  const { isAuthenticated } = useAuth()
  const [state, setState] = useState<'open' | 'closed' | 'all'>('open')
  const [showNew, setShowNew] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const qc = useQueryClient()
  const { data: issues, isLoading } = useQuery({
    queryKey: ['issues', owner, repo, state],
    queryFn: () => listIssues(owner, repo, state),
  })
  const createMut = useMutation({
    mutationFn: () => createIssue(owner, repo, { title, body }),
    onSuccess: () => {
      setShowNew(false)
      setTitle('')
      setBody('')
      qc.invalidateQueries({ queryKey: ['issues', owner, repo] })
      qc.invalidateQueries({ queryKey: ['repo', owner, repo] })
    },
  })
  const closeMut = useMutation({
    mutationFn: (n: number) => updateIssue(owner, repo, n, { state: 'closed' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['issues', owner, repo] })
      qc.invalidateQueries({ queryKey: ['repo', owner, repo] })
    },
  })

  return (
    <div className="max-w-[1280px] mx-auto px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex gap-1 text-sm">
          {(['open', 'closed', 'all'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setState(s)}
              className={
                state === s
                  ? 'px-3 py-1 rounded-full bg-[var(--color-canvas-subtle)] font-semibold'
                  : 'px-3 py-1 rounded-full text-[var(--color-fg-muted)]'
              }
            >
              {s[0].toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        {isAuthenticated && (
          <Button variant="primary" size="sm" onClick={() => setShowNew((v) => !v)}>
            New issue
          </Button>
        )}
      </div>
      {showNew && (
        <div className="border border-[var(--color-border-default)] rounded-md p-4 mb-4 space-y-3 max-w-xl">
          <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea placeholder="Leave a comment" value={body} onChange={(e) => setBody(e.target.value)} />
          <Button
            variant="primary"
            size="sm"
            loading={createMut.isPending}
            disabled={!title.trim()}
            onClick={() => createMut.mutate()}
          >
            Submit new issue
          </Button>
        </div>
      )}
      {isLoading && (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      )}
      <ul className="border border-[var(--color-border-default)] rounded-md divide-y divide-[var(--color-border-muted)]">
        {(issues || []).map((issue) => (
          <li key={issue.number} className="px-4 py-3 flex flex-wrap items-start gap-3 text-sm">
            <CircleDot
              size={16}
              className={
                issue.state === 'open'
                  ? 'text-[var(--color-success-fg)] mt-0.5'
                  : 'text-[var(--color-danger-fg)] mt-0.5'
              }
            />
            <div className="flex-1 min-w-0">
              <div className="font-semibold">{issue.title}</div>
              <div className="text-xs text-[var(--color-fg-muted)] mt-0.5">
                #{issue.number} opened by {issue.author?.username}
                {issue.author?.is_verified && (
                  <VerifiedBadge size={12} className="inline-block ml-0.5 align-text-bottom" />
                )}
              </div>
              {issue.body && (
                <p className="text-xs text-[var(--color-fg-muted)] mt-1 line-clamp-2">{issue.body}</p>
              )}
            </div>
            {issue.state === 'open' && isAuthenticated && (
              <Button size="sm" variant="outline" onClick={() => closeMut.mutate(issue.number)}>
                Close
              </Button>
            )}
          </li>
        ))}
        {!isLoading && (!issues || issues.length === 0) && (
          <li className="px-4 py-10 text-center text-[var(--color-fg-muted)]">No issues found.</li>
        )}
      </ul>
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
                {c.author}
                {c.verified && (
                  <>
                    {' '}
                    <VerifiedBadge size={12} className="inline-block align-text-bottom" />
                  </>
                )}{' '}
                committed{' '}
                {formatDistanceToNow(new Date(Number(c.date) * 1000), { addSuffix: true })}
              </div>
            </div>
            {c.verified && <VerifiedCommitBadge size={14} />}
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


export function RepoReleasesPage() {
  const { owner = '', repo = '' } = useParams()
  const { isAuthenticated, user } = useAuth()
  const [showNew, setShowNew] = useState(false)
  const [tag, setTag] = useState('')
  const [name, setName] = useState('')
  const [body, setBody] = useState('')
  const qc = useQueryClient()
  const { data: releases, isLoading } = useQuery({
    queryKey: ['releases', owner, repo],
    queryFn: () => listReleases(owner, repo),
  })
  const createMut = useMutation({
    mutationFn: () => createRelease(owner, repo, { tag_name: tag, name: name || tag, body }),
    onSuccess: () => {
      setShowNew(false)
      setTag('')
      setName('')
      setBody('')
      qc.invalidateQueries({ queryKey: ['releases', owner, repo] })
    },
  })

  return (
    <div className="max-w-[1280px] mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Releases</h2>
        {isAuthenticated && user?.username === owner && (
          <Button variant="primary" size="sm" onClick={() => setShowNew((v) => !v)}>
            Draft a new release
          </Button>
        )}
      </div>
      {showNew && (
        <div className="border border-[var(--color-border-default)] rounded-md p-4 mb-4 space-y-3 max-w-xl">
          <Input placeholder="Tag version (e.g. v1.0.0)" value={tag} onChange={(e) => setTag(e.target.value)} />
          <Input placeholder="Release title" value={name} onChange={(e) => setName(e.target.value)} />
          <Textarea placeholder="Describe this release" value={body} onChange={(e) => setBody(e.target.value)} />
          <Button
            variant="primary"
            size="sm"
            loading={createMut.isPending}
            disabled={!tag.trim()}
            onClick={() => createMut.mutate()}
          >
            Publish release
          </Button>
        </div>
      )}
      {isLoading && (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      )}
      <ul className="space-y-4">
        {(releases || []).map((rel) => (
          <li key={rel.id} className="border border-[var(--color-border-default)] rounded-md p-4">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-lg font-semibold">{rel.name || rel.tag_name}</span>
              <code className="text-xs bg-[var(--color-canvas-subtle)] px-1.5 py-0.5 rounded">{rel.tag_name}</code>
              {(rel.verified || rel.author?.is_verified) && <VerifiedCommitBadge size={14} />}
            </div>
            <div className="text-xs text-[var(--color-fg-muted)] mb-2">
              {rel.author?.username}
              {rel.author?.is_verified && (
                <VerifiedBadge size={12} className="inline-block ml-0.5 align-text-bottom" />
              )}
            </div>
            {rel.body && <div className="text-sm whitespace-pre-wrap">{rel.body}</div>}
          </li>
        ))}
        {!isLoading && (!releases || releases.length === 0) && (
          <EmptyState
            title="No releases yet"
            description={`When ${owner}/${repo} publishes a release, it will appear here.`}
          />
        )}
      </ul>
    </div>
  )
}
