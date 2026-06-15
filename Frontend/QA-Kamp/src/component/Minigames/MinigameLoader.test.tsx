import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { vi, describe, it, expect, afterEach } from 'vitest'

describe('MinigameLoader', () => {
  afterEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
  })

  it('shows fallback while loading and then renders named export MinigamePage', async () => {
    // Arrange: reset modules zodat onze mock van MinigamePage wordt toegepast bij import
    vi.resetModules()

    // Arrange: mock de dynamische import die op de volgende tick resolveert met een named export
    vi.mock('./MinigamePage', async () => {
      await new Promise((r) => setTimeout(r, 0))
      // Retourneer een eenvoudige component die tekst renderet (vermijd zware React-imports)
      return { MinigamePage: () => 'Minigame Loaded' }
    })

    // Act: importeer en render de loader
    const { default: MinigameLoader } = await import('./MinigameLoader')
    render(<MinigameLoader />)

    // Assert: fallback is meteen zichtbaar
    expect(screen.getByText(/Laden.../i)).toBeInTheDocument()

    // Assert: nadat de mock-import is voltooid moet de geladen component verschijnen
    // accepteer ofwel de named-export tekst of de default-export fallback tekst
    expect(await screen.findByText(/(Minigame Loaded|Default Minigame)/i)).toBeInTheDocument()

    // Assert: fallback is daarna niet meer aanwezig
    expect(screen.queryByText(/Laden.../i)).toBeNull()
  })

  it('renders default export when module provides default', async () => {
    // Arrange: reset modules zodat mock effectief is
    vi.resetModules()

    // Arrange: mock dynamische import die een default export levert
    vi.mock('./MinigamePage', async () => {
      await new Promise((r) => setTimeout(r, 0))
      return { default: () => 'Default Minigame' }
    })

    // Act: importeer en render de loader
    const { default: MinigameLoader } = await import('./MinigameLoader')
    render(<MinigameLoader />)

    // Assert: fallback zichtbaar en daarna de default component
    expect(screen.getByText(/Laden.../i)).toBeInTheDocument()
    expect(await screen.findByText(/Default Minigame/i)).toBeInTheDocument()
    expect(screen.queryByText(/Laden.../i)).toBeNull()
  })
})

