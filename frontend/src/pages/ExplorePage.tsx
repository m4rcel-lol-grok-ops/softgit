import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { exploreRepos } from '@/api/repositories'
import { Spinner, Badge } from '@/components/ui'
import { Star, BookMarked } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export function ExplorePage() {
  const { data: repos, isLoading } = useQuery({
    queryKey: ['explore'],
    queryFn: exploreRepos,
  })

  return (
    <div className="max-w-[1280px] mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold mb-1">Explore</h1>
      <p className="text-sm text-[var(--color-fg-muted)] mb-6">
        Discover public repositories on this SoftGit instance.
      </p>
      {isLoading && (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      )}
      <ul className="space-y-3">
        {(repos || []).map((r) => (
          <li
            key={r.full_name}
            className="border border-[var(--color-border-default)] rounded-md p-4 hover:border-[var(--color-fg-muted)]"
          >
            <div className="flex items-start gap-2">
              <BookMarked size={16} className="mt-1 text-[var(--color-fg-muted)] shrink-0" />
              <div className="min-w-0 flex-1">
                <Link
                  to={`/${r.owner_name}/${r.name}`}
                  className="font-semibold text-[var(--color-accent-fg)] hover:underline"
                >
                  {r.full_name}
                </Link>
                {r.description && (
                  <p className="text-sm text-[var(--color-fg-muted)] mt-1">{r.description}</p>
                )}
                <div className="flex flex-wrap gap-3 mt-2 text-xs text-[var(--color-fg-muted)]">
                  <span className="inline-flex items-center gap-1">
                    <Star size={12} /> {r.stars_count}
                  </span>
                  {r.updated_at && (
                    <span>Updated {formatDistanceToNow(new Date(r.updated_at), { addSuffix: true })}</span>
                  )}
                  <Badge>public</Badge>
                </div>
              </div>
            </div>
          </li>
        ))}
        {!isLoading && (!repos || repos.length === 0) && (
          <li className="text-sm text-[var(--color-fg-muted)] py-8 text-center">
            No public repositories yet. Create one and make it public to appear here.
          </li>
        )}
      </ul>
    </div>
  )
}
