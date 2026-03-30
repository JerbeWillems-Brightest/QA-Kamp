import { render, screen, waitFor, cleanup } from '@testing-library/react'
import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'

// The component under test
import MinigamePage from './MinigamePage'

// Mock the PasswordZapperGame child so tests focus on MinigamePage behavior
vi.mock('./PasswordZapperGame', () => {
  return {
    default: (props: { ageGroup?: string }) => (
      <div data-testid="passwordzapper-mock" data-age={props.ageGroup} />
    )
  }
})

describe('MinigamePage', () => {
  const originalPath = window.location.pathname + window.location.search

  beforeEach(() => {
    // reset DOM and storages
    cleanup()
    sessionStorage.clear()
    localStorage.clear()
    // set a predictable URL without mutating window.location (path-only)
    window.history.replaceState({}, '', '/')
  })

  afterEach(() => {
    // restore original path/search
    try { window.history.replaceState({}, '', originalPath) } catch { /* ignore */ }
    vi.restoreAllMocks()
  })

  it('renders PasswordZapperGame with ageGroup from query param', async () => {
    window.history.replaceState({}, '', '/?game=passwordzapper&age=14-16')

    render(
      <MemoryRouter>
        <MinigamePage />
      </MemoryRouter>
    )

    const mock = await screen.findByTestId('passwordzapper-mock')
    expect(mock).toBeInTheDocument()
    expect(mock).toHaveAttribute('data-age', '14-16')
  })

  it('uses sessionStorage playerCategory when age param is absent', async () => {
    sessionStorage.setItem('playerCategory', '8-10')
    window.history.replaceState({}, '', '/?game=passwordzapper')

    render(
      <MemoryRouter>
        <MinigamePage />
      </MemoryRouter>
    )

    const mock = await screen.findByTestId('passwordzapper-mock')
    expect(mock).toBeInTheDocument()
    expect(mock).toHaveAttribute('data-age', '8-10')
  })

  it('hint button is initially disabled and unlocks after global event', async () => {
    window.history.replaceState({}, '', '/?game=passwordzapper')

    render(
      <MemoryRouter>
        <MinigamePage />
      </MemoryRouter>
    )

    const hintButton = screen.getByLabelText('Hint') as HTMLButtonElement
    expect(hintButton).toBeInTheDocument()
    expect(hintButton.disabled).toBe(true)

    // dispatch the global event that the game uses to signal hints unlocked
    window.dispatchEvent(new CustomEvent('minigame:hint-unlocked'))

    await waitFor(() => {
      expect(hintButton.disabled).toBe(false)
    })
  })

  it('shows fallback content when game param is unknown', async () => {
    window.history.replaceState({}, '', '/?game=unknown')

    render(
      <MemoryRouter>
        <MinigamePage />
      </MemoryRouter>
    )

    const matches = screen.getAllByText(/Onbekend spel/i)
    expect(matches.length).toBeGreaterThan(0)
  })
})

