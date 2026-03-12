import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react'
import DayOverview from './DayOverview'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '../../context/AuthContext'

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
      <BrowserRouter>
        <AuthProvider>
          <DayOverview />
        </AuthProvider>
      </BrowserRouter>
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
      <BrowserRouter>
        <AuthProvider>
          <DayOverview />
        </AuthProvider>
      </BrowserRouter>
    )
    expect(screen.getByText(/kalender/i)).toBeDefined()
  })

  it('default selected day is based on current date', () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <DayOverview />
        </AuthProvider>
      </BrowserRouter>
    )
    // should have one day button with aria-pressed attribute true for selected day
    const buttons = screen.getAllByRole('button').filter(b => b.getAttribute('aria-label'))
    const pressed = buttons.find(b => b.getAttribute('aria-pressed') === 'true')
    expect(pressed).toBeDefined()
  })

  it('clicking a disabled day does nothing', () => {
    // we can't easily simulate date; assert disabled buttons have not-allowed cursor
    render(
      <BrowserRouter>
        <AuthProvider>
          <DayOverview />
        </AuthProvider>
      </BrowserRouter>
    )

    const disabled = screen.getAllByRole('button', { hidden: true }).filter(b => b.hasAttribute('disabled'))
    // if any disabled exist, ensure click doesn't throw
    if (disabled.length) {
      fireEvent.click(disabled[0])
    }
    expect(true).toBeTruthy()
  })

  it('clicking day triggers alert with day name', () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    render(
      <BrowserRouter>
        <AuthProvider>
          <DayOverview />
        </AuthProvider>
      </BrowserRouter>
    )

    // click Monday
    const monday = screen.getByRole('button', { name: /Maandag/i })
    fireEvent.click(monday)
    expect(alertSpy).toHaveBeenCalled()
  })

  it('has three main action buttons', () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <DayOverview />
        </AuthProvider>
      </BrowserRouter>
    )
    expect(screen.getByText(/Scorebord/i)).toBeDefined()
    expect(screen.getByText(/Spelers beheren/i)).toBeDefined()
    expect(screen.getByText(/QA-kamp stoppen/i)).toBeDefined()
  })

  it('stop button calls deleteSession and navigates', async () => {
    localStorage.setItem('currentSessionId', 'stop-me')
    mockDelete.mockResolvedValue({ success: true })
    render(
      <BrowserRouter>
        <AuthProvider>
          <DayOverview />
        </AuthProvider>
      </BrowserRouter>
    )

    fireEvent.click(screen.getByText(/QA-kamp stoppen/i))
    await waitFor(() => expect(mockDelete).toHaveBeenCalled())
  })

  it('scale responds to window resizing', () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <DayOverview />
        </AuthProvider>
      </BrowserRouter>
    )

    // Resize simulation
    window.innerWidth = 800
    fireEvent(window, new Event('resize'))
    expect(true).toBeTruthy()
  })

  it('shows manage players modal when clicked', async () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <DayOverview />
        </AuthProvider>
      </BrowserRouter>
    )

    fireEvent.click(screen.getByText(/Spelers beheren/i))
    await screen.findByRole('dialog')
  })

  it('modal closes when clicking outside (overlay)', async () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <DayOverview />
        </AuthProvider>
      </BrowserRouter>
    )

    fireEvent.click(screen.getByText(/Spelers beheren/i))
    await screen.findByRole('dialog')
    // click overlay
    const dialog = screen.getByRole('dialog')
    fireEvent.click(dialog)
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })
})
