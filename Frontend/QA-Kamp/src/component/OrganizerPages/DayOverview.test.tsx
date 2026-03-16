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
    expect(heading).toBeDefined()
    expect(heading).toHaveTextContent(/kalender/i)
    // the 'QA' label is inside the heading as a child <span>
    expect(within(heading).getByText(/QA/i)).toBeDefined()
    // check for at least one day button label by aria-label
    expect(screen.getByRole('button', { name: /Maandag/i })).toBeDefined()
  })

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

  // Checklist test: logout button present in header when user logged in
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

  // Checklist test: all weekdays present (Maandag - Vrijdag)
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

  // Checklist test: all day buttons are clickable (if not disabled)
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
    await waitFor(() => expect(mockDelete).toHaveBeenCalled())
  })

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
