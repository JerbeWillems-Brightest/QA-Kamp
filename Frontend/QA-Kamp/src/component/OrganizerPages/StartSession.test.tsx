import { vi } from 'vitest'

// Mock the API module before importing the component
const mockCreateSession = vi.fn()
const mockGetSessions = vi.fn()
vi.mock('../../api', () => ({
  createSession: (...args: unknown[]) => (mockCreateSession as unknown as (...a: unknown[]) => unknown)(...args),
  getSessions: (...args: unknown[]) => (mockGetSessions as unknown as (...a: unknown[]) => unknown)(...args),
}))

// Mock useNavigate from react-router-dom to capture navigation calls
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  // treat imported module as a record so we can spread it without using `any`
  const actualRecord = actual as unknown as Record<string, unknown>
  return {
    ...actualRecord,
    useNavigate: () => mockNavigate,
  }
})

import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import StartSession from './StartSession'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '../../context/AuthContext'

describe('StartSession (comprehensive)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    localStorage.clear()
    // ensure mocks are fresh references
  })

  it('renders start button and heading', () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <StartSession />
        </AuthProvider>
      </BrowserRouter>
    )

    // the button has aria-label="Start QA-Kamp" so query by that accessible name
    expect(screen.getByLabelText(/Start QA-Kamp/i)).toBeDefined()
    expect(screen.getByText(/Klik om het QA-kamp te starten\./i)).toBeDefined()
  })

  it('navigates to organizer-login when no user is present', async () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <StartSession />
        </AuthProvider>
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/organizer-login')
    })
  })

  it('when user has active sessions, navigates to day-overview and stores session id', async () => {
    // seed auth user
    localStorage.setItem('user', JSON.stringify({ id: 'org1', email: 'o@e' }))
    // mock getSessions to return sessions
    mockGetSessions.mockResolvedValue({ sessions: [{ id: 'sess-123', organizerId: 'org1', startedAt: new Date().toISOString() }] })

    render(
      <BrowserRouter>
        <AuthProvider>
          <StartSession />
        </AuthProvider>
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/day-overview')
      expect(localStorage.getItem('currentSessionId')).toBe('sess-123')
    })
  })

  it('clicking Starten calls createSession with organizer id and name', async () => {
    localStorage.setItem('user', JSON.stringify({ id: 'org2', email: 'org2@x' }))
    mockGetSessions.mockResolvedValue({ sessions: [] })
    mockCreateSession.mockResolvedValue({ session: { id: 'new-sess', organizerId: 'org2', startedAt: new Date().toISOString() } })

    render(
      <BrowserRouter>
        <AuthProvider>
          <StartSession />
        </AuthProvider>
      </BrowserRouter>
    )

    const btn = screen.getByLabelText(/Start QA-Kamp/i)
    fireEvent.click(btn)

    await waitFor(() => {
      expect(mockCreateSession).toHaveBeenCalled()
      // first arg should be organizer id
      expect(mockCreateSession.mock.calls[0][0]).toBe('org2')
    })
  })

  it('successful createSession navigates to day-overview and stores id', async () => {
    localStorage.setItem('user', JSON.stringify({ id: 'org3', email: 'org3@x' }))
    mockGetSessions.mockResolvedValue({ sessions: [] })
    mockCreateSession.mockResolvedValue({ session: { id: 'created-1' } })

    render(
      <BrowserRouter>
        <AuthProvider>
          <StartSession />
        </AuthProvider>
      </BrowserRouter>
    )

    fireEvent.click(screen.getByLabelText(/Start QA-Kamp/i))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/day-overview')
      expect(localStorage.getItem('currentSessionId')).toBe('created-1')
    })
  })

  it('createSession returns no session -> shows alert fallback', async () => {
    localStorage.setItem('user', JSON.stringify({ id: 'org4', email: 'org4@x' }))
    mockGetSessions.mockResolvedValue({ sessions: [] })
    mockCreateSession.mockResolvedValue({})
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

    render(
      <BrowserRouter>
        <AuthProvider>
          <StartSession />
        </AuthProvider>
      </BrowserRouter>
    )

    fireEvent.click(screen.getByLabelText(/Start QA-Kamp/i))

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Kon sessie niet starten')
    })
  })

  it('createSession throws -> shows alert', async () => {
    localStorage.setItem('user', JSON.stringify({ id: 'org5', email: 'org5@x' }))
    mockGetSessions.mockResolvedValue({ sessions: [] })
    mockCreateSession.mockRejectedValue(new Error('network'))
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

    render(
      <BrowserRouter>
        <AuthProvider>
          <StartSession />
        </AuthProvider>
      </BrowserRouter>
    )

    fireEvent.click(screen.getByLabelText(/Start QA-Kamp/i))

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Kon sessie niet starten')
    })
  })

  it('button has aria-label Start QA-Kamp', () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <StartSession />
        </AuthProvider>
      </BrowserRouter>
    )
    expect(screen.getByLabelText(/Start QA-Kamp/i)).toBeDefined()
  })

  it('clicking Starten multiple times calls createSession multiple times', async () => {
    localStorage.setItem('user', JSON.stringify({ id: 'org6', email: 'org6@x' }))
    mockGetSessions.mockResolvedValue({ sessions: [] })
    mockCreateSession.mockResolvedValue({ session: { id: 'm1' } })

    render(
      <BrowserRouter>
        <AuthProvider>
          <StartSession />
        </AuthProvider>
      </BrowserRouter>
    )

    const btn = screen.getByLabelText(/Start QA-Kamp/i)
    fireEvent.click(btn)
    fireEvent.click(btn)

    await waitFor(() => {
      expect(mockCreateSession).toHaveBeenCalledTimes(2)
    })
  })
})
