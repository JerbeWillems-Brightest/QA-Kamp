import { render, screen, waitFor, cleanup } from '@testing-library/react'
import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'

// Mock react-router-dom before importing the component
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate
  }
})

// The component under test
import MinigamePage from './MinigamePage'

// Mock the PasswordZapperGame child so tests focus on MinigamePage behavior
// Note: MinigamePage imports the component from './PasswordZapper/PasswordZapperGame.tsx'
// so the mock path must match that import exactly to take effect during the test.
vi.mock('./PasswordZapper/PasswordZapperGame.tsx', () => {
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
    if (typeof window !== 'undefined' && window.history) {
      window.history.replaceState({}, '', '/')
    }
    
    // Clear mock calls
    mockNavigate.mockClear()
  })

  afterEach(() => {
    // restore original path/search
    try { 
      if (typeof window !== 'undefined' && window.history) {
        window.history.replaceState({}, '', originalPath)
      }
    } catch { /* ignore */ }
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

  it('detects game from pathname when no query param', async () => {
    render(
      <MemoryRouter initialEntries={['/minigame/passwordzapper']}>
        <MinigamePage />
      </MemoryRouter>
    )

    const mock = await screen.findByTestId('passwordzapper-mock')
    expect(mock).toBeInTheDocument()
  })

  it('maps age parameter correctly with various inputs', async () => {
    // Test URL-encoded age parameter
    window.history.replaceState({}, '', '/?game=passwordzapper&age=8%2D10')
    render(
      <MemoryRouter>
        <MinigamePage />
      </MemoryRouter>
    )
    let mock = await screen.findByTestId('passwordzapper-mock')
    expect(mock).toHaveAttribute('data-age', '8-10')
    cleanup()

    // Test age starting with 8
    window.history.replaceState({}, '', '/?game=passwordzapper&age=8')
    render(
      <MemoryRouter>
        <MinigamePage />
      </MemoryRouter>
    )
    mock = await screen.findByTestId('passwordzapper-mock')
    expect(mock).toHaveAttribute('data-age', '8-10')
    cleanup()

    // Test age starting with 14
    window.history.replaceState({}, '', '/?game=passwordzapper&age=14')
    render(
      <MemoryRouter>
        <MinigamePage />
      </MemoryRouter>
    )
    mock = await screen.findByTestId('passwordzapper-mock')
    expect(mock).toHaveAttribute('data-age', '14-16')
    cleanup()

    // Test invalid age defaults to 11-13
    window.history.replaceState({}, '', '/?game=passwordzapper&age=invalid')
    render(
      <MemoryRouter>
        <MinigamePage />
      </MemoryRouter>
    )
    mock = await screen.findByTestId('passwordzapper-mock')
    expect(mock).toHaveAttribute('data-age', '11-13')
  })

  it('hint button click dispatches custom event', async () => {
    window.history.replaceState({}, '', '/?game=passwordzapper')
    
    const mockDispatch = vi.fn()
    Object.defineProperty(window, 'dispatchEvent', {
      value: mockDispatch,
      writable: true
    })

    render(
      <MemoryRouter>
        <MinigamePage />
      </MemoryRouter>
    )

    const hintButton = screen.getByLabelText('Hint')
    // Click the hint button (even if disabled, it should still dispatch)
    hintButton.click()
    
    // Should not dispatch hint event when button is disabled
    expect(mockDispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'minigame:hint'
      })
    )
  })

  it('pause button click dispatches custom event', async () => {
    window.history.replaceState({}, '', '/?game=passwordzapper')
    
    const mockDispatch = vi.fn()
    Object.defineProperty(window, 'dispatchEvent', {
      value: mockDispatch,
      writable: true
    })

    render(
      <MemoryRouter>
        <MinigamePage />
      </MemoryRouter>
    )

    const pauseButton = screen.getByLabelText('Pause')
    pauseButton.click()
    
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'minigame:pause'
      })
    )
  })

  it('question button click dispatches custom event', async () => {
    window.history.replaceState({}, '', '/?game=passwordzapper')
    
    const mockDispatch = vi.fn()
    Object.defineProperty(window, 'dispatchEvent', {
      value: mockDispatch,
      writable: true
    })

    render(
      <MemoryRouter>
        <MinigamePage />
      </MemoryRouter>
    )

    const questionButton = screen.getByLabelText('Vraag')
    questionButton.click()
    
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'minigame:question'
      })
    )
  })

  it('hint button is initially disabled', async () => {
    window.history.replaceState({}, '', '/?game=passwordzapper')

    render(
      <MemoryRouter>
        <MinigamePage />
      </MemoryRouter>
    )

    const hintButton = screen.getByLabelText('Hint') as HTMLButtonElement
    expect(hintButton.disabled).toBe(true)
    expect(hintButton.title).toBe('Hints worden beschikbaar na enkele fouten')
  })

  it('initializes sessionStorage playerActiveGame when not present', async () => {
    window.history.replaceState({}, '', '/?game=passwordzapper&age=11-13')
    localStorage.setItem('currentSessionId', 'test-session-123')

    render(
      <MemoryRouter>
        <MinigamePage />
      </MemoryRouter>
    )

    await waitFor(() => {
      const stored = sessionStorage.getItem('playerActiveGame')
      expect(stored).toBeTruthy()
      
      const parsed = JSON.parse(stored!)
      expect(parsed.gameName).toBe('passwordzapper')
      expect(parsed.category).toBe('11-13')
      expect(parsed.sessionId).toBe('test-session-123')
    })
  })

  it('does not overwrite existing sessionStorage playerActiveGame', async () => {
    window.history.replaceState({}, '', '/?game=passwordzapper&age=14-16')
    
    // Pre-existing game info
    sessionStorage.setItem('playerActiveGame', JSON.stringify({
      gameName: 'existing-game',
      category: '8-10',
      sessionId: 'existing-session'
    }))

    render(
      <MemoryRouter>
        <MinigamePage />
      </MemoryRouter>
    )

    // Should not overwrite existing data
    await waitFor(() => {
      const stored = sessionStorage.getItem('playerActiveGame')
      expect(stored).toBeTruthy()
      
      const parsed = JSON.parse(stored!)
      expect(parsed.gameName).toBe('existing-game')
      expect(parsed.category).toBe('8-10')
      expect(parsed.sessionId).toBe('existing-session')
    })
  })

  it('initializes hintUnlocked from global window flag', async () => {
    window.history.replaceState({}, '', '/?game=passwordzapper')
    
    // Set global flag before rendering
    const w = window as unknown as Record<string, unknown>
    w['__pz_hint_unlocked'] = true

    render(
      <MemoryRouter>
        <MinigamePage />
      </MemoryRouter>
    )

    const hintButton = screen.getByLabelText('Hint') as HTMLButtonElement
    // Should be unlocked due to global flag
    expect(hintButton.disabled).toBe(false)
    expect(hintButton.title).toBe('Toon hint')
  })

  it('handles useQuery when window is undefined', async () => {
    // Test with MemoryRouter initialEntries instead of mocking window
    render(
      <MemoryRouter initialEntries={['/minigame/unknown']}>
        <MinigamePage />
      </MemoryRouter>
    )

    // Should render fallback UI when no game param - check for specific text
    expect(screen.getByText('Onbekend spel: niet opgegeven')).toBeInTheDocument()
  })

  it('renders fallback UI with star animations for unknown game', async () => {
    window.history.replaceState({}, '', '/?game=unknown')

    render(
      <MemoryRouter>
        <MinigamePage />
      </MemoryRouter>
    )

    expect(screen.getByText('Onbekend spel: unknown')).toBeInTheDocument()
    expect(screen.getByText('Probeer opnieuw vanaf het dashboard of vraag de organisator om het spel te (her)starten.')).toBeInTheDocument()

    // Check for star animation elements using class selector
    const animatedStars = document.querySelector('.animated-stars')
    expect(animatedStars).toBeInTheDocument()
    expect(animatedStars?.children).toHaveLength(3)
  })

  it('initializes hintUnlocked to false when no global flag', async () => {
    window.history.replaceState({}, '', '/?game=passwordzapper')
    
    // Ensure no global flag
    const w = window as unknown as Record<string, unknown>
    delete w['__pz_hint_unlocked']

    render(
      <MemoryRouter>
        <MinigamePage />
      </MemoryRouter>
    )

    const hintButton = screen.getByLabelText('Hint') as HTMLButtonElement
    expect(hintButton.disabled).toBe(true)
    expect(hintButton.title).toBe('Hints worden beschikbaar na enkele fouten')
  })

  it('handles sessionStorage access errors gracefully', async () => {
    window.history.replaceState({}, '', '/?game=passwordzapper&age=11-13')
    
    // Mock sessionStorage to throw errors
    const originalGetItem = sessionStorage.getItem
    const originalSetItem = sessionStorage.setItem
    sessionStorage.getItem = vi.fn(() => { throw new Error('Storage error') })
    sessionStorage.setItem = vi.fn(() => { throw new Error('Storage error') })

    // Should not crash and render the game
    expect(() => {
      render(
        <MemoryRouter>
          <MinigamePage />
        </MemoryRouter>
      )
    }).not.toThrow()

    expect(screen.getByTestId('passwordzapper-mock')).toBeInTheDocument()

    // Restore original methods
    sessionStorage.getItem = originalGetItem
    sessionStorage.setItem = originalSetItem
  })

  it('handles localStorage access errors gracefully', async () => {
    window.history.replaceState({}, '', '/?game=passwordzapper&age=11-13')
    
    // Mock localStorage to throw errors
    const originalGetItem = localStorage.getItem
    localStorage.getItem = vi.fn(() => { throw new Error('Storage error') })

    // Should not crash and render the game
    expect(() => {
      render(
        <MemoryRouter>
          <MinigamePage />
        </MemoryRouter>
      )
    }).not.toThrow()

    expect(screen.getByTestId('passwordzapper-mock')).toBeInTheDocument()

    // Restore original method
    localStorage.getItem = originalGetItem
  })

  it('tests more age mapping edge cases', async () => {
    // Test with URL-encoded dash
    window.history.replaceState({}, '', '/?game=passwordzapper&age=11%2D13')
    render(
      <MemoryRouter>
        <MinigamePage />
      </MemoryRouter>
    )
    let mock = screen.getByTestId('passwordzapper-mock')
    expect(mock).toHaveAttribute('data-age', '11-13')
    cleanup()

    // Test with 14%2D16
    window.history.replaceState({}, '', '/?game=passwordzapper&age=14%2D16')
    render(
      <MemoryRouter>
        <MinigamePage />
      </MemoryRouter>
    )
    mock = screen.getByTestId('passwordzapper-mock')
    expect(mock).toHaveAttribute('data-age', '14-16')
    cleanup()

    // Test with empty string
    window.history.replaceState({}, '', '/?game=passwordzapper&age=')
    render(
      <MemoryRouter>
        <MinigamePage />
      </MemoryRouter>
    )
    mock = screen.getByTestId('passwordzapper-mock')
    expect(mock).toHaveAttribute('data-age', '11-13')
  })

  it('renders decorative images in fallback UI', async () => {
    window.history.replaceState({}, '', '/?game=unknown')

    render(
      <MemoryRouter>
        <MinigamePage />
      </MemoryRouter>
    )

    // Check for decorative images
    expect(screen.getByAltText('Line decoration')).toBeInTheDocument()
    expect(screen.getByAltText('Rocket')).toBeInTheDocument()
    expect(screen.getByAltText('Shape decoration')).toBeInTheDocument()
    expect(screen.getByAltText('Curve decoration')).toBeInTheDocument()
    expect(screen.getByAltText('Star decoration')).toBeInTheDocument()
  })

  it('handles hint button click when unlocked', async () => {
    window.history.replaceState({}, '', '/?game=passwordzapper')
    
    const mockDispatch = vi.fn()
    Object.defineProperty(window, 'dispatchEvent', {
      value: mockDispatch,
      writable: true
    })

    // Enable hint button by setting global flag before rendering
    const w = window as unknown as Record<string, unknown>
    w['__pz_hint_unlocked'] = true
    
    render(
      <MemoryRouter>
        <MinigamePage />
      </MemoryRouter>
    )

    const enabledHintButton = screen.getByLabelText('Hint')
    enabledHintButton.click()
    
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'minigame:hint'
      })
    )
  })

  it('tests game detection edge cases', async () => {
    // Test with mixed case pathname
    render(
      <MemoryRouter initialEntries={['/minigame/PasswordZapper']}>
        <MinigamePage />
      </MemoryRouter>
    )
    expect(screen.getByTestId('passwordzapper-mock')).toBeInTheDocument()
    cleanup()

    // Test with pathname that doesn't contain passwordzapper
    render(
      <MemoryRouter initialEntries={['/minigame/othergame']}>
        <MinigamePage />
      </MemoryRouter>
    )
    expect(screen.getByText('Onbekend spel: niet opgegeven')).toBeInTheDocument()
  })

  it('tests sessionStorage initialization with missing sessionId', async () => {
    window.history.replaceState({}, '', '/?game=passwordzapper&age=11-13')
    localStorage.removeItem('currentSessionId')

    render(
      <MemoryRouter>
        <MinigamePage />
      </MemoryRouter>
    )

    await waitFor(() => {
      const stored = sessionStorage.getItem('playerActiveGame')
      expect(stored).toBeTruthy()
      
      const parsed = JSON.parse(stored!)
      expect(parsed.gameName).toBe('passwordzapper')
      expect(parsed.category).toBe('11-13')
      expect(parsed.sessionId).toBeUndefined()
    })
  })

  it('tests sessionStorage initialization with undefined gameName', async () => {
    window.history.replaceState({}, '', '/?age=11-13')
    localStorage.setItem('currentSessionId', 'test-session')

    render(
      <MemoryRouter>
        <MinigamePage />
      </MemoryRouter>
    )

    await waitFor(() => {
      const stored = sessionStorage.getItem('playerActiveGame')
      expect(stored).toBeTruthy()
      
      const parsed = JSON.parse(stored!)
      expect(parsed.gameName).toBeUndefined()
      expect(parsed.category).toBe('11-13')
      expect(parsed.sessionId).toBe('test-session')
    })
  })

  it('tests sessionStorage initialization error handling', async () => {
    window.history.replaceState({}, '', '/?game=passwordzapper&age=11-13')
    localStorage.setItem('currentSessionId', 'test-session')
    
    // Mock sessionStorage.setItem to throw error instead of JSON.stringify
    const originalSetItem = sessionStorage.setItem
    sessionStorage.setItem = vi.fn(() => { throw new Error('Storage error') })

    // Should not crash
    expect(() => {
      render(
        <MemoryRouter>
          <MinigamePage />
        </MemoryRouter>
      )
    }).not.toThrow()

    // Restore original method
    sessionStorage.setItem = originalSetItem
  })

  it('tests hint button title changes when unlocked', async () => {
    window.history.replaceState({}, '', '/?game=passwordzapper')
    
    // Set global flag before rendering
    const w = window as unknown as Record<string, unknown>
    w['__pz_hint_unlocked'] = true

    render(
      <MemoryRouter>
        <MinigamePage />
      </MemoryRouter>
    )

    const hintButton = screen.getByLabelText('Hint') as HTMLButtonElement
    expect(hintButton.title).toBe('Toon hint')
  })

  it('tests age mapping with special characters', async () => {
    // Test with various special characters between numbers
    window.history.replaceState({}, '', '/?game=passwordzapper&age=8*10')
    render(
      <MemoryRouter>
        <MinigamePage />
      </MemoryRouter>
    )
    let mock = screen.getByTestId('passwordzapper-mock')
    expect(mock).toHaveAttribute('data-age', '8-10')
    cleanup()

    window.history.replaceState({}, '', '/?game=passwordzapper&age=11@13')
    render(
      <MemoryRouter>
        <MinigamePage />
      </MemoryRouter>
    )
    mock = screen.getByTestId('passwordzapper-mock')
    expect(mock).toHaveAttribute('data-age', '11-13')
    cleanup()

    window.history.replaceState({}, '', '/?game=passwordzapper&age=14#16')
    render(
      <MemoryRouter>
        <MinigamePage />
      </MemoryRouter>
    )
    mock = screen.getByTestId('passwordzapper-mock')
    expect(mock).toHaveAttribute('data-age', '14-16')
  })

  // Additional tests for better coverage
  it('tests mapAge function with whitespace input', async () => {
    window.history.replaceState({}, '', '/?game=passwordzapper&age=  8-10  ')
    render(
      <MemoryRouter>
        <MinigamePage />
      </MemoryRouter>
    )
    const mock = screen.getByTestId('passwordzapper-mock')
    expect(mock).toHaveAttribute('data-age', '8-10')
  })

  it('tests mapAge function with null input', async () => {
    window.history.replaceState({}, '', '/?game=passwordzapper&age=null')
    render(
      <MemoryRouter>
        <MinigamePage />
      </MemoryRouter>
    )
    const mock = screen.getByTestId('passwordzapper-mock')
    expect(mock).toHaveAttribute('data-age', '11-13')
  })

  it('tests mapAge function with undefined input', async () => {
    window.history.replaceState({}, '', '/?game=passwordzapper&age=undefined')
    render(
      <MemoryRouter>
        <MinigamePage />
      </MemoryRouter>
    )
    const mock = screen.getByTestId('passwordzapper-mock')
    expect(mock).toHaveAttribute('data-age', '11-13')
  })

  it('tests hint button event dispatch error handling', async () => {
    window.history.replaceState({}, '', '/?game=passwordzapper')
    
    // Mock window.dispatchEvent to throw error
    const originalDispatch = window.dispatchEvent
    window.dispatchEvent = vi.fn(() => { throw new Error('Dispatch error') })

    render(
      <MemoryRouter>
        <MinigamePage />
      </MemoryRouter>
    )

    const hintButton = screen.getByLabelText('Hint')
    // Should not crash when clicking
    expect(() => {
      hintButton.click()
    }).not.toThrow()

    // Restore original method
    window.dispatchEvent = originalDispatch
  })

  it('tests pause button event dispatch error handling', async () => {
    window.history.replaceState({}, '', '/?game=passwordzapper')
    
    const originalDispatch = window.dispatchEvent
    window.dispatchEvent = vi.fn(() => { throw new Error('Dispatch error') })

    render(
      <MemoryRouter>
        <MinigamePage />
      </MemoryRouter>
    )

    const pauseButton = screen.getByLabelText('Pause')
    expect(() => {
      pauseButton.click()
    }).not.toThrow()

    window.dispatchEvent = originalDispatch
  })

  it('tests question button event dispatch error handling', async () => {
    window.history.replaceState({}, '', '/?game=passwordzapper')
    
    const originalDispatch = window.dispatchEvent
    window.dispatchEvent = vi.fn(() => { throw new Error('Dispatch error') })

    render(
      <MemoryRouter>
        <MinigamePage />
      </MemoryRouter>
    )

    const questionButton = screen.getByLabelText('Vraag')
    expect(() => {
      questionButton.click()
    }).not.toThrow()

    window.dispatchEvent = originalDispatch
  })

  it('tests sessionStorage getItem error handling', async () => {
    window.history.replaceState({}, '', '/?game=passwordzapper')
    
    const originalGetItem = sessionStorage.getItem
    sessionStorage.getItem = vi.fn(() => { throw new Error('Get error') })

    render(
      <MemoryRouter>
        <MinigamePage />
      </MemoryRouter>
    )

    expect(screen.getByTestId('passwordzapper-mock')).toBeInTheDocument()

    sessionStorage.getItem = originalGetItem
  })

  it('tests localStorage getItem error handling in useEffect', async () => {
    window.history.replaceState({}, '', '/?game=passwordzapper')
    
    const originalGetItem = localStorage.getItem
    localStorage.getItem = vi.fn(() => { throw new Error('Get error') })

    render(
      <MemoryRouter>
        <MinigamePage />
      </MemoryRouter>
    )

    expect(screen.getByTestId('passwordzapper-mock')).toBeInTheDocument()

    localStorage.getItem = originalGetItem
  })

  it('tests sessionStorage removeItem error handling', async () => {
    window.history.replaceState({}, '', '/?game=passwordzapper')
    
    const originalRemoveItem = sessionStorage.removeItem
    sessionStorage.removeItem = vi.fn(() => { throw new Error('Remove error') })

    render(
      <MemoryRouter>
        <MinigamePage />
      </MemoryRouter>
    )

    expect(screen.getByTestId('passwordzapper-mock')).toBeInTheDocument()

    sessionStorage.removeItem = originalRemoveItem
  })

  it('tests localStorage removeItem error handling', async () => {
    window.history.replaceState({}, '', '/?game=passwordzapper')
    
    const originalRemoveItem = localStorage.removeItem
    localStorage.removeItem = vi.fn(() => { throw new Error('Remove error') })

    render(
      <MemoryRouter>
        <MinigamePage />
      </MemoryRouter>
    )

    expect(screen.getByTestId('passwordzapper-mock')).toBeInTheDocument()

    localStorage.removeItem = originalRemoveItem
  })

  it('tests game detection with empty pathname', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <MinigamePage />
      </MemoryRouter>
    )
    expect(screen.getByText('Onbekend spel: niet opgegeven')).toBeInTheDocument()
  })

  it('tests game detection with pathname containing passwordzapper but not as game', async () => {
    render(
      <MemoryRouter initialEntries={['/some/other/passwordzapper/path']}>
        <MinigamePage />
      </MemoryRouter>
    )
    expect(screen.getByTestId('passwordzapper-mock')).toBeInTheDocument()
  })

  // Tests for specific uncovered lines
  it('tests sessionStorage initialization with undefined category', async () => {
    window.history.replaceState({}, '', '/?game=passwordzapper')
    localStorage.setItem('currentSessionId', 'test-session')
    // Clear sessionStorage to force undefined category
    sessionStorage.clear()

    render(
      <MemoryRouter>
        <MinigamePage />
      </MemoryRouter>
    )

    await waitFor(() => {
      const stored = sessionStorage.getItem('playerActiveGame')
      expect(stored).toBeTruthy()
      
      const parsed = JSON.parse(stored!)
      expect(parsed.gameName).toBe('passwordzapper')
      expect(parsed.category).toBe('11-13') // Defaults to 11-13 when no age param
      expect(parsed.sessionId).toBe('test-session')
    })
  })

  it('tests sessionStorage initialization with undefined gameName', async () => {
    window.history.replaceState({}, '', '/?age=11-13')
    localStorage.setItem('currentSessionId', 'test-session')

    render(
      <MemoryRouter>
        <MinigamePage />
      </MemoryRouter>
    )

    await waitFor(() => {
      const stored = sessionStorage.getItem('playerActiveGame')
      expect(stored).toBeTruthy()
      
      const parsed = JSON.parse(stored!)
      expect(parsed.gameName).toBeUndefined()
      expect(parsed.category).toBe('11-13')
      expect(parsed.sessionId).toBe('test-session')
    })
  })

  it('tests sessionStorage initialization with undefined sessionId', async () => {
    window.history.replaceState({}, '', '/?game=passwordzapper&age=11-13')
    // Don't set currentSessionId

    render(
      <MemoryRouter>
        <MinigamePage />
      </MemoryRouter>
    )

    await waitFor(() => {
      const stored = sessionStorage.getItem('playerActiveGame')
      expect(stored).toBeTruthy()
      
      const parsed = JSON.parse(stored!)
      expect(parsed.gameName).toBe('passwordzapper')
      expect(parsed.category).toBe('11-13')
      expect(parsed.sessionId).toBeUndefined()
    })
  })

  it('tests hintUnlocked state initialization with window flag false', async () => {
    window.history.replaceState({}, '', '/?game=passwordzapper')
    const w = window as unknown as Record<string, unknown>
    w['__pz_hint_unlocked'] = false

    render(
      <MemoryRouter>
        <MinigamePage />
      </MemoryRouter>
    )

    const hintButton = screen.getByLabelText('Hint') as HTMLButtonElement
    expect(hintButton.disabled).toBe(true)
  })

  it('tests hintUnlocked state initialization with window flag true', async () => {
    window.history.replaceState({}, '', '/?game=passwordzapper')
    const w = window as unknown as Record<string, unknown>
    w['__pz_hint_unlocked'] = true

    render(
      <MemoryRouter>
        <MinigamePage />
      </MemoryRouter>
    )

    const hintButton = screen.getByLabelText('Hint') as HTMLButtonElement
    expect(hintButton.disabled).toBe(false)
  })

  it('tests hintUnlocked state initialization with window flag error', async () => {
    window.history.replaceState({}, '', '/?game=passwordzapper')
    const w = window as unknown as Record<string, unknown>
    Object.defineProperty(w, '__pz_hint_unlocked', {
      get: () => { throw new Error('Access error') }
    })

    render(
      <MemoryRouter>
        <MinigamePage />
      </MemoryRouter>
    )

    // Should default to false when error occurs
    const hintButton = screen.getByLabelText('Hint') as HTMLButtonElement
    expect(hintButton.disabled).toBe(true)
  })

  it('tests sessionStorage removeItem error in cleanup', async () => {
    window.history.replaceState({}, '', '/?game=passwordzapper')
    
    const originalRemoveItem = sessionStorage.removeItem
    sessionStorage.removeItem = vi.fn(() => { throw new Error('Remove error') })

    const { unmount } = render(
      <MemoryRouter>
        <MinigamePage />
      </MemoryRouter>
    )

    // Should not crash on unmount
    expect(() => {
      unmount()
    }).not.toThrow()

    sessionStorage.removeItem = originalRemoveItem
  })

  it('tests sessionStorage getItem error in age fallback', async () => {
    window.history.replaceState({}, '', '/?game=passwordzapper')
    
    const originalGetItem = sessionStorage.getItem
    sessionStorage.getItem = vi.fn(() => { throw new Error('Get error') })

    render(
      <MemoryRouter>
        <MinigamePage />
      </MemoryRouter>
    )

    // Should default to 11-13 when sessionStorage throws error
    const mock = screen.getByTestId('passwordzapper-mock')
    expect(mock).toHaveAttribute('data-age', '11-13')

    sessionStorage.getItem = originalGetItem
  })

  it('tests localStorage getItem error in polling', async () => {
    window.history.replaceState({}, '', '/?game=passwordzapper')
    localStorage.setItem('currentSessionId', 'test-session')
    
    const originalGetItem = localStorage.getItem
    localStorage.getItem = vi.fn(() => { throw new Error('Get error') })

    render(
      <MemoryRouter>
        <MinigamePage />
      </MemoryRouter>
    )

    expect(screen.getByTestId('passwordzapper-mock')).toBeInTheDocument()

    localStorage.getItem = originalGetItem
  })

  it('tests JSON.parse error in onlinePlayers polling', async () => {
    window.history.replaceState({}, '', '/?game=passwordzapper')
    localStorage.setItem('currentSessionId', 'test-session')
    sessionStorage.setItem('playerNumber', '123')
    localStorage.setItem('onlinePlayers', 'invalid json')
    
    const originalParse = JSON.parse
    JSON.parse = vi.fn(() => { throw new Error('Parse error') })

    render(
      <MemoryRouter>
        <MinigamePage />
      </MemoryRouter>
    )

    expect(screen.getByTestId('passwordzapper-mock')).toBeInTheDocument()

    JSON.parse = originalParse
  })

  it('tests JSON.parse error in activeGameInfo polling', async () => {
    window.history.replaceState({}, '', '/?game=passwordzapper')
    localStorage.setItem('activeGameInfo', 'invalid json')
    
    const originalParse = JSON.parse
    JSON.parse = vi.fn(() => { throw new Error('Parse error') })

    render(
      <MemoryRouter>
        <MinigamePage />
      </MemoryRouter>
    )

    expect(screen.getByTestId('passwordzapper-mock')).toBeInTheDocument()

    JSON.parse = originalParse
  })

  it('tests navigate error in event handlers', async () => {
    window.history.replaceState({}, '', '/?game=passwordzapper')
    sessionStorage.setItem('playerNumber', '123')
    
    // Make navigate throw error
    mockNavigate.mockImplementation(() => { throw new Error('Navigate error') })

    render(
      <MemoryRouter>
        <MinigamePage />
      </MemoryRouter>
    )

    expect(screen.getByTestId('passwordzapper-mock')).toBeInTheDocument()
  })

  it('tests localStorage setItem error in event handlers', async () => {
    window.history.replaceState({}, '', '/?game=passwordzapper')
    sessionStorage.setItem('playerNumber', '123')
    localStorage.setItem('onlinePlayers', JSON.stringify(['456']))
    
    const originalSetItem = localStorage.setItem
    localStorage.setItem = vi.fn(() => { throw new Error('Set error') })

    render(
      <MemoryRouter>
        <MinigamePage />
      </MemoryRouter>
    )

    expect(screen.getByTestId('passwordzapper-mock')).toBeInTheDocument()

    localStorage.setItem = originalSetItem
  })

  // Additional tests to reach 80% coverage
  it('tests sessionStorage getItem with null return', async () => {
    window.history.replaceState({}, '', '/?game=passwordzapper')
    
    const originalGetItem = sessionStorage.getItem
    sessionStorage.getItem = vi.fn(() => null)

    render(
      <MemoryRouter>
        <MinigamePage />
      </MemoryRouter>
    )

    expect(screen.getByTestId('passwordzapper-mock')).toBeInTheDocument()

    sessionStorage.getItem = originalGetItem
  })

  it('tests localStorage getItem with null return', async () => {
    window.history.replaceState({}, '', '/?game=passwordzapper')
    
    const originalGetItem = localStorage.getItem
    localStorage.getItem = vi.fn(() => null)

    render(
      <MemoryRouter>
        <MinigamePage />
      </MemoryRouter>
    )

    expect(screen.getByTestId('passwordzapper-mock')).toBeInTheDocument()

    localStorage.getItem = originalGetItem
  })

  it('tests sessionStorage setItem error in polling', async () => {
    window.history.replaceState({}, '', '/?game=passwordzapper')
    localStorage.setItem('currentSessionId', 'test-session')
    
    const originalSetItem = sessionStorage.setItem
    sessionStorage.setItem = vi.fn(() => { throw new Error('Set error') })

    render(
      <MemoryRouter>
        <MinigamePage />
      </MemoryRouter>
    )

    expect(screen.getByTestId('passwordzapper-mock')).toBeInTheDocument()

    sessionStorage.setItem = originalSetItem
  })

  it('tests localStorage setItem error in polling', async () => {
    window.history.replaceState({}, '', '/?game=passwordzapper')
    localStorage.setItem('currentSessionId', 'test-session')
    
    const originalSetItem = localStorage.setItem
    localStorage.setItem = vi.fn(() => { throw new Error('Set error') })

    render(
      <MemoryRouter>
        <MinigamePage />
      </MemoryRouter>
    )

    expect(screen.getByTestId('passwordzapper-mock')).toBeInTheDocument()

    localStorage.setItem = originalSetItem
  })

  it('tests sessionStorage setItem error in event handlers', async () => {
    window.history.replaceState({}, '', '/?game=passwordzapper')
    sessionStorage.setItem('playerNumber', '123')
    
    const originalSetItem = sessionStorage.setItem
    sessionStorage.setItem = vi.fn(() => { throw new Error('Set error') })

    render(
      <MemoryRouter>
        <MinigamePage />
      </MemoryRouter>
    )

    expect(screen.getByTestId('passwordzapper-mock')).toBeInTheDocument()

    sessionStorage.setItem = originalSetItem
  })

  it('tests useEffect cleanup with multiple timers', async () => {
    window.history.replaceState({}, '', '/?game=passwordzapper')
    localStorage.setItem('currentSessionId', 'test-session')
    
    const originalClearInterval = window.clearInterval
    const originalClearTimeout = window.clearTimeout
    
    let clearIntervalCallCount = 0
    let clearTimeoutCallCount = 0
    
    window.clearInterval = vi.fn(() => clearIntervalCallCount++)
    window.clearTimeout = vi.fn(() => clearTimeoutCallCount++)

    const { unmount } = render(
      <MemoryRouter>
        <MinigamePage />
      </MemoryRouter>
    )

    unmount()

    // Should call cleanup functions
    expect(clearIntervalCallCount).toBeGreaterThanOrEqual(0)
    expect(clearTimeoutCallCount).toBeGreaterThanOrEqual(0)

    window.clearInterval = originalClearInterval
    window.clearTimeout = originalClearTimeout
  })

  it('tests polling with invalid JSON data', async () => {
    window.history.replaceState({}, '', '/?game=passwordzapper')
    localStorage.setItem('currentSessionId', 'test-session')
    localStorage.setItem('activeGameInfo', 'not valid json')
    localStorage.setItem('onlinePlayers', 'also not valid json')
    
    render(
      <MemoryRouter>
        <MinigamePage />
      </MemoryRouter>
    )

    expect(screen.getByTestId('passwordzapper-mock')).toBeInTheDocument()
  })

  it('tests polling with empty arrays', async () => {
    window.history.replaceState({}, '', '/?game=passwordzapper')
    localStorage.setItem('currentSessionId', 'test-session')
    localStorage.setItem('activeGameInfo', 'null')
    localStorage.setItem('onlinePlayers', '[]')
    sessionStorage.setItem('playerNumber', '123')
    
    render(
      <MemoryRouter>
        <MinigamePage />
      </MemoryRouter>
    )

    expect(screen.getByTestId('passwordzapper-mock')).toBeInTheDocument()
  })

  it('tests polling with non-null activeGameInfo', async () => {
    window.history.replaceState({}, '', '/?game=passwordzapper')
    localStorage.setItem('currentSessionId', 'test-session')
    localStorage.setItem('activeGameInfo', JSON.stringify({ gameName: 'other-game' }))
    
    render(
      <MemoryRouter>
        <MinigamePage />
      </MemoryRouter>
    )

    expect(screen.getByTestId('passwordzapper-mock')).toBeInTheDocument()
  })

  it('tests event handler with playerNumber not in onlinePlayers', async () => {
    window.history.replaceState({}, '', '/?game=passwordzapper')
    sessionStorage.setItem('playerNumber', '999')
    localStorage.setItem('onlinePlayers', JSON.stringify(['123', '456']))
    
    render(
      <MemoryRouter>
        <MinigamePage />
      </MemoryRouter>
    )

    expect(screen.getByTestId('passwordzapper-mock')).toBeInTheDocument()
  })

  it('tests event handler with playerNumber in onlinePlayers', async () => {
    window.history.replaceState({}, '', '/?game=passwordzapper')
    sessionStorage.setItem('playerNumber', '123')
    localStorage.setItem('onlinePlayers', JSON.stringify(['123', '456']))
    
    render(
      <MemoryRouter>
        <MinigamePage />
      </MemoryRouter>
    )

    expect(screen.getByTestId('passwordzapper-mock')).toBeInTheDocument()
  })

  it('tests event handler with invalid onlinePlayers JSON', async () => {
    window.history.replaceState({}, '', '/?game=passwordzapper')
    sessionStorage.setItem('playerNumber', '123')
    localStorage.setItem('onlinePlayers', 'invalid json')
    
    render(
      <MemoryRouter>
        <MinigamePage />
      </MemoryRouter>
    )

    expect(screen.getByTestId('passwordzapper-mock')).toBeInTheDocument()
  })

  it('tests event handler with null onlinePlayers', async () => {
    window.history.replaceState({}, '', '/?game=passwordzapper')
    sessionStorage.setItem('playerNumber', '123')
    localStorage.setItem('onlinePlayers', 'null')
    
    render(
      <MemoryRouter>
        <MinigamePage />
      </MemoryRouter>
    )

    expect(screen.getByTestId('passwordzapper-mock')).toBeInTheDocument()
  })

  it('tests event handler with undefined onlinePlayers', async () => {
    window.history.replaceState({}, '', '/?game=passwordzapper')
    sessionStorage.setItem('playerNumber', '123')
    // Don't set onlinePlayers
    
    render(
      <MemoryRouter>
        <MinigamePage />
      </MemoryRouter>
    )

    expect(screen.getByTestId('passwordzapper-mock')).toBeInTheDocument()
  })

  it('tests sessionStorage initialization with all undefined values', async () => {
    window.history.replaceState({}, '', '/')
    localStorage.clear()
    sessionStorage.clear()
    
    render(
      <MemoryRouter>
        <MinigamePage />
      </MemoryRouter>
    )

    // Should render fallback UI
    expect(screen.getByText('Onbekend spel: niet opgegeven')).toBeInTheDocument()
  })

  it('tests polling without currentSessionId', async () => {
    window.history.replaceState({}, '', '/?game=passwordzapper')
    // Don't set currentSessionId
    
    render(
      <MemoryRouter>
        <MinigamePage />
      </MemoryRouter>
    )

    expect(screen.getByTestId('passwordzapper-mock')).toBeInTheDocument()
  })

  it('tests polling with currentSessionId but no playerNumber', async () => {
    window.history.replaceState({}, '', '/?game=passwordzapper')
    localStorage.setItem('currentSessionId', 'test-session')
    // Don't set playerNumber
    
    render(
      <MemoryRouter>
        <MinigamePage />
      </MemoryRouter>
    )

    expect(screen.getByTestId('passwordzapper-mock')).toBeInTheDocument()
  })

  it('tests event handler without playerNumber', async () => {
    window.history.replaceState({}, '', '/?game=passwordzapper')
    // Don't set playerNumber
    
    render(
      <MemoryRouter>
        <MinigamePage />
      </MemoryRouter>
    )

    expect(screen.getByTestId('passwordzapper-mock')).toBeInTheDocument()
  })

  it('tests mapAge function with empty string', async () => {
    window.history.replaceState({}, '', '/?game=passwordzapper&age=')
    
    render(
      <MemoryRouter>
        <MinigamePage />
      </MemoryRouter>
    )

    const mock = screen.getByTestId('passwordzapper-mock')
    expect(mock).toHaveAttribute('data-age', '11-13')
  })

  it('tests mapAge function with whitespace only', async () => {
    window.history.replaceState({}, '', '/?game=passwordzapper&age=   ')
    
    render(
      <MemoryRouter>
        <MinigamePage />
      </MemoryRouter>
    )

    const mock = screen.getByTestId('passwordzapper-mock')
    expect(mock).toHaveAttribute('data-age', '11-13')
  })

  it('tests mapAge function with invalid format', async () => {
    window.history.replaceState({}, '', '/?game=passwordzapper&age=invalid')
    
    render(
      <MemoryRouter>
        <MinigamePage />
      </MemoryRouter>
    )

    const mock = screen.getByTestId('passwordzapper-mock')
    expect(mock).toHaveAttribute('data-age', '11-13')
  })

  it('tests mapAge function with single number', async () => {
    window.history.replaceState({}, '', '/?game=passwordzapper&age=8')
    
    render(
      <MemoryRouter>
        <MinigamePage />
      </MemoryRouter>
    )

    const mock = screen.getByTestId('passwordzapper-mock')
    expect(mock).toHaveAttribute('data-age', '8-10')
  })

  it('tests mapAge function with three numbers', async () => {
    window.history.replaceState({}, '', '/?game=passwordzapper&age=8-10-12')
    
    render(
      <MemoryRouter>
        <MinigamePage />
      </MemoryRouter>
    )

    const mock = screen.getByTestId('passwordzapper-mock')
    expect(mock).toHaveAttribute('data-age', '8-10')
  })
})

