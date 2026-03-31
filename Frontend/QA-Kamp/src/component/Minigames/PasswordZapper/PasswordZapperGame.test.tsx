/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { act } from 'react-dom/test-utils'
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
import MinigamePage from '../MinigamePage.tsx'

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

    // The "Volgende" button opens the practice intro; click the practice "Spelen" button to actually start
    const playBtn = await screen.findByRole('button', { name: /Spelen/i })
    fireEvent.click(playBtn)

    // After starting, either the practice label or the score element should appear
    const scoreOrPractice = await screen.findByText(/Score:|Oefenronde/i)
    expect(scoreOrPractice).toBeInTheDocument()
  })

  it('shows the Verder spelen button when opening the rules via the speluitleg (help) button', async () => {
    // Render the page so the help button exists and the game can be started
    try { window.history.pushState({}, '', '/minigame/passwordzapper?age=11-13') } catch { /* ignore */ }
    render(
      <MemoryRouter initialEntries={["/minigame/passwordzapper?age=11-13"]}>
        <MinigamePage />
      </MemoryRouter>
    )

    // wait for the start rules heading to ensure the component mounted
    await screen.findByRole('heading', { name: /Speluitleg - Password zapper/i })

    // click Volgende to advance to practice intro, then click Spelen to start the practice
    const volgende = screen.getByRole('button', { name: /Volgende/i })
    fireEvent.click(volgende)
    const spelen = await screen.findByRole('button', { name: /Spelen/i })
    fireEvent.click(spelen)

    // After starting, either the practice label or the score element should appear
    await screen.findByText(/Score:|Oefenronde/i)

    // now click the page-level help button (aria-label="Vraag") which dispatches the event
    const helpBtn = screen.getByLabelText('Vraag')
    fireEvent.click(helpBtn)

    // the help modal should show a "Verder spelen" button
    const verderBtn = await screen.findByRole('button', { name: /Verder spelen/i })
    expect(verderBtn).toBeInTheDocument()

    // and the hint/help modal should also include a "Spelen" button (start/resume play)
    const spelenBtnInHelp = await screen.findByRole('button', { name: /Spelen/i })
    expect(spelenBtnInHelp).toBeInTheDocument()
  })

  it('shows pause modal actions (Verder spelen, Opnieuw beginnen, Stoppen) when paused', async () => {
    // Render the page so the pause event can be dispatched
    try { window.history.pushState({}, '', '/minigame/passwordzapper?age=11-13') } catch { /* ignore */ }
    render(
      <MemoryRouter initialEntries={["/minigame/passwordzapper?age=11-13"]}>
        <MinigamePage />
      </MemoryRouter>
    )

    // start the game: advance through the start modal
    await screen.findByRole('heading', { name: /Speluitleg - Password zapper/i })
    const volgende = screen.getByRole('button', { name: /Volgende/i })
    fireEvent.click(volgende)
    const spelen = await screen.findByRole('button', { name: /Spelen/i })
    fireEvent.click(spelen)

    // ensure the game shows running state
    await screen.findByText(/Score:|Oefenronde/i)

    // dispatch the global pause event the component listens for
    window.dispatchEvent(new CustomEvent('minigame:pause'))

    // the pause modal should show action buttons
    const verder = await screen.findByRole('button', { name: /Verder spelen/i })
    expect(verder).toBeInTheDocument()
    expect(verder).toHaveAttribute('id', 'btnContinueGame')

    const opnieuw = await screen.findByRole('button', { name: /Opnieuw beginnen/i })
    expect(opnieuw).toBeInTheDocument()
    expect(opnieuw).toHaveAttribute('id', 'btnRestartGame')

    const stoppen = await screen.findByRole('button', { name: /Stoppen/i })
    expect(stoppen).toBeInTheDocument()
    expect(stoppen).toHaveAttribute('id', 'btnStopGame')
  })

  it('game screen shows expected UI elements while running', async () => {
    try { window.history.pushState({}, '', '/minigame/passwordzapper?age=11-13') } catch { /* ignore */ }
    render(
      <MemoryRouter initialEntries={["/minigame/passwordzapper?age=11-13"]}>
        <MinigamePage />
      </MemoryRouter>
    )

    // start the game by advancing the start modal
    await screen.findByRole('heading', { name: /Speluitleg - Password zapper/i })
    fireEvent.click(screen.getByRole('button', { name: /Volgende/i }))
    fireEvent.click(await screen.findByRole('button', { name: /Spelen/i }))

    // During the oefenronde the score area should show "Oefenronde"
    expect(await screen.findByText(/Oefenronde/i)).toBeInTheDocument()

    // progress bar should be present (role=progressbar) and show the practice max (0 / 3)
    const progress = screen.getByRole('progressbar')
    expect(progress).toBeInTheDocument()
    expect(screen.getByText(/0\s*\/\s*3/)).toBeInTheDocument()

    // top-level controls: Hint, Pause and Vraag (help) buttons
    expect(screen.getByLabelText('Hint')).toBeInTheDocument()
    expect(screen.getByLabelText('Pause')).toBeInTheDocument()
    expect(screen.getByLabelText('Vraag')).toBeInTheDocument()

    // score element exists (either Oefenronde or Score: N)
    expect(screen.getByText(/Oefenronde|Score:/i)).toBeInTheDocument()
  })

  it('updates score correctly after zapping a weak and skipping a weak password', async () => {
    // Create deterministic initial passwords: idx 0 weak, idx1 strong, idx2 weak
    const initial = [
      { value: 'weak-1', isWeak: true, zapped: false, missed: false },
      { value: 'strong-1', isWeak: false, zapped: false, missed: false },
      { value: 'weak-2', isWeak: true, zapped: false, missed: false }
    ]

    const { container } = render(
      <MemoryRouter>
        {/* test-only: cast to any because PasswordItem type is internal to the component file */}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        <PasswordZapperGame ageGroup={'11-13'} initialPasswords={initial as any} />
      </MemoryRouter>
    )

    // advance start modal to practice and start
    await screen.findByRole('heading', { name: /Speluitleg - Password zapper/i })
    fireEvent.click(screen.getByRole('button', { name: /Volgende/i }))
    fireEvent.click(await screen.findByRole('button', { name: /Spelen/i }))

    // ensure practice state shows
    await screen.findByText(/Oefenronde/i)

    // Click the first comet (data-idx='0') to zap (weak => +2)
    let comet0: HTMLElement | null = null
    await waitFor(() => {
      comet0 = container.querySelector("img[data-idx='0']") as HTMLElement | null
      if (!comet0) throw new Error('comet0 not yet rendered')
    })
    expect(comet0).toBeTruthy()

    // Use fake timers so the laser travel timeout triggers zapAt synchronously when advanced
    vi.useFakeTimers()
    // wrap interactions and timer advancement in act so React state updates flush
    act(() => {
      fireEvent.click(comet0!)
      // advance timers to let the travel timeout fire (travelMs = 340ms)
      vi.advanceTimersByTime(400)
    })
    // let pending microtasks run
    await Promise.resolve()

    // During practice the top-left shows "Oefenronde" but progress should have advanced (1 / 3)
    expect(screen.getByText(/1\s*\/\s*3/)).toBeInTheDocument()
    // the temporary image override for the zapped comet should be set (Correct image)
    const k0 = container.querySelector('#komeet-0') as HTMLImageElement | null
    expect(k0).toBeTruthy()
    expect(k0!.src).toMatch(/Correct|correct/i)

    // Now trigger an animation end for the third comet (idx=2) to simulate a miss
    const passwordDiv = container.querySelector(".pz-password img[data-idx='2']")
    // the parent .pz-password receives animationEnd; find it
    const parent = passwordDiv ? passwordDiv.closest('.pz-password') as HTMLElement : null
    expect(parent).toBeTruthy()
    fireEvent.animationEnd(parent!)

    // Allow state updates to flush
    await Promise.resolve()

    // After the miss the progress should have increased again (2 / 3)
    expect(screen.getByText(/2\s*\/\s*3/)).toBeInTheDocument()

    // restore timers
    vi.useRealTimers()
  })
})
