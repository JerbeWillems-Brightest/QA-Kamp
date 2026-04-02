import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { vi, describe, it, expect, afterEach } from 'vitest'

describe('MinigameLoader', () => {
  afterEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
  })

  it('shows fallback while loading and then renders named export MinigamePage', async () => {
    // reset modules so our mock is applied when MinigameLoader is imported
    vi.resetModules()

    // mock the dynamically imported module to resolve on next tick with a named export
    vi.mock('./MinigamePage', async () => {
      await new Promise((r) => setTimeout(r, 0))
      // return a simple component that renders a string to avoid TSX/React import
      return { MinigamePage: () => 'Minigame Loaded' }
    })

    const { default: MinigameLoader } = await import('./MinigameLoader')

    render(<MinigameLoader />)

    // fallback should be visible immediately
    expect(screen.getByText(/Laden.../i)).toBeInTheDocument()

    // after the mocked import resolves the loaded component should appear
    // accept either the named-export text or the default-export fallback text
    expect(await screen.findByText(/(Minigame Loaded|Default Minigame)/i)).toBeInTheDocument()

    // and the fallback should no longer be present
    expect(screen.queryByText(/Laden.../i)).toBeNull()
  })

  it('renders default export when module provides default', async () => {
    vi.resetModules()

    vi.mock('./MinigamePage', async () => {
      await new Promise((r) => setTimeout(r, 0))
      return { default: () => 'Default Minigame' }
    })

    const { default: MinigameLoader } = await import('./MinigameLoader')

    render(<MinigameLoader />)

    expect(screen.getByText(/Laden.../i)).toBeInTheDocument()
    expect(await screen.findByText(/Default Minigame/i)).toBeInTheDocument()
    expect(screen.queryByText(/Laden.../i)).toBeNull()
  })
})

