import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getUser, listUserRepos, getProfileReadme } from '@/api/repositories'
import { Avatar, Spinner, ErrorState, Badge } from '@/components/ui'
import { Markdown } from '@/components/Markdown'
import { getErrorMessage } from '@/api/client'
import { resolveAvatarUrl } from '@/utils/avatar'
import { MapPin, Link as LinkIcon, Calendar, BookMarked, Lock, Star } from 'lucide-react'
import { VerifiedBadge } from '@/components/VerifiedBadge'
import { format, formatDistanceToNow } from 'date-fns'
import { useAuth } from '@/hooks/useAuth'

export function ProfilePage() {
  const { username = '' } = useParams()
  const { user: me } = useAuth()
  const isSelf = me?.username?.toLowerCase() === username.toLowerCase()

  const { data: user, isLoading, error } = useQuery({
    queryKey: ['user', username],
    queryFn: () => getUser(username),
    enabled: !!username,
  })

  const { data: repos, isLoading: reposLoading } = useQuery({
    queryKey: ['user-repos', username],
    queryFn: () => listUserRepos(username),
    enabled: !!username,
  })

  const { data: profileReadme } = useQuery({
    queryKey: ['profile-readme', username],
    queryFn: () => getProfileReadme(username),
    enabled: !!username,
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }
  if (error || !user) {
    return <ErrorState message={getErrorMessage(error) || 'User not found'} />
  }

  // Exclude the special profile repo from the main list (still shown via README)
  const listedRepos = (repos || []).filter((r) => r.name.toLowerCase() !== username.toLowerCase())

  return (
    <div className="max-w-[1280px] mx-auto px-4 py-6">
      <div className="grid md:grid-cols-[280px_1fr] gap-8">
        <aside>
          <Avatar
            name={user.username}
            src={resolveAvatarUrl(user.avatar_url)}
            size={260}
            className="rounded-full w-full max-w-[260px] aspect-square mb-4 border border-[var(--color-border-default)]"
          />
          <h1 className="text-2xl font-semibold leading-tight inline-flex items-center gap-1.5 flex-wrap">
            {user.display_name || user.username}
            {user.is_verified && <VerifiedBadge size={20} />}
          </h1>
          <p className="text-xl text-[var(--color-fg-muted)] font-light mb-3">{user.username}</p>
          {user.bio && <p className="text-sm mb-3 whitespace-pre-wrap">{user.bio}</p>}
          {isSelf && (
            <Link
              to="/settings/profile"
              className="inline-flex mb-3 px-3 py-1 text-sm font-medium rounded-md border border-[var(--color-border-default)] bg-[var(--color-btn-bg)] hover:bg-[var(--color-canvas-subtle)] no-underline text-[var(--color-fg-default)]"
            >
              Edit profile
            </Link>
          )}
          <ul className="text-sm space-y-1.5 text-[var(--color-fg-default)]">
            {user.location && (
              <li className="flex items-center gap-2">
                <MapPin size={16} className="text-[var(--color-fg-muted)]" />
                {user.location}
              </li>
            )}
            {user.website && (
              <li className="flex items-center gap-2">
                <LinkIcon size={16} className="text-[var(--color-fg-muted)]" />
                <a href={user.website} target="_blank" rel="noopener noreferrer">
                  {user.website.replace(/^https?:\/\//, '')}
                </a>
              </li>
            )}
            <li className="flex items-center gap-2">
              <Calendar size={16} className="text-[var(--color-fg-muted)]" />
              Joined {format(new Date(user.created_at), 'MMM d, yyyy')}
            </li>
          </ul>
          {user.is_admin && (
            <Badge variant="attention" className="mt-3">
              Administrator
            </Badge>
          )}
        </aside>

        <div className="min-w-0 space-y-6">
          {/* Profile README (GitHub-style: username/username) */}
          {profileReadme && (
            <div className="border border-[var(--color-border-default)] rounded-md overflow-hidden">
              <div className="px-4 py-2 border-b border-[var(--color-border-default)] bg-[var(--color-canvas-subtle)] text-xs text-[var(--color-fg-muted)] flex items-center gap-2">
                <BookMarked size={14} />
                <Link to={`/${username}/${username}`} className="font-semibold text-[var(--color-accent-fg)]">
                  {profileReadme.repo}
                </Link>
                <span>/</span>
                <span>{profileReadme.name}</span>
              </div>
              <div className="px-4 py-4">
                <Markdown content={profileReadme.content} />
              </div>
            </div>
          )}

          {!profileReadme && isSelf && (
            <div className="border border-dashed border-[var(--color-border-default)] rounded-md p-4 text-sm text-[var(--color-fg-muted)]">
              <p className="font-semibold text-[var(--color-fg-default)] mb-1">Showcase a profile README</p>
              <p className="mb-2">
                Create a public repository named <code className="text-xs bg-[var(--color-canvas-subtle)] px-1 rounded">{username}</code>{' '}
                (same as your username) and add a <code className="text-xs bg-[var(--color-canvas-subtle)] px-1 rounded">README.md</code>.
                It will appear here — just like on GitHub.
              </p>
              <Link to="/new" className="text-[var(--color-accent-fg)] font-medium">
                Create repository →
              </Link>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-3 border-b border-[var(--color-border-default)] pb-2">
              <h2 className="text-base font-semibold">
                Repositories{' '}
                <span className="text-[var(--color-fg-muted)] font-normal text-sm">
                  {listedRepos.length}
                </span>
              </h2>
            </div>

            {reposLoading && (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            )}

            {!reposLoading && listedRepos.length === 0 && (
              <p className="text-sm text-[var(--color-fg-muted)]">
                {isSelf ? (
                  <>
                    You don&apos;t have any public repositories yet.{' '}
                    <Link to="/new">Create one</Link>.
                  </>
                ) : (
                  'No public repositories yet.'
                )}
              </p>
            )}

            <ul className="space-y-3">
              {listedRepos.map((repo) => (
                <li
                  key={repo.id}
                  className="border border-[var(--color-border-default)] rounded-md p-4 hover:border-[var(--color-fg-muted)] transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          to={`/${repo.owner_name}/${repo.name}`}
                          className="text-[var(--color-accent-fg)] font-semibold text-base hover:underline"
                        >
                          {repo.name}
                        </Link>
                        <Badge variant={repo.visibility === 'private' ? 'attention' : 'default'}>
                          {repo.visibility === 'private' ? (
                            <span className="inline-flex items-center gap-1">
                              <Lock size={10} /> private
                            </span>
                          ) : (
                            repo.visibility
                          )}
                        </Badge>
                      </div>
                      {repo.description && (
                        <p className="text-sm text-[var(--color-fg-muted)] mt-1 line-clamp-2">
                          {repo.description}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-[var(--color-fg-muted)]">
                        <span className="inline-flex items-center gap-1">
                          <Star size={12} /> {repo.stars_count}
                        </span>
                        {repo.updated_at && (
                          <span>
                            Updated{' '}
                            {formatDistanceToNow(new Date(repo.updated_at), { addSuffix: true })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
