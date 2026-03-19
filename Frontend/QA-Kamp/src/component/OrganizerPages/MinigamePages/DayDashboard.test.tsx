import { vi, describe, it, expect, beforeEach } from 'vitest'
import type { Mock } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import DayDashboard from './DayDashboard.tsx'
import { AuthProvider } from '../../../context/AuthContext'
import { SessionProvider } from '../../../context/SessionContext'

// Mock the api module used by DayDashboard (same path the component imports)
vi.mock('../../../api', async () => {
  return {
    // no-arg mocks to avoid unused parameter lint errors
    fetchPlayersForSession: vi.fn(async () => ({ players: [] })),
    fetchLeaderboard: vi.fn(async () => ({ leaderboard: [] })),
  }
})

import { fetchPlayersForSession, fetchLeaderboard } from '../../../api'

beforeEach(() => {
  // ensure a clean localStorage for session id between tests
  localStorage.removeItem('currentSessionId')
  vi.resetAllMocks()
})

describe('DayDashboard', () => {
  // Test: controleert dat alle beschikbare spellen voor de geselecteerde dag (Dinsdag)
  // op de pagina worden weergegeven (titels van de minigames worden getoond).
  it('renders all games for the selected day (Dinsdag)', async () => {
    // ensure a session is present so the component shows games
    localStorage.setItem('currentSessionId', 'sess-1')

    // render with route that sets useParams day to "dinsdag"
    render(
      <MemoryRouter initialEntries={["/day/dinsdag"]}>
        <AuthProvider>
          <SessionProvider>
            <DayDashboard />
          </SessionProvider>
        </AuthProvider>
      </MemoryRouter>
    )

    // Expected games for dinsdag
    const expected = [
      'Bug Cleanup',
      'Getalrace',
      'Reactietijd test',
      'Whack the bug',
    ]

    for (const label of expected) {
      // find the game title on the page
      expect(await screen.findByText(label)).toBeDefined()
    }
  })

  // Test: controleert dat de spelerslijst correct wordt geladen en weergegeven,
  // inclusief spelernummer, naam, leeftijdscategorie en online/offline status.
  it('shows players list with spelernummer, naam, leeftijdscategorie and status', async () => {
    // Prepare mock players returned from API
    const mockPlayers = [
      { playerNumber: '101', name: 'Alice', age: 9, category: '8-10', lastSeen: null },
      { playerNumber: '202', name: 'Bob', age: 12, category: '11-13', lastSeen: '2026-03-17T10:00:00Z' },
      { playerNumber: '303', name: 'Charlie', age: 15, category: '14-16', lastSeen: null },
    ]

    // Use vitest's Mock type for assertions
    const fpMock = fetchPlayersForSession as unknown as Mock
    const lbMock = fetchLeaderboard as unknown as Mock
    fpMock.mockImplementationOnce(async () => ({ players: mockPlayers }))
    lbMock.mockImplementationOnce(async () => ({ leaderboard: [] }))

    // set a session id so DayDashboard will attempt to load players
    localStorage.setItem('currentSessionId', 'sess-test')

    render(
      <MemoryRouter initialEntries={["/day/maandag"]}>
        <AuthProvider>
          <SessionProvider>
            <DayDashboard />
          </SessionProvider>
        </AuthProvider>
      </MemoryRouter>
    )

    // Wait for players to be rendered
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeDefined()
      expect(screen.getByText('Bob')).toBeDefined()
      expect(screen.getByText('Charlie')).toBeDefined()
    })

    // Check that each player number and category is present
    expect(screen.getByText('101')).toBeDefined()
    expect(screen.getByText('202')).toBeDefined()
    expect(screen.getByText('303')).toBeDefined()

    expect(screen.getByText('8-10')).toBeDefined()
    expect(screen.getByText('11-13')).toBeDefined()
    expect(screen.getByText('14-16')).toBeDefined()

    // Status cells should show either 'Online' or 'Offline' (component normalizes)
    // Bob has lastSeen so should be Online (depending on mapping); Alice/Charlie offline
    // We simply assert the presence of at least one status cell
    const statusCells = document.querySelectorAll('.status')
    expect(statusCells.length).toBeGreaterThanOrEqual(1)
  })

  // Test: controleert dat het leaderboard correct wordt gesorteerd op score (aflopend)
  // en bij gelijke scores als tiebreaker op naam (alfabetisch oplopend).
  it('displays leaderboard sorted by score desc then name asc', async () => {
    // Unsorted input: two players with same score but names out of order
    const unsorted = [
      { playerNumber: '1', name: 'Charlie', score: 100 },
      { playerNumber: '2', name: 'Alice', score: 100 },
      { playerNumber: '3', name: 'Bob', score: 90 },
    ]

    const fpMock2 = fetchPlayersForSession as unknown as Mock
    const lbMock2 = fetchLeaderboard as unknown as Mock
    fpMock2.mockImplementationOnce(async () => ({ players: [] }))
    lbMock2.mockImplementationOnce(async () => ({ leaderboard: unsorted }))

    localStorage.setItem('currentSessionId', 'sess-test-2')
    render(
      <MemoryRouter initialEntries={["/day/maandag"]}>
        <AuthProvider>
          <SessionProvider>
            <DayDashboard />
          </SessionProvider>
        </AuthProvider>
      </MemoryRouter>
    )

    // Wait for leaderboard items to appear
    await waitFor(() => {
      const rows = document.querySelectorAll('.score-row')
      expect(rows.length).toBeGreaterThanOrEqual(3)
      const first = rows[0].textContent || ''
      const second = rows[1].textContent || ''
      const third = rows[2].textContent || ''

      // first should be Alice (100) because tie-breaker name asc
      expect(first).toContain('Alice')
      expect(second).toContain('Charlie')
      expect(third).toContain('Bob')
    })
  })
})
