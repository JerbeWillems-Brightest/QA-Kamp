import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { vi, describe, beforeEach, afterEach, test, expect } from 'vitest'

// mock navigate so we can assert route changes
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

import { BrowserRouter } from 'react-router-dom'
import WaitingRoom from './WaitingRoom'
import { fetchLeaderboard } from '../../api'

// mock the api module used by WaitingRoom so polling doesn't attempt real network calls
vi.mock('../../api', () => ({
  fetchLeaderboard: vi.fn(() => Promise.resolve({ leaderboard: [] })),
  // Server-first online logic: mock online/offline so WaitingRoom can mark localStorage correctly.
  setPlayerOnline: vi.fn(() => Promise.resolve({ success: true })),
  setPlayerOffline: vi.fn(() => Promise.resolve({ success: true })),
  postPlayerHeartbeat: vi.fn(() => Promise.resolve({ success: true })),
  fetchOnlinePlayers: vi.fn((sessionId: string) => {
    const sid = String(sessionId ?? '')
    const m = sid.match(/(\d+)/)
    const num = m ? m[1] : '0'
    return Promise.resolve({ onlinePlayers: [{ playerNumber: num, lastSeen: new Date().toISOString() }] })
  }),
  getActiveGameInfo: vi.fn(() => Promise.resolve({ activeGameInfo: null })),
  fetchPlayersForSession: vi.fn(() => Promise.resolve({ players: [] })),
}))

describe('WaitingRoom page', () => {
  beforeEach(() => {
    // ensure clean environment for each test
    sessionStorage.clear()
    localStorage.clear()
    mockNavigate.mockClear()
    if (typeof vi !== 'undefined' && vi.clearAllMocks) vi.clearAllMocks()
  })

  afterEach(() => {
    sessionStorage.clear()
    localStorage.clear()
    mockNavigate.mockClear()
    if (typeof vi !== 'undefined' && vi.clearAllTimers) vi.clearAllTimers()
  })

  // Test: Controleert of de header (simulatie van app-layout) een uitlog-knop bevat
  test('header contains a logout button (provided by page wrapper)', async () => {
    render(
      <BrowserRouter>
        <header data-testid="app-header">
          <button type="button">Uitloggen</button>
        </header>
        <WaitingRoom />
      </BrowserRouter>
    )

    // find button by accessible name (case-insensitive partial match)
    const logoutBtn = await screen.findByRole('button', { name: /uitlog/i })
    expect(logoutBtn).toBeInTheDocument()

    // ensure the button is inside the header
    const header = screen.getByTestId('app-header')
    expect(header).toContainElement(logoutBtn)
  })

  // Test: Wanneer er geen sessionStorage waarden zijn, toont de fallback boodschap
  // en een knop "Terug naar home" die terug navigeert naar '/'
  test('No-session fallback shows message and "Terug naar home" button that navigates to /', async () => {
    // ensure no session values present
    sessionStorage.removeItem('playerNumber')
    sessionStorage.removeItem('playerSessionId')

    render(
      <BrowserRouter>
        <WaitingRoom />
      </BrowserRouter>
    )

    expect(screen.getByText(/Geen sessie of spelergegevens gevonden/i)).toBeInTheDocument()
    const back = screen.getByRole('button', { name: /Terug naar home/i })
    expect(back).toBeInTheDocument()

    fireEvent.click(back)
    expect(mockNavigate).toHaveBeenCalledWith('/')
  })

  // Test: Als playerNumber aanwezig is, wordt de speler toegevoegd aan localStorage.onlinePlayers
  test('Online registration adds playerNumber to localStorage.onlinePlayers', async () => {
    sessionStorage.setItem('playerNumber', '42')
    sessionStorage.setItem('playerSessionId', 'sess-42')

    render(
      <BrowserRouter>
        <WaitingRoom />
      </BrowserRouter>
    )

    await waitFor(() => {
      const raw = localStorage.getItem('onlinePlayers')
      expect(raw).toBeTruthy()
      const arr = JSON.parse(raw as string) as string[]
      expect(arr).toContain('42')
    })
  })

  // Test: Polling mechanism - als de API een niet-lege leaderboard teruggeeft,
  // verandert de boodschap naar de "gestart" boodschap en wordt de tekst groen
  test('Polling: when fetchLeaderboard returns entries, started message appears with green color', async () => {
    sessionStorage.setItem('playerNumber', '1')
    sessionStorage.setItem('playerSessionId', 'sess-1')

    // make fetchLeaderboard return a non-empty leaderboard
    ;(fetchLeaderboard as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ leaderboard: [{ id: 'p1' }] })

    render(
      <BrowserRouter>
        <WaitingRoom />
      </BrowserRouter>
    )

    const startedMsg = await screen.findByText(/Welkom in de sessie, wacht tot de begeleider het spel start/i)
    expect(startedMsg).toBeInTheDocument()
    // check inline style color (started -> green)
    expect(startedMsg).toHaveStyle({ color: '#27ae60' })
  })

  // Test: Wanneer een storage-event met een nieuwe activeGame wordt ontvangen,
  // wordt sessionStorage.playerActiveGame gezet en genavigeerd naar /player/game
  test('Storage event start: activeGame sets sessionStorage.playerActiveGame and navigates to /player/game', async () => {
    sessionStorage.setItem('playerNumber', '7')
    sessionStorage.setItem('playerSessionId', 'sess-7')

    render(
      <BrowserRouter>
        <WaitingRoom />
      </BrowserRouter>
    )

    const payload = { game: 'testgame', gameName: 'Test Game', sessionId: 'sess-7', day: 'Dinsdag' }
    const evt = new StorageEvent('storage', { key: 'activeGame', newValue: JSON.stringify(payload) })
    window.dispatchEvent(evt)

    await waitFor(() => {
      const stored = sessionStorage.getItem('playerActiveGame')
      expect(stored).toBeTruthy()
      const parsed = JSON.parse(stored as string)
      expect(parsed.gameName).toBe('Test Game')
      expect(mockNavigate).toHaveBeenCalledWith('/player/game')
    })
  })

  // Test: Wanneer activeGame wordt verwijderd (newValue === null),
  // wordt playerActiveGame verwijderd en genavigeerd naar /player/waiting
  test('Storage event clear: removing activeGame navigates to /player/waiting and clears playerActiveGame', async () => {
    sessionStorage.setItem('playerNumber', '8')
    sessionStorage.setItem('playerSessionId', 'sess-8')
    sessionStorage.setItem('playerActiveGame', JSON.stringify({ gameName: 'x' }))

    render(
      <BrowserRouter>
        <WaitingRoom />
      </BrowserRouter>
    )

    const evt = new StorageEvent('storage', { key: 'activeGame', newValue: null })
    window.dispatchEvent(evt)

    await waitFor(() => {
      expect(sessionStorage.getItem('playerActiveGame')).toBeNull()
      expect(mockNavigate).toHaveBeenCalledWith('/player/waiting')
    })
  })

  // Test: Zelfde-tab fallback - een CustomEvent 'activeGameInfoChanged' moet
  // ook de enterGame flow activeren en navigatie uitvoeren
  test('Same-tab custom event activeGameInfoChanged triggers enterGame and navigation', async () => {
    sessionStorage.setItem('playerNumber', '9')
    sessionStorage.setItem('playerSessionId', 'sess-9')

    render(
      <BrowserRouter>
        <WaitingRoom />
      </BrowserRouter>
    )

    const details = { game: 'sameTab', gameName: 'Same Tab Game', sessionId: 'sess-9' }
    const ce = new CustomEvent('activeGameInfoChanged', { detail: details })
    window.dispatchEvent(ce)

    await waitFor(() => {
      const stored = sessionStorage.getItem('playerActiveGame')
      expect(stored).toBeTruthy()
      const parsed = JSON.parse(stored as string)
      expect(parsed.gameName).toBe('Same Tab Game')
      expect(mockNavigate).toHaveBeenCalledWith('/player/game')
    })
  })
})
