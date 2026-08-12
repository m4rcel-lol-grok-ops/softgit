import { useSearchParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { search } from '@/api/repositories'
import { Spinner, EmptyState } from '@/components/ui'

export function SearchPage() {
  const [params] = useSearchParams()
  const q = params.get('q') || ''

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['search', q],
    queryFn: () => search(q),
    enabled: q.length > 0,
  })

  return (
    <div className="max-w-[1280px] mx-auto px-4 py-6">
      <h1 className="text-xl font-semibold mb-4">
        {q ? (
          <>
            Search results for <span className="text-[var(--color-accent-fg)]">{q}</span>
          </>
        ) : (
          'Search SoftGit'
        )}
      </h1>

      {(isLoading || isFetching) && (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      )}

      {!q && (
        <EmptyState title="Enter a search query" description="Search for repositories and users." />
      )}

      {q && data && !isLoading && (
        <div className="space-y-6">
          <section>
            <h2 className="text-sm font-semibold text-[var(--color-fg-muted)] mb-2 uppercase tracking-wide">
              Repositories
            </h2>
            {(!data.repositories || data.repositories.length === 0) && (
              <p className="text-sm text-[var(--color-fg-muted)]">No repositories found.</p>
            )}
          </section>
          <section>
            <h2 className="text-sm font-semibold text-[var(--color-fg-muted)] mb-2 uppercase tracking-wide">
              Users
            </h2>
            {(!data.users || data.users.length === 0) && (
              <p className="text-sm text-[var(--color-fg-muted)]">No users found.</p>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
