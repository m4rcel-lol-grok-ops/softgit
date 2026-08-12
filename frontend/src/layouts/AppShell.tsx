import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Avatar, Button } from '@/components/ui'
import { resolveAvatarUrl } from '@/utils/avatar'
import {
  Bell,
  BookMarked,
  ChevronDown,
  GitPullRequest,
  LogOut,
  Menu,
  Moon,
  Plus,
  Search,
  Settings,
  Sun,
  User,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/utils/cn'

export function AppShell() {
  const { user, isAuthenticated, logout, isLoading } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => {
    return (localStorage.getItem('softgit_theme') as 'light' | 'dark' | 'system') || 'system'
  })

  useEffect(() => {
    const root = document.documentElement
    const preferDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const dark = theme === 'dark' || (theme === 'system' && preferDark)
    root.classList.toggle('dark', dark)
    localStorage.setItem('softgit_theme', theme)
  }, [theme])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-canvas-default)]">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[var(--color-border-default)] bg-[var(--color-header-bg)]">
        <div className="max-w-[1280px] mx-auto px-4 h-14 flex items-center gap-3">
          <button
            className="md:hidden p-1.5 rounded-md hover:bg-[var(--color-canvas-subtle)]"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <Link to={isAuthenticated ? '/' : '/'} className="flex items-center gap-2 font-semibold text-[var(--color-header-text)] no-underline hover:no-underline">
            <GitIcon />
            <span className="hidden sm:inline">SoftGit</span>
          </Link>

          {/* Search */}
          <div className="flex-1 max-w-md hidden sm:block">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const q = new FormData(e.currentTarget).get('q') as string
                if (q?.trim()) navigate(`/search?q=${encodeURIComponent(q.trim())}`)
              }}
              className="relative"
            >
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-fg-muted)]" />
              <input
                name="q"
                placeholder="Search SoftGit…"
                className="w-full h-8 pl-8 pr-3 text-sm rounded-md border border-[var(--color-border-default)] bg-[var(--color-canvas-default)] text-[var(--color-fg-default)] placeholder:text-[var(--color-fg-subtle)] focus:outline-none focus:border-[var(--color-accent-emphasis)]"
              />
            </form>
          </div>

          <div className="flex-1 sm:hidden" />

          <nav className="hidden md:flex items-center gap-1 text-sm font-semibold">
            {isAuthenticated && (
              <>
                <NavLink to="/" className={navClass} end>
                  Dashboard
                </NavLink>
                <NavLink to="/explore" className={navClass}>
                  Explore
                </NavLink>
              </>
            )}
          </nav>

          <div className="flex items-center gap-1 ml-auto">
            <button
              className="p-1.5 rounded-md hover:bg-[var(--color-canvas-subtle)] text-[var(--color-fg-muted)]"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {isLoading ? null : isAuthenticated && user ? (
              <>
                <Link
                  to="/notifications"
                  className="p-1.5 rounded-md hover:bg-[var(--color-canvas-subtle)] text-[var(--color-fg-muted)]"
                  aria-label="Notifications"
                >
                  <Bell size={18} />
                </Link>
                <Link
                  to="/new"
                  className="p-1.5 rounded-md hover:bg-[var(--color-canvas-subtle)] text-[var(--color-fg-muted)]"
                  aria-label="Create new"
                >
                  <Plus size={18} />
                </Link>
                <div className="relative">
                  <button
                    className="flex items-center gap-1 p-1 rounded-md hover:bg-[var(--color-canvas-subtle)]"
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    aria-label="User menu"
                  >
                    <Avatar name={user.username} src={resolveAvatarUrl(user.avatar_url)} size={28} />
                    <ChevronDown size={14} className="text-[var(--color-fg-muted)]" />
                  </button>
                  {userMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                      <div className="absolute right-0 top-full mt-1 w-56 rounded-md border border-[var(--color-border-default)] bg-[var(--color-canvas-default)] shadow-lg z-50 py-1 text-sm">
                        <div className="px-3 py-2 border-b border-[var(--color-border-muted)]">
                          <div className="font-semibold">Signed in as</div>
                          <div className="text-[var(--color-fg-muted)]">{user.username}</div>
                        </div>
                        <Link
                          to={`/${user.username}`}
                          className="flex items-center gap-2 px-3 py-1.5 hover:bg-[var(--color-canvas-subtle)] text-[var(--color-fg-default)] no-underline"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <User size={16} /> Your profile
                        </Link>
                        <Link
                          to="/settings/profile"
                          className="flex items-center gap-2 px-3 py-1.5 hover:bg-[var(--color-canvas-subtle)] text-[var(--color-fg-default)] no-underline"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <Settings size={16} /> Settings
                        </Link>
                        {user.is_admin && (
                          <Link
                            to="/admin"
                            className="flex items-center gap-2 px-3 py-1.5 hover:bg-[var(--color-canvas-subtle)] text-[var(--color-fg-default)] no-underline"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            <BookMarked size={16} /> Admin
                          </Link>
                        )}
                        <div className="border-t border-[var(--color-border-muted)] my-1" />
                        <button
                          className="flex w-full items-center gap-2 px-3 py-1.5 hover:bg-[var(--color-canvas-subtle)] text-[var(--color-fg-default)]"
                          onClick={handleLogout}
                        >
                          <LogOut size={16} /> Sign out
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login">
                  <Button variant="ghost" size="sm">
                    Sign in
                  </Button>
                </Link>
                <Link to="/register">
                  <Button variant="primary" size="sm">
                    Sign up
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <div className="md:hidden border-t border-[var(--color-border-default)] px-4 py-3 space-y-2">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const q = new FormData(e.currentTarget).get('q') as string
                if (q?.trim()) {
                  navigate(`/search?q=${encodeURIComponent(q.trim())}`)
                  setMobileOpen(false)
                }
              }}
            >
              <input
                name="q"
                placeholder="Search SoftGit…"
                className="w-full h-8 px-3 text-sm rounded-md border border-[var(--color-border-default)] bg-[var(--color-canvas-default)]"
              />
            </form>
            {isAuthenticated && (
              <nav className="flex flex-col gap-1 text-sm font-semibold">
                <Link to="/" onClick={() => setMobileOpen(false)} className="py-1.5">
                  Dashboard
                </Link>
                <Link to="/explore" onClick={() => setMobileOpen(false)} className="py-1.5">
                  Explore
                </Link>
              </nav>
            )}
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-[var(--color-border-default)] py-6 text-center text-xs text-[var(--color-fg-muted)]">
        <div className="max-w-[1280px] mx-auto px-4 flex flex-wrap justify-center gap-4">
          <span>© {new Date().getFullYear()} SoftGit</span>
          <a href="https://github.com/m4rcel-lol-grok-ops/softgit">Source</a>
        </div>
      </footer>
    </div>
  )
}

function navClass({ isActive }: { isActive: boolean }) {
  return cn(
    'px-2 py-1 rounded-md no-underline text-[var(--color-fg-default)] hover:text-[var(--color-accent-fg)] hover:no-underline',
    isActive && 'text-[var(--color-accent-fg)]'
  )
}

function GitIcon() {
  return (
    <svg height="24" width="24" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  )
}

// silence unused import
void GitPullRequest
