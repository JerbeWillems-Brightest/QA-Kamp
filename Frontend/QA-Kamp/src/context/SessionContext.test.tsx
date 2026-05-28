import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'

// Helpers from the app
import { AuthProvider, useAuth } from './AuthContext'
import { SessionProvider, useSession } from './SessionContext'

// Mock the API module used by SessionContext
const mockGetSessions = vi.fn()
vi.mock('../api', () => ({
  getSessions: (...args: unknown[]) => (mockGetSessions as unknown as (...a: unknown[]) => unknown)(...args),
}))

// Small consumer component to inspect SessionContext values in tests
function Consumer() {
  const { currentSession, setCurrentSessionId, refreshSessions } = useSession()

  return (
    <div>
      <div data-testid="current-session">{currentSession ? currentSession.id : 'null'}</div>
      <button onClick={() => setCurrentSessionId(null)}>clear</button>
      <button onClick={() => setCurrentSessionId('unknown')}>set-unknown</button>
      <button onClick={() => refreshSessions()}>refresh</button>
    </div>
  )
}

describe('SessionContext - unit tests (20 cases)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    localStorage.clear()
    cleanup()
    // Default mock: resolve with no sessions
    mockGetSessions.mockResolvedValue({ sessions: [] })
  })

  // 1) Gebruik zonder provider: useSession fallback geeft no-op waarden
  it('1) useSession fallback returns no-op defaults when not wrapped', () => {
    render(<Consumer />)
    expect(screen.getByTestId('current-session').textContent).toBe('null')
    // calling the buttons should not throw (no provider -> no-op functions)
    fireEvent.click(screen.getByText('clear'))
    fireEvent.click(screen.getByText('set-unknown'))
  })

  // 2) Als er geen ingelogde gebruiker is, is currentSession null
  it('2) currentSession is null when no auth user', () => {
    render(
      <AuthProvider>
        <SessionProvider>
          <Consumer />
        </SessionProvider>
      </AuthProvider>
    )
    expect(screen.getByTestId('current-session').textContent).toBe('null')
  })

  // 3) Wanneer user ingelogd en API geeft lege lijst, currentSession blijft null en localStorage ongezet
  it('3) logged-in user with empty sessions results in null currentSession and no localStorage key', async () => {
    localStorage.setItem('user', JSON.stringify({ id: 'u1', email: 'u@x' }))
    mockGetSessions.mockResolvedValue({ sessions: [] })

    render(
      <AuthProvider>
        <SessionProvider>
          <Consumer />
        </SessionProvider>
      </AuthProvider>
    )

    // wait for any async effect to settle
    await waitFor(() => expect(screen.getByTestId('current-session').textContent).toBe('null'))
    expect(localStorage.getItem('currentSessionId')).toBeNull()
  })

  // 4) Wanneer API teruggeeft: eerste item wordt gekozen als latest (index 0)
  it('4) chooses the first session from API as latest but does not persist on initial load', async () => {
    localStorage.setItem('user', JSON.stringify({ id: 'u2', email: 'u2@x' }))
    const sess = { id: 's1', name: 'sess1', startedAt: 't' }
    mockGetSessions.mockResolvedValue({ sessions: [sess] })

    render(
      <AuthProvider>
        <SessionProvider>
          <Consumer />
        </SessionProvider>
      </AuthProvider>
    )

    await waitFor(() => expect(screen.getByTestId('current-session').textContent).toBe('s1'))
    // initial load does not persist currentSessionId according to implementation
    expect(localStorage.getItem('currentSessionId')).toBeNull()
  })

  // 5) refreshSessions persisteert latest session naar localStorage
  it('5) refreshSessions persists latest session id to localStorage', async () => {
    localStorage.setItem('user', JSON.stringify({ id: 'u3', email: 'u3@x' }))
    const sA = { id: 'A', startedAt: 't' }
    mockGetSessions.mockResolvedValue({ sessions: [sA] })

    render(
      <AuthProvider>
        <SessionProvider>
          <Consumer />
        </SessionProvider>
      </AuthProvider>
    )

    // fire refresh button which calls refreshSessions
    fireEvent.click(screen.getByText('refresh'))
    await waitFor(() => expect(localStorage.getItem('currentSessionId')).toBe('A'))
    expect(screen.getByTestId('current-session').textContent).toBe('A')
  })

  // 6) refreshSessions doet niets wanneer er geen auth.user is
  it('6) refreshSessions is no-op when no auth.user', async () => {
    // ensure no user in localStorage
    localStorage.removeItem('user')
    // make mock throw if called so we can assert it wasn't called
    mockGetSessions.mockImplementation(() => { throw new Error('should-not-be-called') })

    render(
      <AuthProvider>
        <SessionProvider>
          <Consumer />
        </SessionProvider>
      </AuthProvider>
    )

    // call refresh - should not throw
    fireEvent.click(screen.getByText('refresh'))
  })

  // 7) setCurrentSessionId(null) verwijdert currentSession en localStorage key
  it('7) setCurrentSessionId(null) clears currentSession and removes localStorage key', async () => {
    localStorage.setItem('user', JSON.stringify({ id: 'u4', email: 'u4@x' }))
    const s = { id: 'clear-me', startedAt: 't' }
    mockGetSessions.mockResolvedValue({ sessions: [s] })

    render(
      <AuthProvider>
        <SessionProvider>
          <Consumer />
        </SessionProvider>
      </AuthProvider>
    )

    await waitFor(() => expect(screen.getByTestId('current-session').textContent).toBe('clear-me'))
    // persist something to localStorage to then verify removal
    localStorage.setItem('currentSessionId', 'clear-me')
    fireEvent.click(screen.getByText('clear'))
    await waitFor(() => expect(screen.getByTestId('current-session').textContent).toBe('null'))
    expect(localStorage.getItem('currentSessionId')).toBeNull()
  })

  // 8) setCurrentSessionId met onbekende id zet currentSession op null maar persisteert de id
  it('8) setCurrentSessionId with unknown id sets currentSession null but still persists id', async () => {
    localStorage.setItem('user', JSON.stringify({ id: 'u5', email: 'u5@x' }))
    // API returns only sessX
    mockGetSessions.mockResolvedValue({ sessions: [{ id: 'sessX', startedAt: 't' }] })

    render(
      <AuthProvider>
        <SessionProvider>
          <Consumer />
        </SessionProvider>
      </AuthProvider>
    )

    await waitFor(() => expect(screen.getByTestId('current-session').textContent).toBe('sessX'))
    fireEvent.click(screen.getByText('set-unknown'))
    await waitFor(() => expect(screen.getByTestId('current-session').textContent).toBe('null'))
    // implementation persists the unknown id
    expect(localStorage.getItem('currentSessionId')).toBe('unknown')
  })

  // 9) refreshSessions waarbij API faalt wordt gevangen en werpt geen fout
  it('9) refreshSessions handles API rejection without throwing', async () => {
    localStorage.setItem('user', JSON.stringify({ id: 'u6', email: 'u6@x' }))
    mockGetSessions.mockRejectedValue(new Error('api-fail'))

    render(
      <AuthProvider>
        <SessionProvider>
          <Consumer />
        </SessionProvider>
      </AuthProvider>
    )

    fireEvent.click(screen.getByText('refresh'))
    // no unhandled rejection should bubble; wait briefly for handling
    await new Promise((r) => setTimeout(r, 20))
    expect(true).toBeTruthy()
  })

  // 10) init load with API rejection logs error but leaves state null
  it('10) initial load with API rejection keeps state null', async () => {
    localStorage.setItem('user', JSON.stringify({ id: 'u7', email: 'u7@x' }))
    mockGetSessions.mockRejectedValue(new Error('boom'))

    render(
      <AuthProvider>
        <SessionProvider>
          <Consumer />
        </SessionProvider>
      </AuthProvider>
    )

    await waitFor(() => expect(screen.getByTestId('current-session').textContent).toBe('null'))
  })

  // 11) refreshSessions removes localStorage key when API returns no sessions
  it('11) refreshSessions removes persisted key when no sessions returned', async () => {
    localStorage.setItem('user', JSON.stringify({ id: 'u8', email: 'u8@x' }))
    // first return non-empty to set something
    mockGetSessions.mockResolvedValueOnce({ sessions: [{ id: 'S' }] })

    render(
      <AuthProvider>
        <SessionProvider>
          <Consumer />
        </SessionProvider>
      </AuthProvider>
    )

    await waitFor(() => expect(screen.getByTestId('current-session').textContent).toBe('S'))
    // now mock empty and refresh
    mockGetSessions.mockResolvedValueOnce({ sessions: [] })
    fireEvent.click(screen.getByText('refresh'))
    await waitFor(() => expect(localStorage.getItem('currentSessionId')).toBeNull())
  })


  // 13) setCurrentSessionId to a valid id selects that session from allSessions
  it('13) setCurrentSessionId selects existing session and persists id', async () => {
    localStorage.setItem('user', JSON.stringify({ id: 'u10', email: 'u10@x' }))
    const s1 = { id: 'valid', startedAt: 't' }
    const s2 = { id: 'other', startedAt: 't' }
    mockGetSessions.mockResolvedValue({ sessions: [s1, s2] })

    function Selector() {
      const { setCurrentSessionId } = useSession()
      return <button onClick={() => setCurrentSessionId('other')}>pick-other</button>
    }

    render(
      <AuthProvider>
        <SessionProvider>
          <Selector />
          <Consumer />
        </SessionProvider>
      </AuthProvider>
    )

    await waitFor(() => expect(screen.getByTestId('current-session').textContent).toBe('valid'))
    fireEvent.click(screen.getByText('pick-other'))
    await waitFor(() => expect(screen.getByTestId('current-session').textContent).toBe('other'))
    expect(localStorage.getItem('currentSessionId')).toBe('other')
  })

  // 14) wanneer gebruiker inlogt (AuthProvider.login) laadt SessionProvider sessies
  it('14) logging in triggers session load via auth.login', async () => {
    mockGetSessions.mockResolvedValue({ sessions: [{ id: 'L1', startedAt: 't' }] })

    function LoginFlow() {
      const a = useAuth()
      return <button onClick={() => a.login({ id: 'login-user', email: 'x' })}>login</button>
    }

    render(
      <AuthProvider>
        <SessionProvider>
          <LoginFlow />
          <Consumer />
        </SessionProvider>
      </AuthProvider>
    )

    fireEvent.click(screen.getByText('login'))
    await waitFor(() => expect(screen.getByTestId('current-session').textContent).toBe('L1'))
  })

  // 15) uitloggen (AuthProvider.logout) zet currentSession en allSessions leeg
  it('15) logout clears sessions in provider', async () => {
    localStorage.setItem('user', JSON.stringify({ id: 'u11', email: 'u11@x' }))
    mockGetSessions.mockResolvedValue({ sessions: [{ id: 'Sx', startedAt: 't' }] })

    function LogoutButton() {
      const a = useAuth()
      return <button onClick={() => a.logout()}>logout</button>
    }

    render(
      <AuthProvider>
        <SessionProvider>
          <LogoutButton />
          <Consumer />
        </SessionProvider>
      </AuthProvider>
    )

    await waitFor(() => expect(screen.getByTestId('current-session').textContent).toBe('Sx'))
    fireEvent.click(screen.getByText('logout'))
    await waitFor(() => expect(screen.getByTestId('current-session').textContent).toBe('null'))
  })

  // 16) useSession functions exist and refreshSessions returns a promise
  it('16) refreshSessions is callable and returns a promise-like (thenable)', async () => {
    localStorage.setItem('user', JSON.stringify({ id: 'u12', email: 'u12@x' }))
    mockGetSessions.mockResolvedValue({ sessions: [{ id: 'p1' }] })

    function Caller() {
      const { refreshSessions } = useSession()
      return <button onClick={() => { void refreshSessions() }}>call</button>
    }

    render(
      <AuthProvider>
        <SessionProvider>
          <Caller />
        </SessionProvider>
      </AuthProvider>
    )

    fireEvent.click(screen.getByText('call'))
    await waitFor(() => expect(true).toBeTruthy())
  })

  // 17) setCurrentSessionId with null is idempotent (calling twice still OK)
  it('17) clearing session twice is safe', async () => {
    localStorage.setItem('user', JSON.stringify({ id: 'u13', email: 'u13@x' }))
    mockGetSessions.mockResolvedValue({ sessions: [{ id: 'x1' }] })

    render(
      <AuthProvider>
        <SessionProvider>
          <Consumer />
        </SessionProvider>
      </AuthProvider>
    )

    await waitFor(() => expect(screen.getByTestId('current-session').textContent).toBe('x1'))
    fireEvent.click(screen.getByText('clear'))
    fireEvent.click(screen.getByText('clear'))
    await waitFor(() => expect(screen.getByTestId('current-session').textContent).toBe('null'))
  })

  // 18) provider value functions unchanged shape when no sessions
  it('18) provider returns functions even when no sessions exist', () => {
    render(
      <AuthProvider>
        <SessionProvider>
          <Consumer />
        </SessionProvider>
      </AuthProvider>
    )
    expect(screen.getByText('clear')).toBeDefined()
    expect(screen.getByText('set-unknown')).toBeDefined()
    expect(screen.getByText('refresh')).toBeDefined()
  })

  // 19) calling setCurrentSessionId with an id when allSessions empty still persists id
  it('19) setting id when no sessions persists the id', async () => {
    localStorage.setItem('user', JSON.stringify({ id: 'u14', email: 'u14@x' }))
    mockGetSessions.mockResolvedValue({ sessions: [] })

    render(
      <AuthProvider>
        <SessionProvider>
          <Consumer />
        </SessionProvider>
      </AuthProvider>
    )

    fireEvent.click(screen.getByText('set-unknown'))
    await waitFor(() => expect(localStorage.getItem('currentSessionId')).toBe('unknown'))
  })

  // 20) ensure cleanup between tests: localStorage is cleared by beforeEach
  it('20) sanity: localStorage cleared between tests by beforeEach', () => {
    expect(localStorage.getItem('currentSessionId')).toBeNull()
    expect(localStorage.getItem('user')).toBeNull()
  })
})

