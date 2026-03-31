import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { vi, describe, it, beforeEach, expect } from 'vitest'
import { MemoryRouter } from 'react-router-dom'

// Mock api module used by the component to avoid real network calls
vi.mock('../../api', () => ({
  setPlayerOnline: vi.fn(() => Promise.resolve({ success: true })),
  setPlayerOffline: vi.fn(() => Promise.resolve({ success: true })),
  postPlayerHeartbeat: vi.fn(() => Promise.resolve({ success: true })),
}))

import PasswordZapperGame from './PasswordZapperGame.tsx'

describe('PasswordZapperGame start modal', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    localStorage.clear()
    sessionStorage.clear()
  })

  it('shows the rules modal before the game starts', async () => {
    render(
      <MemoryRouter>
        <PasswordZapperGame ageGroup={'11-13'} />
      </MemoryRouter>
    )

    expect(screen.getByRole('heading', { name: /Speluitleg - Password zapper/i })).toBeInTheDocument()
    expect(screen.getByText(/Je ziet een ruimteschip on het scherm|Je ziet een ruimteschip op het scherm/i)).toBeDefined()
    expect(screen.getByRole('button', { name: /Volgende/i })).toBeInTheDocument()
  })

  it('shows age-specific examples and starts the game when clicking Volgende', async () => {
    render(
      <MemoryRouter>
        <PasswordZapperGame ageGroup={'8-10'} />
      </MemoryRouter>
    )

    // examples for 8-10 are emojis and a sample strong pw; check both are rendered
    expect(screen.getByText(/🧾✨/)).toBeInTheDocument()
    expect(screen.getByText(/Zon!Maan9/)).toBeInTheDocument()

    const btn = screen.getByRole('button', { name: /Volgende/i })
    fireEvent.click(btn)

    // After starting, the score element should appear
    const score = await screen.findByText(/Score:/i)
    expect(score).toBeInTheDocument()
  })
})
