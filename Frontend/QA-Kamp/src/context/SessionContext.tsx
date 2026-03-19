/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react'
import type { FC, ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { getSessions } from '../api'

export interface Session {
  id: string
  organizerId?: string
  startedAt: string
  name?: string
}

interface SessionContextValue {
  currentSession: Session | null
  setCurrentSessionId: (id: string | null) => void
  refreshSessions: () => Promise<void>
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined)

export const SessionProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const auth = useAuth()
  const [currentSession, setCurrentSession] = useState<Session | null>(null)
  const [allSessions, setAllSessions] = useState<Session[]>([])

  // load sessions for organizer on login
  useEffect(() => {
    let mounted = true
    async function load() {
      if (!auth.user) {
        setCurrentSession(null)
        setAllSessions([])
        return
      }
      try {
        const res = await getSessions(auth.user.id)
        if (!mounted) return
        setAllSessions(res.sessions)
        // choose the latest session for this organizer if any
        const latest = (res.sessions || [])[0] ?? null
        setCurrentSession(latest)
      } catch (err) {
        console.error('Failed to load sessions for organizer', err)
      }
    }
    load()
    return () => { mounted = false }
  }, [auth.user])

  async function refreshSessions() {
    if (!auth.user) return
    try {
      const res = await getSessions(auth.user.id)
      setAllSessions(res.sessions)
      const latest = (res.sessions || [])[0] ?? null
      setCurrentSession(latest)
      // persist current session id to localStorage for compatibility with other parts/tests
      if (latest && latest.id) {
        try { localStorage.setItem('currentSessionId', latest.id) } catch (e) { console.warn('Failed to persist currentSessionId', e) }
      } else {
        try { localStorage.removeItem('currentSessionId') } catch (e) { console.warn('Failed to remove currentSessionId', e) }
      }
    } catch (err) {
      console.error('Failed to refresh sessions', err)
    }
  }

  function setCurrentSessionId(id: string | null) {
    if (!id) {
      setCurrentSession(null)
      try { localStorage.removeItem('currentSessionId') } catch (e) { console.warn('Failed to remove currentSessionId', e) }
      return
    }
    const found = allSessions.find((s) => s.id === id) ?? null
    setCurrentSession(found)
    try { localStorage.setItem('currentSessionId', id) } catch (e) { console.warn('Failed to persist currentSessionId', e) }
  }

  const providerValue: SessionContextValue = { currentSession, setCurrentSessionId, refreshSessions }

  return (
    <SessionContext.Provider value={providerValue}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) {
    // Graceful fallback for tests or non-wrapped usage: provide no-op defaults
    // This avoids hard failures in unit tests where wrapping may be omitted.
    return {
      currentSession: null,
      setCurrentSessionId: () => {},
      refreshSessions: async () => {},
    } as SessionContextValue
  }
  return ctx
}
