import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { vi, describe, beforeEach, expect, test, afterEach } from 'vitest'

// mock useNavigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

import PlayerGame from './PlayerGame'
import { fetchPlayersForSession } from '../../api'

// mock api module
vi.mock('../../api', () => ({
  fetchPlayersForSession: vi.fn(() => Promise.resolve({ players: [] })),
  postPlayerHeartbeat: vi.fn(() => Promise.resolve({ success: true })),
}))

describe('PlayerGame', () => {
  beforeEach(() => {
    sessionStorage.clear()
    localStorage.clear()
    mockNavigate.mockClear()
    if (typeof vi !== 'undefined' && vi.clearAllMocks) vi.clearAllMocks()
  })

  afterEach(() => {
    sessionStorage.clear()
    localStorage.clear()
    mockNavigate.mockClear()
  })

  // Test: controleert dat de titel van de pagina wordt gehaald uit sessionStorage.playerActiveGame;
  // als zowel `gameName` als `game` aanwezig zijn, krijgt `gameName` voorrang.
  test('renders title from sessionStorage.playerActiveGame (gameName preferred)', () => {
    const active = { gameName: 'My Fancy Game', game: 'fallback' }
    sessionStorage.setItem('playerActiveGame', JSON.stringify(active))

    render(<PlayerGame />)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('My Fancy Game')
  })

  // Test: controleert dat wanneer `gameName` ontbreekt de `game`-waarde als fallback gebruikt wordt
  test('renders title from sessionStorage.playerActiveGame game fallback when gameName missing', () => {
    const active = { game: 'fallbackGame' }
    sessionStorage.setItem('playerActiveGame', JSON.stringify(active))

    render(<PlayerGame />)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('fallbackGame')
  })

  // Test: controleert dat varianten van de titel (zoals "(Niet zo) slimme thermostaat")
  // gematched worden naar de `slimmethermostaat` beschrijvingen en de juiste tekst tonen
  test('description resolves to slimmethermostaat for variants like "(Niet zo) slimme thermostaat"', async () => {
    const active = { gameName: '(Niet zo) slimme thermostaat', category: '8-10 jaar' }
    sessionStorage.setItem('playerActiveGame', JSON.stringify(active))
    sessionStorage.setItem('playerSessionId', 'sess-1')
    sessionStorage.setItem('playerNumber', '1')

    render(<PlayerGame />)

    // description text from gameDescriptions.slimmethermostaat for 8-10 jaar
    await waitFor(() => {
      expect(screen.getByText(/Speel met knoppen om de kamertemperatuur comfortabel te houden\./i)).toBeInTheDocument()
    })
  })

  // Test: controleert dat een onbekende gamenaam terugvalt op de `default`-beschrijvingen
  test('unknown game falls back to default descriptions', () => {
    const active = { gameName: 'TotallyUnknownGame', category: '14-16 jaar' }
    sessionStorage.setItem('playerActiveGame', JSON.stringify(active))

    render(<PlayerGame />)

    expect(screen.getByText(/Een complexere variant met extra diepgang voor 14-16 jaar\./i)).toBeInTheDocument()
  })

  // Test: wanneer de API `fetchPlayersForSession` een speler teruggeeft,
  // toont de UI de spelersnaam en wordt de beschrijving op basis van die speler's category gekozen
  test('fetchPlayersForSession: when player found shows player name and uses player category description', async () => {
    sessionStorage.setItem('playerSessionId', 'sess-2')
    sessionStorage.setItem('playerNumber', '7')
    // set active game without category so fetch result determines category
    sessionStorage.setItem('playerActiveGame', JSON.stringify({ gameName: 'passwordzapper', day: 'Vrijdag' }))

    ;(fetchPlayersForSession as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ players: [ { playerNumber: '7', name: 'Sanne', category: '14-16 jaar' } ] })

    render(<PlayerGame />)

    await waitFor(() => {
      expect(screen.getByText(/Sanne, welkom bij het spel/i)).toBeInTheDocument()
      expect(screen.getByText(/Zweef door de ruimte en analyseer complexe wachtwoorden/i)).toBeInTheDocument()
    })
  })

  // Test: bij een API-fout of als de speler niet gevonden wordt, wordt de category uit
  // `playerActiveGame` als fallback gebruikt voor de beschrijving
  test('API error or missing player uses category from active info as fallback', async () => {
    sessionStorage.setItem('playerSessionId', 'sess-3')
    sessionStorage.setItem('playerNumber', '9')
    sessionStorage.setItem('playerActiveGame', JSON.stringify({ gameName: 'getalrace', category: '11-13 jaar' }))

    ;(fetchPlayersForSession as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('network'))

    render(<PlayerGame />)

    await waitFor(() => {
      // default getalrace text for 11-13 jaar
      expect(screen.getByText(/Klik de juiste cijfers in volgorde onder tijdsdruk\./i)).toBeInTheDocument()
    })
  })

  // Test: controleert `normalizeCategory`-achtige mapping door verschillende
  // categorie-formaten (zoals '8 - 10 jaar' of numerieke input) te ondersteunen
  test('normalizeCategory mapping works for different inputs', async () => {
    // test with variant category strings in active info
    sessionStorage.setItem('playerActiveGame', JSON.stringify({ gameName: 'reactietijdtest', category: '8 - 10 jaar' }))
    render(<PlayerGame />)
    await waitFor(() => expect(screen.getByText(/Klik zo snel mogelijk wanneer je het signaal ziet\./i)).toBeInTheDocument())

    // numeric only fallback
    sessionStorage.setItem('playerActiveGame', JSON.stringify({ gameName: 'reactietijdtest', category: '14' }))
    render(<PlayerGame />)
    await waitFor(() => expect(screen.getByText(/Meet je reactietijd tot op milliseconden\./i)).toBeInTheDocument())
  })

  // Test: zorgt dat titels met diakritische tekens, extra spaties, of prefixen
  // zoals '(Niet zo)' correct gemapt worden naar de juiste game-key
  test('findGameKeyForTitle handles diacritics, spaces, nietzo prefix and fuzzy matches', async () => {
    // diacritics and spaces: provide title with spaces/caps
    sessionStorage.setItem('playerActiveGame', JSON.stringify({ gameName: ' Slimme   Thermostaat ' , category: '11-13 jaar' }))
    render(<PlayerGame />)
    await waitFor(() => expect(screen.getByText(/Stel slimme schema’s in en leer over energiegebruik en comfort\./i)).toBeInTheDocument())

    // nietzo prefix
    sessionStorage.setItem('playerActiveGame', JSON.stringify({ gameName: '(Niet zo) slimme thermostaat', category: '8-10 jaar' }))
    render(<PlayerGame />)
    await waitFor(() => expect(screen.getByText(/Speel met knoppen om de kamertemperatuur comfortabel te houden\./i)).toBeInTheDocument())
  })

  // Test: wanneer de organizer `activeGame` verwijdert (newValue === null),
  // wordt `playerActiveGame` verwijderd en genavigeerd naar '/player/waiting'
  test('Storage event remove activeGame navigates to /player/waiting and clears playerActiveGame', async () => {
    sessionStorage.setItem('playerActiveGame', JSON.stringify({ gameName: 'x' }))
    render(<PlayerGame />)

    const evt = new StorageEvent('storage', { key: 'activeGame', newValue: null })
    window.dispatchEvent(evt)

    await waitFor(() => {
      expect(sessionStorage.getItem('playerActiveGame')).toBeNull()
    })
    expect(mockNavigate).toHaveBeenCalledWith('/player/waiting')
  })

  // Test: wanneer een nieuwe `activeGame` in localStorage wordt gezet via een
  // storage event, wordt `sessionStorage.playerActiveGame` bijgewerkt met de mapped waarde
  test('Storage event new activeGame updates sessionStorage.playerActiveGame', async () => {
    render(<PlayerGame />)

    const payload = { game: 'testgame', gameName: 'Test Game', sessionId: 'sess-7', day: 'Dinsdag' }
    const evt = new StorageEvent('storage', { key: 'activeGame', newValue: JSON.stringify(payload) })
    window.dispatchEvent(evt)

    await waitFor(() => {
      const stored = sessionStorage.getItem('playerActiveGame')
      expect(stored).toBeTruthy()
      const parsed = JSON.parse(stored as string)
      expect(parsed.gameName).toBe('Test Game')
    })
  })

  // Test: dezelfde-tab fallback: bij het dispatchen van `activeGameInfoChanged` als CustomEvent
  // wordt `sessionStorage.playerActiveGame` bijgewerkt en (na her-render) de UI geüpdatet
  test('Custom event activeGameInfoChanged updates sessionStorage and UI', async () => {
    // initial render - no active game
    const { rerender } = render(<PlayerGame />)

    const details = { game: 'getalrace', gameName: 'getalrace', category: '8-10 jaar', day: 'Dinsdag' }
    const ce = new CustomEvent('activeGameInfoChanged', { detail: details })
    window.dispatchEvent(ce)

    // wait for sessionStorage to be updated by the event handler
    await waitFor(() => {
      const stored = sessionStorage.getItem('playerActiveGame')
      expect(stored).toBeTruthy()
      const parsed = JSON.parse(stored as string)
      expect(parsed.gameName || parsed.game).toBe('getalrace')
    })

    // component reads sessionStorage on mount, so re-render to pick up new value
    rerender(<PlayerGame />)

    // UI: title and description for getalrace 8-10 jaar
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/getalrace/i)
    expect(screen.getByText(/Zoek de getallen in de juiste volgorde zo snel mogelijk\./i)).toBeInTheDocument()
  })

  // Test: controleert dat welkomstekst samenvoegt: spelersnaam, dag en category
  // wanneer deze beschikbaar zijn uit API / sessionStorage
  test('UI composition includes player name, day and category when available', async () => {
    sessionStorage.setItem('playerSessionId', 'sess-9')
    sessionStorage.setItem('playerNumber', '11')
    sessionStorage.setItem('playerActiveGame', JSON.stringify({ gameName: 'getalrace', day: 'Maandag' }))

    ;(fetchPlayersForSession as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ players: [ { playerNumber: '11', name: 'Joris', category: '8-10 jaar' } ] })

    render(<PlayerGame />)

    await waitFor(() => {
      expect(screen.getByText(/Joris, welkom bij het spel - Maandag - 8-10 jaar/i)).toBeInTheDocument()
    })
  })
})
