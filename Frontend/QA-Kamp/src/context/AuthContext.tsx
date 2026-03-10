import React, { createContext, useContext, useEffect, useState } from 'react'

export interface OrganizerUser {
  id: string
  email: string
  name?: string
}

interface AuthContextValue {
  user: OrganizerUser | null
  login: (user: OrganizerUser) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<OrganizerUser | null>(() => {
    try {
      const raw = localStorage.getItem('organizer')
      return raw ? (JSON.parse(raw) as OrganizerUser) : null
    } catch {
      return null
    }
  })

  useEffect(() => {
    if (user) {
      localStorage.setItem('organizer', JSON.stringify(user))
    } else {
      localStorage.removeItem('organizer')
    }
  }, [user])

  const login = (u: OrganizerUser) => setUser(u)
  const logout = () => setUser(null)

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
