import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import * as authApi from '@/api/auth'
import type { User } from '@/types'
import { getErrorMessage } from '@/api/client'

interface AuthContextValue {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (login: string, password: string) => Promise<void>
  register: (username: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refresh: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [bootstrapped, setBootstrapped] = useState(false)

  const hasToken = typeof window !== 'undefined' && !!localStorage.getItem('softgit_token')

  const { data: user, isLoading, refetch, isError } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: authApi.getMe,
    enabled: hasToken,
    retry: false,
    staleTime: 60_000,
  })

  useEffect(() => {
    if (!hasToken) {
      setBootstrapped(true)
      return
    }
    if (!isLoading) setBootstrapped(true)
  }, [hasToken, isLoading])

  useEffect(() => {
    if (isError) {
      localStorage.removeItem('softgit_token')
    }
  }, [isError])

  const login = useCallback(
    async (loginId: string, password: string) => {
      await authApi.login(loginId, password)
      await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
      await refetch()
    },
    [queryClient, refetch]
  )

  const register = useCallback(
    async (username: string, email: string, password: string) => {
      await authApi.register(username, email, password)
      await authApi.login(username, password)
      await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
      await refetch()
    },
    [queryClient, refetch]
  )

  const logout = useCallback(async () => {
    await authApi.logout()
    queryClient.setQueryData(['auth', 'me'], null)
    queryClient.clear()
  }, [queryClient])

  const value = useMemo<AuthContextValue>(
    () => ({
      user: isError ? null : user ?? null,
      isLoading: !bootstrapped || (hasToken && isLoading),
      isAuthenticated: !!user && !isError,
      login,
      register,
      logout,
      refresh: () => {
        void refetch()
      },
    }),
    [user, isLoading, isError, bootstrapped, hasToken, login, register, logout, refetch]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export { getErrorMessage }
