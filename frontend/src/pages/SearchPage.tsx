import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { searchAll } from '@/api/repositories'
import { Spinner, Avatar } from '@/components/ui'
import { VerifiedBadge } from '@/components/VerifiedBadge'
import { resolveAvatarUrl } from '@/utils/avatar'
import { Star } from 'lucide-react'

export function SearchPage() {
  const [params] = useSearchParams()
  const q = params.get('q') || ''
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['search', q],
    queryFn: () => searchAll(q),
    enabled: q.length > 0,
  })

  return (
    <div className="max-w-[960px] mx-auto px-4 py-6">
      <h1 className="text-xl font-semibold mb-4">
        {q ? (
          <>
            Search results for <span className="text-[var(--color-accent-fg)]">&quot;{q}&quot;</span>
          </>
        ) : (
          'Search'
        )}
      </h1>
      {!q && (
        <p className="text-sm text-[var(--color-fg-muted)]">
          Type a query in the header search box to find users and repositories.
        </p>
      )}
      {(isLoading || isFetching) && q && (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      )}
      {data && (
        <div className="space-y-8">
          <section>
            <h2 className="text-sm font-semibold text-[var(--color-fg-muted)] mb-3 uppercase tracking-wide">
              Users · {data.users.length}
            </h2>
            <ul className="space-y-2">
              {data.users.map((u) => (
                <li key={u.username}>
                  <Link
                    to={`/${u.username}`}
                    className="flex items-center gap-3 p-3 border border-[var(--color-border-default)] rounded-md no-underline text-[var(--color-fg-default)] hover:bg-[var(--color-canvas-subtle)] hover:no-underline"
                  >
                    <Avatar name={u.username} src={resolveAvatarUrl(u.avatar_url)} size={32} />
                    <span className="font-semibold inline-flex items-center gap-1">
                      {u.display_name || u.username}
                      {u.is_verified && <VerifiedBadge size={14} />}
                    </span>
                    <span className="text-sm text-[var(--color-fg-muted)]">{u.username}</span>
                  </Link>
                </li>
              ))}
              {data.users.length === 0 && (
                <li className="text-sm text-[var(--color-fg-muted)]">No users found.</li>
              )}
            </ul>
          </section>
          <section>
            <h2 className="text-sm font-semibold text-[var(--color-fg-muted)] mb-3 uppercase tracking-wide">
              Repositories · {data.repositories.length}
            </h2>
            <ul className="space-y-2">
              {data.repositories.map((r) => (
                <li key={r.full_name}>
                  <Link
                    to={`/${r.owner_name}/${r.name}`}
                    className="block p-3 border border-[var(--color-border-default)] rounded-md no-underline hover:bg-[var(--color-canvas-subtle)] hover:no-underline"
                  >
                    <span className="font-semibold text-[var(--color-accent-fg)]">{r.full_name}</span>
                    {r.description && (
                      <p className="text-sm text-[var(--color-fg-muted)] mt-1">{r.description}</p>
                    )}
                    <span className="text-xs text-[var(--color-fg-muted)] inline-flex items-center gap-1 mt-1">
                      <Star size={12} /> {r.stars_count}
                    </span>
                  </Link>
                </li>
              ))}
              {data.repositories.length === 0 && (
                <li className="text-sm text-[var(--color-fg-muted)]">No repositories found.</li>
              )}
            </ul>
          </section>
        </div>
      )}
    </div>
  )
}
