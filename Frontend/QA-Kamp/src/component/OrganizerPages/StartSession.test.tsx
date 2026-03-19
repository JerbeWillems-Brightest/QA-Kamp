import { vi } from 'vitest'

// Mock the API module before importing the component
const mockCreateSession = vi.fn()
const mockGetSessions = vi.fn()
vi.mock('../../api', () => ({
  createSession: (...args: unknown[]) => (mockCreateSession as unknown as (...a: unknown[]) => unknown)(...args),
  getSessions: (...args: unknown[]) => (mockGetSessions as unknown as (...a: unknown[]) => unknown)(...args),
}))

import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import StartSession from './StartSession'
import { AuthProvider } from '../../context/AuthContext'
import { SessionProvider } from '../../context/SessionContext'
import Navbar from '../Navbar'

describe('StartSession (comprehensive)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    localStorage.clear()
    // ensure mocks are fresh references
  })

  // Test: controleert dat de pagina de start-knop en de uitleg-heading rendert
  it('renders start button and heading', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <SessionProvider>
            <StartSession />
          </SessionProvider>
        </AuthProvider>
      </MemoryRouter>
    )

    // the button has aria-label="Start QA-Kamp" so query by that accessible name
    expect(screen.getByLabelText(/Start QA-Kamp/i)).toBeDefined()
    expect(screen.getByText(/Klik om het QA-kamp te starten\./i)).toBeDefined()
  })

  // Test: wanneer een gebruiker in localStorage staat, toont de header een uitlog-knop
  it('shows logout button in header when user is logged in', async () => {
    // seed auth user
    localStorage.setItem('user', JSON.stringify({ id: 'org-logout', email: 'o@logout' }))
    // ensure getSessions returns empty so component stays on page
    mockGetSessions.mockResolvedValue({ sessions: [] })

    render(
      <MemoryRouter>
        <AuthProvider>
          <SessionProvider>
            <Navbar />
            <StartSession />
          </SessionProvider>
        </AuthProvider>
      </MemoryRouter>
    )

    // header may render a logout control with aria-label or text 'uitloggen' (Dutch) or 'logout'
    await waitFor(() => {
      expect(screen.getByLabelText(/uitloggen|logout|log out/i)).toBeDefined()
    })
  })

  // Test: wanneer er geen gebruiker aanwezig is, wordt doorgestuurd naar de organizer-login pagina
  it('navigates to organizer-login when no user is present', async () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <AuthProvider>
          <SessionProvider>
            <Routes>
              <Route path="/" element={<StartSession />} />
              <Route path="/organizer-login" element={<div>Organizer Login Page</div>} />
            </Routes>
          </SessionProvider>
        </AuthProvider>
      </MemoryRouter>
    )

    await waitFor(() => expect(screen.getByText(/Organizer Login Page/i)).toBeDefined())
  })

  // Test: als de gebruiker al actieve sessions heeft, wordt genavigeerd naar day-overview
  // en wordt de huidige sessie-id in localStorage opgeslagen
  it('when user has active sessions, navigates to day-overview and stores session id', async () => {
    // seed auth user
    localStorage.setItem('user', JSON.stringify({ id: 'org1', email: 'o@e' }))
    // mock getSessions to return sessions
    mockGetSessions.mockResolvedValue({ sessions: [{ id: 'sess-123', organizerId: 'org1', startedAt: new Date().toISOString() }] })

    render(
      <MemoryRouter initialEntries={["/"]}>
        <AuthProvider>
          <SessionProvider>
            <Routes>
              <Route path="/" element={<StartSession />} />
              <Route path="/day-overview" element={<div>Day Overview Page</div>} />
            </Routes>
          </SessionProvider>
        </AuthProvider>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/Day Overview Page/i)).toBeDefined()
      expect(localStorage.getItem('currentSessionId')).toBe('sess-123')
    })
  })

  // Test: bij klikken op Starten wordt createSession aangeroepen met de organizer-id als eerste argument
  it('clicking Starten calls createSession with organizer id and name', async () => {
    localStorage.setItem('user', JSON.stringify({ id: 'org2', email: 'org2@x' }))
    mockGetSessions.mockResolvedValue({ sessions: [] })
    mockCreateSession.mockResolvedValue({ session: { id: 'new-sess', organizerId: 'org2', startedAt: new Date().toISOString() } })

    render(
      <MemoryRouter>
        <AuthProvider>
          <SessionProvider>
            <StartSession />
          </SessionProvider>
        </AuthProvider>
      </MemoryRouter>
    )

    const btn = screen.getByLabelText(/Start QA-Kamp/i)
    fireEvent.click(btn)

    await waitFor(() => {
      expect(mockCreateSession).toHaveBeenCalled()
      // first arg should be organizer id
      expect(mockCreateSession.mock.calls[0][0]).toBe('org2')
    })
  })

  // Test: na succesvolle createSession wordt genavigeerd naar day-overview en wordt id opgeslagen
  it('successful createSession navigates to day-overview and stores id', async () => {
    localStorage.setItem('user', JSON.stringify({ id: 'org3', email: 'org3@x' }))
    mockGetSessions.mockResolvedValue({ sessions: [] })
    mockCreateSession.mockResolvedValue({ session: { id: 'created-1' } })

    render(
      <MemoryRouter initialEntries={["/"]}>
        <AuthProvider>
          <SessionProvider>
            <Routes>
              <Route path="/" element={<StartSession />} />
              <Route path="/day-overview" element={<div>Day Overview Page</div>} />
            </Routes>
          </SessionProvider>
        </AuthProvider>
      </MemoryRouter>
    )

    fireEvent.click(screen.getByLabelText(/Start QA-Kamp/i))

    await waitFor(() => {
      expect(screen.getByText(/Day Overview Page/i)).toBeDefined()
      expect(localStorage.getItem('currentSessionId')).toBe('created-1')
    })
  })

  // Test: wanneer createSession geen session-object teruggeeft, tonen we een alert fallback
  it('createSession returns no session -> shows alert fallback', async () => {
    localStorage.setItem('user', JSON.stringify({ id: 'org4', email: 'org4@x' }))
    mockGetSessions.mockResolvedValue({ sessions: [] })
    mockCreateSession.mockResolvedValue({})
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

    render(
      <MemoryRouter>
        <AuthProvider>
          <SessionProvider>
            <StartSession />
          </SessionProvider>
        </AuthProvider>
      </MemoryRouter>
    )

    fireEvent.click(screen.getByLabelText(/Start QA-Kamp/i))

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Kon sessie niet starten')
    })
  })

  // Test: bij een fout (exception) van createSession tonen we ook een alert
  it('createSession throws -> shows alert', async () => {
    localStorage.setItem('user', JSON.stringify({ id: 'org5', email: 'org5@x' }))
    mockGetSessions.mockResolvedValue({ sessions: [] })
    mockCreateSession.mockRejectedValue(new Error('network'))
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

    render(
      <MemoryRouter>
        <AuthProvider>
          <SessionProvider>
            <StartSession />
          </SessionProvider>
        </AuthProvider>
      </MemoryRouter>
    )

    fireEvent.click(screen.getByLabelText(/Start QA-Kamp/i))

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Kon sessie niet starten')
    })
  })

  // Test: de start-knop heeft het verwachte aria-label voor toegankelijkheid
  it('button has aria-label Start QA-Kamp', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <SessionProvider>
            <StartSession />
          </SessionProvider>
        </AuthProvider>
      </MemoryRouter>
    )
    expect(screen.getByLabelText(/Start QA-Kamp/i)).toBeDefined()
  })

  // Test: meerdere clicks op de start-knop roepen createSession meerdere keren aan
  it('clicking Starten multiple times calls createSession multiple times', async () => {
    localStorage.setItem('user', JSON.stringify({ id: 'org6', email: 'org6@x' }))
    mockGetSessions.mockResolvedValue({ sessions: [] })
    mockCreateSession.mockResolvedValue({ session: { id: 'm1' } })

    render(
      <MemoryRouter>
        <AuthProvider>
          <SessionProvider>
            <StartSession />
          </SessionProvider>
        </AuthProvider>
      </MemoryRouter>
    )

    const btn = screen.getByLabelText(/Start QA-Kamp/i)
    fireEvent.click(btn)
    fireEvent.click(btn)

    await waitFor(() => {
      expect(mockCreateSession).toHaveBeenCalledTimes(2)
    })
  })
})
