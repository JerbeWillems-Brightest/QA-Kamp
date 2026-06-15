import { createContext, useContext, useEffect, useState } from 'react'
import type { FC, ReactNode } from 'react'

export interface User {
  id: string
  email: string
  name?: string
}

interface AuthContextValue {
  user: User | null
  login: (user: User) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const raw = localStorage.getItem('user')
      return raw ? (JSON.parse(raw) as User) : null
    } catch {
      return null
    }
  })

  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user))
    } else {
      localStorage.removeItem('user')
    }
  }, [user])

  const login = (u: User) => setUser(u)
  const logout = () => {
    setUser(null)
      try {
        if (typeof window !== 'undefined') {
          // Remove active game info
          try { localStorage.removeItem('activeGameInfo') } catch (e) { void e }
          try { window.dispatchEvent(new CustomEvent('activeGameInfoChanged', { detail: null })) } catch (e) { void e }
          try { window.dispatchEvent(new StorageEvent('storage', { key: 'activeGameInfo', newValue: null })) } catch (e) { void e }

          // Also remove password-zapper related keys so score/state does not persist after logout
          try { localStorage.removeItem('pz-score-update') } catch (e) { void e }
          try { window.dispatchEvent(new StorageEvent('storage', { key: 'pz-score-update', newValue: null })) } catch (e) { void e }
          try { localStorage.removeItem('pz-highscore_passwordzapper') } catch (e) { void e }
          try { window.dispatchEvent(new StorageEvent('storage', { key: 'pz-highscore_passwordzapper', newValue: null })) } catch (e) { void e }
        }
      } catch (err) {
      console.warn('AuthContext: failed to clear activeGameInfo on logout', err)
    }
  }

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
