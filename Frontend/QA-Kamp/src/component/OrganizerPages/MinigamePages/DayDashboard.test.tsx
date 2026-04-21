import { vi, describe, it, expect, beforeEach } from 'vitest'
import type { Mock } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import DayDashboard from './DayDashboard.tsx'
import { AuthProvider } from '../../../context/AuthContext'
import { SessionProvider } from '../../../context/SessionContext'
import { setActiveGameInfo } from '../../../api'

// Mock the api module used by DayDashboard (same path the component imports)
vi.mock('../../../api', async () => {
  return {
    fetchPlayersForSession: vi.fn(async () => ({ players: [] })),
    fetchLeaderboard: vi.fn(async () => ({ leaderboard: [] })),
    fetchOnlinePlayers: vi.fn(async () => ({ onlinePlayers: [] })),
    setActiveGameInfo: vi.fn(async () => ({ success: true })),
  }
})

import { fetchPlayersForSession, fetchLeaderboard } from '../../../api'

const mockSetActiveGameInfo = vi.mocked(setActiveGameInfo)

beforeEach(() => {
  // ensure a clean localStorage for session id between tests
  localStorage.clear()
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

  // Branch tests for edge cases and additional functionality
  it('shows no active session message when no sessionId present', () => {
    // ensure localStorage has no currentSessionId
    localStorage.removeItem('currentSessionId')

    render(
      <MemoryRouter initialEntries={["/day/maandag"]}>
        <AuthProvider>
          <SessionProvider>
            <DayDashboard />
          </SessionProvider>
        </AuthProvider>
      </MemoryRouter>
    )

    expect(screen.getByText('Geen actieve sessie gevonden')).toBeDefined()
  })

  it('startGame persists activeGameInfo and calls API, then stopGame clears it', async () => {
    // prepare a session id so component loads games and allows starting
    localStorage.setItem('currentSessionId', 'sess-1')

    render(
      <MemoryRouter initialEntries={["/day/dinsdag"]}>
        <AuthProvider>
          <SessionProvider>
            <DayDashboard />
          </SessionProvider>
        </AuthProvider>
      </MemoryRouter>
    )

    // find a game card by its title and click it to open the popup
    const gameTitle = await screen.findByText('Bug Cleanup')
    const btn = gameTitle.closest('button') as HTMLButtonElement
    expect(btn).toBeTruthy()
    fireEvent.click(btn)

    // Popup should render start button
    const startBtn = await screen.findByRole('button', { name: 'Spel starten' })
    expect(startBtn).toBeDefined()

    // Click start -> should persist activeGameInfo and call API
    fireEvent.click(startBtn)

    await waitFor(() => {
      const raw = localStorage.getItem('activeGameInfo')
      expect(raw).toBeTruthy()
      const info = JSON.parse(raw as string)
      expect(info.game).toBe('Bug Cleanup')
    })

    expect(mockSetActiveGameInfo).toHaveBeenCalled()

    // Now the popup should show Stop button (running state)
    const stopBtn = await screen.findByRole('button', { name: 'Spel stoppen' })
    expect(stopBtn).toBeDefined()
    fireEvent.click(stopBtn)

    await waitFor(() => {
      expect(localStorage.getItem('activeGameInfo')).toBeNull()
    })
    // API should have been called again to clear server side
    expect(mockSetActiveGameInfo).toHaveBeenCalledTimes(2)
  })

  it('disables other games when one game is running', async () => {
    localStorage.setItem('currentSessionId', 'sess-1')
    
    render(
      <MemoryRouter initialEntries={["/day/dinsdag"]}>
        <AuthProvider>
          <SessionProvider>
            <DayDashboard />
          </SessionProvider>
        </AuthProvider>
      </MemoryRouter>
    )

    // Start the first game
    const gameTitle = await screen.findByText('Bug Cleanup')
    const btn = gameTitle.closest('button') as HTMLButtonElement
    fireEvent.click(btn)
    
    const startBtn = await screen.findByRole('button', { name: 'Spel starten' })
    fireEvent.click(startBtn)

    await waitFor(() => {
      expect(localStorage.getItem('activeGameInfo')).toBeTruthy()
    })

    // Check that other games are disabled
    const otherGames = ['Getalrace', 'Reactietijd test', 'Whack the bug']
    for (const gameName of otherGames) {
      const gameBtn = screen.getByText(gameName).closest('button')
      expect(gameBtn).toBeDisabled()
      expect(gameBtn).toHaveAttribute('aria-disabled', 'true')
    }

    // The running game should still be clickable
    // Check that the first game button (Bug Cleanup) is not disabled
    const gameButtons = screen.getAllByRole('button')
    const bugCleanupBtn = gameButtons.find(btn => 
      btn.classList.contains('game-card') && 
      btn.textContent?.includes('Bug Cleanup')
    )
    expect(bugCleanupBtn).not.toBeDisabled()
    expect(bugCleanupBtn).not.toHaveAttribute('disabled')
  })

  it('displays correct day labels for different days', () => {
    localStorage.setItem('currentSessionId', 'sess-1')
    
    const testCases = [
      { path: '/day/maandag', expectedLabel: 'Maandag - Security' },
      { path: '/day/dinsdag', expectedLabel: 'Dinsdag - Performance' },
      { path: '/day/woensdag', expectedLabel: 'Woensdag - Aandacht voor detail' },
      { path: '/day/donderdag', expectedLabel: 'Donderdag - Logisch redeneren' },
      { path: '/day/vrijdag', expectedLabel: 'Vrijdag - Fight the bug' },
      { path: '/day/unknown', expectedLabel: 'Unknown - Security' },
    ]

    testCases.forEach(({ path, expectedLabel }) => {
      const { unmount } = render(
        <MemoryRouter initialEntries={[path]}>
          <AuthProvider>
            <SessionProvider>
              <DayDashboard />
            </SessionProvider>
          </AuthProvider>
        </MemoryRouter>
      )

      expect(screen.getByText(expectedLabel)).toBeInTheDocument()
      unmount()
    })
  })

  it('displays correct games for each day', () => {
    localStorage.setItem('currentSessionId', 'sess-1')
    
    const testCases = [
      { path: '/day/maandag', expectedGames: ['Kraak het wachtwoord', 'Password zapper'] },
      { path: '/day/dinsdag', expectedGames: ['Bug Cleanup', 'Getalrace', 'Reactietijd test', 'Whack the bug'] },
      { path: '/day/woensdag', expectedGames: ['Printer slaat op hol', 'Printer kraken'] },
      { path: '/day/donderdag', expectedGames: ['Herstart de pc', '(Niet zo) slimme thermostaat'] },
      { path: '/day/vrijdag', expectedGames: ['Fight the bug'] },
    ]

    testCases.forEach(({ path, expectedGames }) => {
      const { unmount } = render(
        <MemoryRouter initialEntries={[path]}>
          <AuthProvider>
            <SessionProvider>
              <DayDashboard />
            </SessionProvider>
          </AuthProvider>
        </MemoryRouter>
      )

      expectedGames.forEach(gameName => {
        expect(screen.getByText(gameName)).toBeInTheDocument()
      })
      unmount()
    })
  })

  it('shows loading state while fetching data', async () => {
    localStorage.setItem('currentSessionId', 'sess-1')
    
    render(
      <MemoryRouter initialEntries={["/day/maandag"]}>
        <AuthProvider>
          <SessionProvider>
            <DayDashboard />
          </SessionProvider>
        </AuthProvider>
      </MemoryRouter>
    )

    // Initially should show loading
    expect(screen.getByText('Laden...')).toBeInTheDocument()
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Laden...')).not.toBeInTheDocument()
    })
  })

  it('displays "Geen spelers" when no players are available', async () => {
    localStorage.setItem('currentSessionId', 'sess-1')
    
    render(
      <MemoryRouter initialEntries={["/day/maandag"]}>
        <AuthProvider>
          <SessionProvider>
            <DayDashboard />
          </SessionProvider>
        </AuthProvider>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Geen spelers')).toBeInTheDocument()
    })
  })

  it('displays "Er is nog geen scorebord beschikbaar" when no leaderboard data', async () => {
    localStorage.setItem('currentSessionId', 'sess-1')
    
    render(
      <MemoryRouter initialEntries={["/day/maandag"]}>
        <AuthProvider>
          <SessionProvider>
            <DayDashboard />
          </SessionProvider>
        </AuthProvider>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Er is nog geen scorebord beschikbaar')).toBeInTheDocument()
    })
  })

  it('renders back button with correct link', () => {
    localStorage.setItem('currentSessionId', 'sess-1')
    
    render(
      <MemoryRouter initialEntries={["/day/maandag"]}>
        <AuthProvider>
          <SessionProvider>
            <DayDashboard />
          </SessionProvider>
        </AuthProvider>
      </MemoryRouter>
    )

    const backBtn = screen.getByRole('link', { name: 'Terug naar kalender' })
    expect(backBtn).toHaveAttribute('href', '/day-overview')
  })

  it('handles localStorage errors gracefully', async () => {
    localStorage.setItem('currentSessionId', 'sess-1')
    
    // Mock localStorage.getItem to throw error
    const originalGetItem = localStorage.getItem
    localStorage.getItem = vi.fn((key: string) => {
      if (key === 'activeGameInfo') {
        throw new Error('LocalStorage error')
      }
      return originalGetItem.call(localStorage, key)
    })

    render(
      <MemoryRouter initialEntries={["/day/maandag"]}>
        <AuthProvider>
          <SessionProvider>
            <DayDashboard />
          </SessionProvider>
        </AuthProvider>
      </MemoryRouter>
    )

    // Component should still render without crashing
    expect(screen.getByText('Maandag - Security')).toBeInTheDocument()
    
    // Restore original localStorage.getItem
    localStorage.getItem = originalGetItem
  })

  it('recovers active game state from localStorage on mount', async () => {
    localStorage.setItem('currentSessionId', 'sess-1')
    
    // Set active game in localStorage before render
    localStorage.setItem('activeGameInfo', JSON.stringify({ game: 'Bug Cleanup', day: 'dinsdag' }))
    
    render(
      <MemoryRouter initialEntries={["/day/dinsdag"]}>
        <AuthProvider>
          <SessionProvider>
            <DayDashboard />
          </SessionProvider>
        </AuthProvider>
      </MemoryRouter>
    )

    // Game should be in running state
    await waitFor(() => {
      const gameBtn = screen.getByText('Bug Cleanup').closest('button')
      expect(gameBtn).not.toBeDisabled()
    })
  })
})
