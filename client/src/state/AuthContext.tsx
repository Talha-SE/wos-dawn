import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import api, { setAuthToken } from '../services/api'

type User = { id: string; email: string; gameId?: string; gameName?: string; automationEnabled?: boolean }

type Ctx = {
  token: string | null
  user: User | null
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string) => Promise<void>
  logout: () => void
  refreshMe: () => Promise<void>
  setUser: (u: User | null) => void
}

const AuthContext = createContext<Ctx>({} as any)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'))
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    setAuthToken(token || undefined)
    if (token) localStorage.setItem('token', token)
    else localStorage.removeItem('token')
  }, [token])

  useEffect(() => {
    if (token) refreshMe().catch(() => undefined)
  }, [])

  async function refreshMe() {
    const { data } = await api.get<User>('/user/me')
    setUser(data)
  }

  async function login(email: string, password: string) {
    const { data } = await api.post<{ token: string; user: User }>('/auth/login', { email, password })
    setToken(data.token)
    setUser(data.user)
  }

  async function signup(email: string, password: string) {
    const { data } = await api.post<{ token: string; user: User }>('/auth/signup', { email, password })
    setToken(data.token)
    setUser(data.user)
  }

  function logout() {
    setToken(null)
    setUser(null)
  }

  const value = useMemo(() => ({ token, user, login, signup, logout, refreshMe, setUser }), [token, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() { return useContext(AuthContext) }
