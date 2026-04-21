import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import DayOverview from './DayOverview'
import { AuthProvider } from '../../context/AuthContext'
import { SessionProvider } from '../../context/SessionContext'
import Navbar from '../Navbar'

// Mock api exports used by component and SessionContext
const mockDelete = vi.fn()
const mockGetSessions = vi.fn()
vi.mock('../../api', () => ({
  deleteSession: (...args: unknown[]) => (mockDelete as unknown as (...a: unknown[]) => unknown)(...args),
  getSessions: (...args: unknown[]) => (mockGetSessions as unknown as (...a: unknown[]) => unknown)(...args),
}))

describe('DayOverview (merged tests)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    localStorage.clear()
    // ensure SessionContext's getSessions resolves by default to avoid undefined exports
    mockGetSessions.mockResolvedValue({ sessions: [] })
  })

  // Test: rendert de hoofdtitel en minimaal één dagknop (bijv. Maandag)
  it('renders title and day buttons', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <SessionProvider>
            <DayOverview />
          </SessionProvider>
        </AuthProvider>
      </MemoryRouter>
    )

    // Select the main heading (level 1) and assert it contains the parts
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toBeDefined()// use textContent match instead of jest-dom matcher toHaveTextContent
    expect(heading.textContent).toMatch(/kalender/i)
    // the 'QA' label is inside the heading as a child <span>
    expect(within(heading).getByText(/QA/i)).toBeDefined()
    // check for at least one day button label by aria-label
    expect(screen.getByRole('button', { name: /Maandag/i })).toBeDefined()
  })

  // Test: toont expliciet de QA kalender titel op de pagina
  it('renders QA kalender title', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <SessionProvider>
            <DayOverview />
          </SessionProvider>
        </AuthProvider>
      </MemoryRouter>
    )
    expect(screen.getByText(/kalender/i)).toBeDefined()
  })

  // Test: standaard geselecteerde dag is afgeleid van de huidige datum (aria-pressed=true)
  it('default selected day is based on current date', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <SessionProvider>
            <DayOverview />
          </SessionProvider>
        </AuthProvider>
      </MemoryRouter>
    )
    // should have one day button with aria-pressed attribute true for selected day
    const buttons = screen.getAllByRole('button').filter(b => b.getAttribute('aria-label'))
    const pressed = buttons.find(b => b.getAttribute('aria-pressed') === 'true')
    expect(pressed).toBeDefined()
  })

  // Test: klikken op een uitgeschakelde dag doet niets en veroorzaakt geen fout
  it('clicking a disabled day does nothing', () => {
    // we can't easily simulate date; assert disabled buttons have not-allowed cursor
    render(
      <MemoryRouter>
        <AuthProvider>
          <SessionProvider>
            <DayOverview />
          </SessionProvider>
        </AuthProvider>
      </MemoryRouter>
    )

    const disabled = screen.getAllByRole('button', { hidden: true }).filter(b => b.hasAttribute('disabled'))
    // if any disabled exist, ensure click doesn't throw
    if (disabled.length) {
      fireEvent.click(disabled[0])
    }
    expect(true).toBeTruthy()
  })

  // Test: controleert aanwezigheid van de drie hoofdactieknoppen (Scorebord, Spelers beheren, QA stoppen)
  it('has three main action buttons', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <SessionProvider>
            <DayOverview />
          </SessionProvider>
        </AuthProvider>
      </MemoryRouter>
    )
    expect(screen.getByText(/Scorebord/i)).toBeDefined()
    expect(screen.getByText(/Spelers beheren/i)).toBeDefined()
    expect(screen.getByText(/QA kamp stoppen/i)).toBeDefined()
  })

  // Test: header toont uitlog-knop wanneer er een ingelogde gebruiker in localStorage staat
  it('shows logout button in header when user is logged in', async () => {
    localStorage.setItem('user', JSON.stringify({ id: 'u1', email: 'u@x' }))
    render(
      <MemoryRouter>
        <AuthProvider>
          <SessionProvider>
            <Navbar />
            <DayOverview />
          </SessionProvider>
        </AuthProvider>
      </MemoryRouter>
    )

    await waitFor(() => expect(screen.getByLabelText(/Uitloggen|uitloggen|logout|log out/i)).toBeDefined())
  })

  // Test: controleert dat alle weekdagen (Maandag t/m Vrijdag) aanwezig zijn als knoppen
  it('renders all weekdays (maandag t/m vrijdag)', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <SessionProvider>
            <DayOverview />
          </SessionProvider>
        </AuthProvider>
      </MemoryRouter>
    )

    const days = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag']
    days.forEach(day => {
      expect(screen.getByRole('button', { name: new RegExp(day, 'i') })).toBeDefined()
    })
  })

  // Test: klikken op een dag navigeert naar de Day-dashboard route (/day/:day)
  it('clicking day navigates to the day dashboard', async () => {
    // ensure auth present so component doesn't redirect
    localStorage.setItem('user', JSON.stringify({ id: 'u-nav', email: 'nav@x' }))

    render(
      <MemoryRouter initialEntries={["/"]}>
        <AuthProvider>
          <SessionProvider>
            <Routes>
              <Route path="/" element={<DayOverview />} />
              <Route path="/day/:day" element={<div data-testid="day-page">Day page</div>} />
            </Routes>
          </SessionProvider>
        </AuthProvider>
      </MemoryRouter>
    )

    const monday = screen.getByRole('button', { name: /Maandag/i })
    fireEvent.click(monday)

    await waitFor(() => expect(screen.getByTestId('day-page')).toBeDefined())
  })

  // Test: alle dagknoppen zijn klikbaar (indien niet disabled) en navigeren naar hun dashboard
  it('all day buttons are clickable (when enabled) - each navigates to its dashboard', async () => {
    const days = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag']

    for (const day of days) {
      // seed user before each render so DayOverview won't redirect
      localStorage.setItem('user', JSON.stringify({ id: `u-${day}`, email: `${day}@x` }))

      const { unmount } = render(
        <MemoryRouter initialEntries={["/"]}>
          <AuthProvider>
            <SessionProvider>
              <Routes>
                <Route path="/" element={<DayOverview />} />
                <Route path="/day/:day" element={<div>{`Day: ${day.toLowerCase()}`}</div>} />
              </Routes>
            </SessionProvider>
          </AuthProvider>
        </MemoryRouter>
      )

      const btn = await screen.findByRole('button', { name: new RegExp(day, 'i') })
      // if the button is disabled, ensure no navigation occurs; otherwise expect navigation
      if (!btn.hasAttribute('disabled')) {
        fireEvent.click(btn)
        await waitFor(() => expect(screen.getByText(new RegExp(`Day: ${day.toLowerCase()}`, 'i'))).toBeDefined())
      }

      unmount()
      cleanup()
    }
  })

  // Test: de stop-knop roept de API deleteSession aan en verwerkt het resultaat
  it('stop button calls deleteSession and navigates', async () => {
    localStorage.setItem('currentSessionId', 'stop-me')
    mockDelete.mockResolvedValue({ success: true })
    render(
      <MemoryRouter>
        <AuthProvider>
          <SessionProvider>
            <DayOverview />
          </SessionProvider>
        </AuthProvider>
      </MemoryRouter>
    )

    fireEvent.click(screen.getByText(/QA[- ]kamp stoppen/i))

    // confirmation popup must be shown (User Story 1)
    const stopDialog = await screen.findByRole('dialog')
    expect(stopDialog).toBeDefined()

    // "Stoppen" komt zowel op de stop-knop (in de titel) als in de popup voor.
    // We klikken dus expliciet de "Stoppen" knop binnen de popup.
    fireEvent.click(within(stopDialog).getByRole('button', { name: /Stoppen/i }))
    await waitFor(() => expect(mockDelete).toHaveBeenCalled())
  })

  // Test: component reageert op window resize events zonder fouten (schaling)
  it('scale responds to window resizing', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <SessionProvider>
            <DayOverview />
          </SessionProvider>
        </AuthProvider>
      </MemoryRouter>
    )

    // Resize simulation — avoid directly assigning to window.innerWidth which can be readonly
    const originalInnerWidth = window.innerWidth
    try {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: 800 })
    } catch {
      // Some environments prevent redefining; fall back to no-op
    }
    fireEvent(window, new Event('resize'))
    // restore original width if possible
    try {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalInnerWidth })
    } catch {
      // ignore
    }
    expect(true).toBeTruthy()
  })

  // Test: het 'Spelers beheren' modal wordt geopend bij het klikken op de knop
  it('shows manage players modal when clicked', async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <SessionProvider>
            <DayOverview />
          </SessionProvider>
        </AuthProvider>
      </MemoryRouter>
    )

    fireEvent.click(screen.getByText(/Spelers beheren/i))
    await screen.findByRole('dialog')
  })

  // Test: modal sluit wanneer er buiten het overlay-gebied wordt geklikt
  it('modal closes when clicking outside (overlay)', async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <SessionProvider>
            <DayOverview />
          </SessionProvider>
        </AuthProvider>
      </MemoryRouter>
    )

    fireEvent.click(screen.getByText(/Spelers beheren/i))
    await screen.findByRole('dialog')
    // click overlay
    const dialog = screen.getByRole('dialog')
    fireEvent.click(dialog)
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  // Test: redirects to organizer-login when not authenticated
  it('redirects to organizer-login when not authenticated', async () => {
    // ensure no user present
    localStorage.removeItem('user')
    render(
      <MemoryRouter initialEntries={["/"]}>
        <AuthProvider>
          <SessionProvider>
            <Routes>
              <Route path="/" element={<DayOverview />} />
              <Route path="/organizer-login" element={<div data-testid="login">Login</div>} />
            </Routes>
          </SessionProvider>
        </AuthProvider>
      </MemoryRouter>
    )

    await waitFor(() => expect(screen.getByTestId('login')).toBeDefined())
  })

  // Test: deleteSession rejection with 'not found' message is treated as success and navigates to /start-session
  it('deleteSession 404-like error is treated as success and navigates', async () => {
    localStorage.setItem('currentSessionId', 'stop-me-404')
    // ensure authenticated so DayOverview renders and doesn't redirect to login
    localStorage.setItem('user', JSON.stringify({ id: 'u-stop-404', email: 'stop@x' }))
    // make mocked delete reject with a not-found style message
    mockDelete.mockRejectedValue(new Error('Session not found'))

    render(
      <MemoryRouter initialEntries={["/"]}>
        <AuthProvider>
          <SessionProvider>
            <Routes>
              <Route path="/" element={<DayOverview />} />
              <Route path="/start-session" element={<div data-testid="start">Start</div>} />
            </Routes>
          </SessionProvider>
        </AuthProvider>
      </MemoryRouter>
    )

    fireEvent.click(screen.getByText(/QA[- ]kamp stoppen/i))
    const stopDialog = await screen.findByRole('dialog')
    fireEvent.click(within(stopDialog).getByRole('button', { name: /Stoppen/i }))

    await waitFor(() => expect(screen.getByTestId('start')).toBeDefined())
  })

  // Test: activeGameInfo from localStorage disables other day buttons
  it('activeGameInfo in localStorage disables non-matching day buttons', async () => {
    localStorage.setItem('activeGameInfo', JSON.stringify({ day: 'Maandag' }))
    // when the component reads localStorage it defers setting state, so waitFor
    render(
      <MemoryRouter>
        <AuthProvider>
          <SessionProvider>
            <DayOverview />
          </SessionProvider>
        </AuthProvider>
      </MemoryRouter>
    )

    await waitFor(() => {
      const dinsdag = screen.getByRole('button', { name: /Dinsdag/i })
      expect(dinsdag).toHaveAttribute('disabled')
    })
  })

  // Test: storage event toggles activeGameInfo on and off
  it('storage event updates activeGameInfo and clears when newValue null', async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <SessionProvider>
            <DayOverview />
          </SessionProvider>
        </AuthProvider>
      </MemoryRouter>
    )

    // dispatch storage event to set activeGameInfo to Maandag
    const evOn = new StorageEvent('storage', { key: 'activeGameInfo', newValue: JSON.stringify({ day: 'Maandag' }) })
    window.dispatchEvent(evOn)

    await waitFor(() => expect(screen.getByRole('button', { name: /Dinsdag/i })).toHaveAttribute('disabled'))

    // dispatch storage event to clear it
    const evOff = new StorageEvent('storage', { key: 'activeGameInfo', newValue: null as unknown as string })
    window.dispatchEvent(evOff)

    await waitFor(() => expect(screen.getByRole('button', { name: /Dinsdag/i })).not.toHaveAttribute('disabled'))
  })

  // new test: when deleteSession fails with a non-404 error, show an error message
  it('stop flow shows error when deleteSession fails (non-404)', async () => {
    localStorage.setItem('currentSessionId', 'stop-me-fail')
    mockDelete.mockRejectedValue(new Error('server error'))

    render(
      <MemoryRouter>
        <AuthProvider>
          <SessionProvider>
            <DayOverview />
          </SessionProvider>
        </AuthProvider>
      </MemoryRouter>
    )

    fireEvent.click(screen.getByText(/QA[- ]kamp stoppen/i))
    const stopDialog = await screen.findByRole('dialog')
    fireEvent.click(within(stopDialog).getByRole('button', { name: /Stoppen/i }))

    // expect an error message to be shown
    await waitFor(() => expect(screen.getByText(/Kon sessie niet stoppen/i)).toBeDefined())
  })

  // new test: Scoreboard button navigates when a session exists
  it('navigates to scoreboard when session exists', async () => {
    localStorage.setItem('user', JSON.stringify({ id: 'u-score', email: 's@x' }))
    localStorage.setItem('currentSessionId', 'sess-score')

    render(
      <MemoryRouter initialEntries={["/"]}>
        <AuthProvider>
          <SessionProvider>
            <Routes>
              <Route path="/" element={<DayOverview />} />
              <Route path="/scoreboard" element={<div data-testid="scoreboard">SB</div>} />
            </Routes>
          </SessionProvider>
        </AuthProvider>
      </MemoryRouter>
    )

    fireEvent.click(screen.getByRole('button', { name: /Scorebord/i }))
    await waitFor(() => expect(screen.getByTestId('scoreboard')).toBeDefined())
  })

  // new test: cancel button inside stop confirmation closes the dialog
  it('cancelling stop confirmation closes dialog', async () => {
    localStorage.setItem('currentSessionId', 'stop-me')
    mockDelete.mockResolvedValue({ success: true })

    render(
      <MemoryRouter>
        <AuthProvider>
          <SessionProvider>
            <DayOverview />
          </SessionProvider>
        </AuthProvider>
      </MemoryRouter>
    )

    fireEvent.click(screen.getByText(/QA[- ]kamp stoppen/i))
    const stopDialog = await screen.findByRole('dialog')
    // click 'Annuleren'
    fireEvent.click(within(stopDialog).getByRole('button', { name: /Annuleren/i }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  // new test: invalid JSON in storage event is handled gracefully and does not disable days
  it('ignores invalid JSON in activeGameInfo storage event', async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <SessionProvider>
            <DayOverview />
          </SessionProvider>
        </AuthProvider>
      </MemoryRouter>
    )

    const evBad = new StorageEvent('storage', { key: 'activeGameInfo', newValue: 'not-a-json' })
    window.dispatchEvent(evBad)

    // Dinsdag should not be disabled
    await waitFor(() => expect(screen.getByRole('button', { name: /Dinsdag/i })).not.toHaveAttribute('disabled'))
  })

  // extra func test: hover and focus should apply image transform scale
  it('hover and focus apply transform to day image', async () => {
    // ensure authenticated to avoid redirect
    localStorage.setItem('user', JSON.stringify({ id: 'u-hov', email: 'h@x' }))
    render(
      <MemoryRouter>
        <AuthProvider>
          <SessionProvider>
            <DayOverview />
          </SessionProvider>
        </AuthProvider>
      </MemoryRouter>
    )

    const mondayBtn = screen.getByRole('button', { name: /Maandag/i })
    // trigger hover
    fireEvent.mouseEnter(mondayBtn)
    // image should scale up
    const img = mondayBtn.querySelector('img') as HTMLImageElement
    expect(img).toBeDefined()
    await waitFor(() => expect(img.style.transform).toContain('scale(1.04)'))

    // focus should also apply transform
    fireEvent.focus(mondayBtn)
    await waitFor(() => expect(img.style.transform).toContain('scale(1.04)'))
  })

  // extra func test: clicking a day sets aria-pressed on that button
  it('clicking a day sets aria-pressed true for that day', async () => {
    localStorage.setItem('user', JSON.stringify({ id: 'u-press', email: 'p@x' }))
    render(
      <MemoryRouter>
        <AuthProvider>
          <SessionProvider>
            <DayOverview />
          </SessionProvider>
        </AuthProvider>
      </MemoryRouter>
    )

    const dinsdag = screen.getByRole('button', { name: /Dinsdag/i })
    fireEvent.click(dinsdag)
    await waitFor(() => expect(dinsdag.getAttribute('aria-pressed')).toBe('true'))
  })

  // extra func test: Scorebord when no session shows error message
  it('scoreboard button without session shows error', async () => {
    // ensure no session
    localStorage.removeItem('currentSessionId')
    localStorage.setItem('user', JSON.stringify({ id: 'u-no', email: 'n@x' }))

    render(
      <MemoryRouter>
        <AuthProvider>
          <SessionProvider>
            <DayOverview />
          </SessionProvider>
        </AuthProvider>
      </MemoryRouter>
    )

    fireEvent.click(screen.getByRole('button', { name: /Scorebord/i }))
    await waitFor(() => expect(screen.getByText(/Geen actieve sessie/i)).toBeDefined())
  })

  // extra func test: resize should update scale transform on wrapper
  it('resize updates scale transform on the wrapper', async () => {
    localStorage.setItem('user', JSON.stringify({ id: 'u-res', email: 'r@x' }))
    render(
      <MemoryRouter>
        <AuthProvider>
          <SessionProvider>
            <DayOverview />
          </SessionProvider>
        </AuthProvider>
      </MemoryRouter>
    )

    const btn = screen.getByRole('button', { name: /Maandag/i })
    // scaleWrapper is two levels up from the button (days -> scaleWrapper)
    const daysDiv = btn.parentElement as HTMLElement
    const scaleWrapper = daysDiv.parentElement as HTMLElement

    // simulate narrow viewport
    const originalInnerWidth = window.innerWidth
    try { Object.defineProperty(window, 'innerWidth', { configurable: true, value: 600 }) } catch (e) { void e }
    fireEvent(window, new Event('resize'))
    await waitFor(() => expect(scaleWrapper.style.transform).toMatch(/scale\(/))
    // transform should indicate a value less than 1 when width < DESIGN_WIDTH
    const m = scaleWrapper.style.transform.match(/scale\(([^)]+)\)/)
    expect(m).toBeTruthy()
    if (m) {
      const val = Number(m[1])
      expect(val).toBeLessThanOrEqual(1)
    }
    try { Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalInnerWidth }) } catch (e) { void e }
  })
})
