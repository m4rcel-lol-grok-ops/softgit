import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Button, EmptyState } from '@/components/ui'
import { BookMarked, Plus } from 'lucide-react'

export function DashboardPage() {
  const { user, isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-semibold mb-3">Where software is built</h1>
        <p className="text-[var(--color-fg-muted)] mb-6 max-w-lg mx-auto">
          SoftGit is a self-hosted Git hosting platform. Sign in to manage repositories, issues, and pull requests.
        </p>
        <div className="flex gap-3 justify-center">
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
              Top repositories
            </div>
            <EmptyState
              title="No repositories yet"
              description="Create your first repository to get started with SoftGit."
              action={
                <Link to="/new">
                  <Button variant="primary" size="sm">
                    Create repository
                  </Button>
                </Link>
              }
            />
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
              Get started by creating a repository or exploring public projects.
            </p>
            <div className="flex flex-col gap-2">
              <Link to="/new">
                <Button variant="outline" size="sm" className="w-full">
                  Create repository
                </Button>
              </Link>
              <Link to="/explore">
                <Button variant="ghost" size="sm" className="w-full">
                  Explore
                </Button>
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
