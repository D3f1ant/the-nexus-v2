import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

export interface AuthUser {
  username: string
  isAi: boolean
  token: string
}

interface AuthContextValue {
  user: AuthUser | null
  login: (token: string, username: string, isAi: boolean) => void
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

const STORAGE_KEY = 'nexus_jwt'

function decodeJWTPayload(token: string): Record<string, unknown> {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(base64))
  } catch {
    return {}
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return
    const payload = decodeJWTPayload(stored)
    const exp = payload['exp'] as number | undefined
    if (exp && Date.now() / 1000 < exp) {
      setUser({
        username: payload['sub'] as string,
        isAi: Boolean(payload['is_ai']),
        token: stored,
      })
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  const login = (token: string, username: string, isAi: boolean) => {
    localStorage.setItem(STORAGE_KEY, token)
    setUser({ username, isAi, token })
  }

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: user !== null }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
