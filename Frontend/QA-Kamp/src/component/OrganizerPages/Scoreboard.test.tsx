import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Scoreboard from './Scoreboard'
import { AuthProvider } from '../../context/AuthContext'
import { SessionProvider } from '../../context/SessionContext'
import Navbar from '../Navbar'

// mocks
const mockFetchLeaderboard = vi.fn()
const mockFetchPlayers = vi.fn()
const mockGetSessions = vi.fn()
vi.mock('../../api', () => ({
  fetchLeaderboard: (...args: unknown[]) => (mockFetchLeaderboard as unknown as (...a: unknown[]) => unknown)(...args),
  fetchPlayersForSession: (...args: unknown[]) => (mockFetchPlayers as unknown as (...a: unknown[]) => unknown)(...args),
  getSessions: (...args: unknown[]) => (mockGetSessions as unknown as (...a: unknown[]) => unknown)(...args),
}))

describe('Scoreboard checklist tests', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    localStorage.clear()
  })

  it('shows a list of players (playerNumber, name, score) on the scoreboard page', async () => {
    // seed a logged-in organizer so SessionProvider will call getSessions
    localStorage.setItem('user', JSON.stringify({ id: 'org1', email: 'o@x' }))
    localStorage.setItem('currentSessionId', 's-score-1')
    // mock getSessions to return a session matching our id
    mockGetSessions.mockResolvedValue({ sessions: [{ id: 's-score-1', organizerId: 'org1', startedAt: new Date().toISOString() }] })

    const leaderboard = [
      { playerNumber: '101', name: 'anna', score: 10 },
      { playerNumber: '102', name: 'bob', score: 8 },
    ]
    mockFetchLeaderboard.mockResolvedValue({ leaderboard })

    const { container } = render(
      <MemoryRouter>
        <AuthProvider>
          <SessionProvider>
            <Scoreboard />
          </SessionProvider>
        </AuthProvider>
      </MemoryRouter>
    )

    // wait for items to render
    await waitFor(() => expect(container.querySelectorAll('.row').length).toBeGreaterThanOrEqual(2))

    // check that name and score appear in the document for each
    leaderboard.forEach((p) => {
      expect(screen.getByText(new RegExp(p.name, 'i'))).toBeDefined()
      expect(screen.getByText(String(p.score))).toBeDefined()
    })
  })

  it('list is sorted by highest score first and then by name', async () => {
    localStorage.setItem('user', JSON.stringify({ id: 'org2', email: 'o2@x' }))
    localStorage.setItem('currentSessionId', 's-score-2')
    mockGetSessions.mockResolvedValue({ sessions: [{ id: 's-score-2', organizerId: 'org2', startedAt: new Date().toISOString() }] })

    const leaderboard = [
      { playerNumber: '201', name: 'zoe', score: 5 },
      { playerNumber: '202', name: 'anna', score: 10 },
      { playerNumber: '203', name: 'bob', score: 10 },
    ]
    // server is expected to return leaderboard sorted by score desc then name asc; ensure mock returns that
    const expectedSorted = [...leaderboard].sort((a, b) => {
      if ((b.score ?? 0) !== (a.score ?? 0)) return (b.score ?? 0) - (a.score ?? 0)
      return a.name.localeCompare(b.name)
    })
    mockFetchLeaderboard.mockResolvedValue({ leaderboard: expectedSorted })

    const { container } = render(
      <MemoryRouter>
        <AuthProvider>
          <SessionProvider>
            <Scoreboard />
          </SessionProvider>
        </AuthProvider>
      </MemoryRouter>
    )

    await waitFor(() => expect(container.querySelectorAll('.row').length).toBeGreaterThanOrEqual(3))
    const rows = Array.from(container.querySelectorAll('.row'))

    // extract displayed names and scores in order
    const displayed = rows.map(r => {
      const spans = r.querySelectorAll('span')
      return { name: spans[1]?.textContent?.trim() ?? '', score: Number(spans[2]?.textContent?.trim() ?? '0') }
    })

    // verify sorting: scores desc, then name asc for equal scores
    for (let i = 0; i < displayed.length - 1; i++) {
      const cur = displayed[i]
      const next = displayed[i + 1]
      if (cur.score === next.score) {
        expect(cur.name.localeCompare(next.name)).toBeLessThanOrEqual(0)
      } else {
        expect(cur.score).toBeGreaterThanOrEqual(next.score)
      }
    }
  })

  it('back button is present on the page', () => {
    // no session needed for back button presence
    render(
      <MemoryRouter>
        <AuthProvider>
          <SessionProvider>
            <Scoreboard />
          </SessionProvider>
        </AuthProvider>
      </MemoryRouter>
    )

    expect(screen.getByLabelText(/Terug naar kalender/i)).toBeDefined()
    expect(screen.getByText(/Terug/i)).toBeDefined()
  })

  it('logout button is present on the scoreboard page', async () => {
    // seed a logged-in user so Navbar shows logout
    localStorage.setItem('user', JSON.stringify({ id: 'org1', email: 'o@x' }))
    localStorage.setItem('currentSessionId', 's-score-4')
    mockGetSessions.mockResolvedValue({ sessions: [{ id: 's-score-4', organizerId: 'org1', startedAt: new Date().toISOString() }] })
    mockFetchLeaderboard.mockResolvedValue({ leaderboard: [] })

    render(
      <MemoryRouter>
        <AuthProvider>
          <SessionProvider>
            <Navbar />
            <Scoreboard />
          </SessionProvider>
        </AuthProvider>
      </MemoryRouter>
    )

    // logout button has aria-label 'Uitloggen'
    await waitFor(() => expect(screen.getByLabelText(/Uitloggen/i)).toBeDefined())
  })
})
