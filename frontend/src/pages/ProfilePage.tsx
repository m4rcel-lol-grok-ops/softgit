import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getUser } from '@/api/repositories'
import { Avatar, Spinner, ErrorState, Badge } from '@/components/ui'
import { getErrorMessage } from '@/api/client'
import { MapPin, Link as LinkIcon, Calendar } from 'lucide-react'
import { format } from 'date-fns'

export function ProfilePage() {
  const { username = '' } = useParams()
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['user', username],
    queryFn: () => getUser(username),
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

  return (
    <div className="max-w-[1280px] mx-auto px-4 py-6">
      <div className="grid md:grid-cols-[280px_1fr] gap-8">
        <aside>
          <Avatar name={user.username} src={user.avatar_url} size={260} className="rounded-full w-full max-w-[260px] aspect-square mb-4" />
          <h1 className="text-2xl font-semibold leading-tight">{user.display_name || user.username}</h1>
          <p className="text-xl text-[var(--color-fg-muted)] font-light mb-3">{user.username}</p>
          {user.bio && <p className="text-sm mb-3">{user.bio}</p>}
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
        <div>
          <h2 className="text-base font-semibold mb-3 border-b border-[var(--color-border-default)] pb-2">
            Repositories
          </h2>
          <p className="text-sm text-[var(--color-fg-muted)]">
            Public repositories will appear here. Create one from the{' '}
            <Link to="/new">New repository</Link> page.
          </p>
        </div>
      </div>
    </div>
  )
}
