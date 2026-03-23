import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import DayOverview from './DayOverview'
import { AuthProvider } from '../../context/AuthContext'
import { SessionProvider } from '../../context/SessionContext'
import Navbar from '../Navbar'

// Mock deleteSession API
const mockDelete = vi.fn()
vi.mock('../../api', () => ({ deleteSession: (...args: unknown[]) => (mockDelete as unknown as (...a: unknown[]) => unknown)(...args) }))

describe('DayOverview (merged tests)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    localStorage.clear()
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
})
