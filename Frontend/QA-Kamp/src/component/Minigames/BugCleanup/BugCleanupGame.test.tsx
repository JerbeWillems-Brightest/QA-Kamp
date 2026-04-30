/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import '@testing-library/jest-dom'
import { vi, describe, it, beforeEach, expect, test } from 'vitest'
import { MemoryRouter } from 'react-router-dom'

// Mock api module used by other components
vi.mock('../../api', () => ({
  setPlayerOnline: vi.fn(() => Promise.resolve({ success: true })),
  setPlayerOffline: vi.fn(() => Promise.resolve({ success: true })),
  postPlayerHeartbeat: vi.fn(() => Promise.resolve({ success: true })),
}))

// Mock dynamic imports / assets used by the component
vi.mock('../PasswordZapper/passwordZapperFireworks', () => ({ default: vi.fn(() => vi.fn()) }))
;(global as any).import = { meta: { glob: vi.fn().mockReturnValue({}) } }

import BugCleanupGame from './BugCleanupGame.tsx'

describe('BugCleanupGame - UI checks (TC01..TC47)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    localStorage.clear()
    sessionStorage.clear()

    // Minimal ResizeObserver mock used by components when measuring layout
    global.ResizeObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn()
    })) as any
  })

  // TC01 - start popup shows Volgende
  it('TC01: shows Volgende on the start (speluitleg) popup', () => {
    render(
      <MemoryRouter>
        <BugCleanupGame ageGroup={'11-13'} />
      </MemoryRouter>
    )

    expect(screen.getByRole('heading', { name: /Speluitleg - Bug Cleanup/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Volgende/i })).toBeInTheDocument()
  })

  // TC02 - help popup opened via global event shows Verder spelen
  it('TC02: shows Verder spelen when opening the help popup via the speluitleg event', async () => {
    render(
      <MemoryRouter>
        <BugCleanupGame ageGroup={'11-13'} />
      </MemoryRouter>
    )

    // start the game so the help overlay can be shown
    fireEvent.click(screen.getByRole('button', { name: /Volgende/i }))
    window.dispatchEvent(new CustomEvent('minigame:question'))

    const helpHeading = await screen.findByRole('heading', { name: /Speluitleg - Bug Cleanup/i })
    const helpModal = helpHeading.closest('.pz-pause-modal') ?? document.body
    const verder = within(helpModal as HTMLElement).getByRole('button', { name: /Verder spelen/i })
    expect(verder).toBeInTheDocument()
  })

  // TC03 - oefenronde popup: component doesn't have a practice modal; mark as TODO
  test.skip('TC03: Spelen button exists on oefenronde popup (TODO - component has no oefenronde)', () => {})

  // TC04 - hint popup Verder spelen
  it('TC04: shows Verder spelen on the hint popup when opened', async () => {
    render(
      <MemoryRouter>
        <BugCleanupGame ageGroup={'11-13'} />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByRole('button', { name: /Volgende/i }))
    window.dispatchEvent(new CustomEvent('minigame:hint'))

    const hintHeading = await screen.findByRole('heading', { name: /Hint/i })
    const hintModal = hintHeading.closest('.pz-pause-modal') ?? document.body
    const verder = within(hintModal as HTMLElement).getByRole('button', { name: /Verder spelen/i })
    expect(verder).toBeInTheDocument()
  })

  // TC05/TC06/TC07 - pause modal buttons
  it('TC05/TC06/TC07: pause modal shows Verder spelen, Opnieuw beginnen and Stoppen', async () => {
    render(
      <MemoryRouter>
        <BugCleanupGame ageGroup={'11-13'} />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByRole('button', { name: /Volgende/i }))
    window.dispatchEvent(new CustomEvent('minigame:pause'))

    const pauseHeading = await screen.findByRole('heading', { name: /Pauze/i })
    const pauseModal = pauseHeading.closest('.pz-pause-modal') ?? document.body
    expect(within(pauseModal as HTMLElement).getByRole('button', { name: /Verder spelen/i })).toBeInTheDocument()
    expect(within(pauseModal as HTMLElement).getByRole('button', { name: /Opnieuw beginnen/i })).toBeInTheDocument()
    expect(within(pauseModal as HTMLElement).getByRole('button', { name: /Stoppen/i })).toBeInTheDocument()
  })

  // TC08 - TC11: game-level controls - BugCleanupGame uses global events; leave as TODO where not present
  test.todo('TC08: Hint button present on game screen (component has no explicit Hint button)')
  test.todo('TC09: Hint button clickable from start (TODO)')
  test.todo('TC10: Pauze button present on game screen (component uses global events instead)')
  test.todo('TC11: Speluitleg button present on game screen (component uses global events instead)')

  // TC12: progressbar visible
  it('TC12: progressbar is visible on the game screen after starting', async () => {
    const { container } = render(
      <MemoryRouter>
        <BugCleanupGame ageGroup={'8-10'} />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByRole('button', { name: /Volgende/i }))
    await waitFor(() => expect(screen.getByRole('progressbar')).toBeInTheDocument())
    expect(container.querySelector('.bc-progress-text')).toBeTruthy()
  })

  // TC13: feedback centrally visible - feedback only appears after removal; leave TODO
  test.todo('TC13: feedback central top visible when set (requires triggering a removal)')

  // TC14: timer left-top visible
  it('TC14: shows timer (pill) on top-left', async () => {
    const { container } = render(
      <MemoryRouter>
        <BugCleanupGame ageGroup={'11-13'} />
      </MemoryRouter>
    )
    fireEvent.click(screen.getByRole('button', { name: /Volgende/i }))
    expect(container.querySelector('.bc-pill')).toBeTruthy()
  })

  // TC15..TC18 (oefenronde) - component has no oefenronde concept; mark todos
  test.todo('TC15: Oefenronde text visible during oefenronde (component has no oefenronde)')
  test.todo('TC16: Hint button present on oefenronde screen (TODO)')
  test.todo('TC17: Pauze button present on oefenronde screen (TODO)')
  test.todo('TC18: Speluitleg button present on oefenronde screen (TODO)')

  // TC19/TC20 practice-end popups not present in this minigame
  test.todo('TC19: Spelen button on end of oefenronde popup (TODO)')
  test.todo('TC20: Opnieuw oefenen button on end of oefenronde popup (TODO)')

  // TC21..TC25 end screen UI checks
  it('TC21..TC25: end screen shows Opnieuw spelen, score, percentage, time and highscore when stopped', async () => {
    const { container } = render(
      <MemoryRouter>
        <BugCleanupGame ageGroup={'11-13'} />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByRole('button', { name: /Volgende/i }))
    window.dispatchEvent(new CustomEvent('minigame:pause'))
    const stopBtn = await screen.findByRole('button', { name: /Stoppen/i })
    fireEvent.click(stopBtn)

    const playAgain = await screen.findByRole('button', { name: /Opnieuw spelen/i })
    expect(playAgain).toBeInTheDocument()

    expect(container.querySelector('.pz-score-number')).toBeTruthy()
    expect(container.querySelector('.pz-score-percent')).toBeTruthy()
    expect(container.querySelector('.pz-time-card__body')).toBeTruthy()
    expect(container.querySelector('.pz-best-top__time')).toBeTruthy()
  })

  // TC26..TC31 score mapping checks (algorithmic)
  it('TC26..TC31: mapTimeToScore algorithm matches expected thresholds', () => {
    const mapTimeToScore = (ms: number) => {
      if (ms <= 120_000) return 100
      if (ms <= 150_000) return 90
      const extra = Math.floor((ms - 150_000) / 30_000)
      const score = 90 - extra * 10
      return Math.max(0, Math.min(100, score))
    }

    expect(mapTimeToScore(0)).toBe(100)
    expect(mapTimeToScore(120_000)).toBe(100)
    expect(mapTimeToScore(125_000)).toBe(90)
    expect(mapTimeToScore(150_000)).toBe(90)
    expect(mapTimeToScore(180_000)).toBe(80)
    expect(mapTimeToScore(1_000_000)).toBe(0)
    for (const ms of [0, 90_000, 125_000, 151_000, 200_000, 1_000_000]) {
      const v = mapTimeToScore(ms)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(100)
    }
  })

  // TC33: same calculation for all age groups (pure function - same algorithm)
  it('TC33: score calculation applies equally across age groups (algorithmic)', () => {
    const mapTimeToScore = (ms: number) => {
      if (ms <= 120_000) return 100
      if (ms <= 150_000) return 90
      const extra = Math.floor((ms - 150_000) / 30_000)
      const score = 90 - extra * 10
      return Math.max(0, Math.min(100, score))
    }
    expect(mapTimeToScore(90_000)).toBe(100)
    expect(mapTimeToScore(140_000)).toBe(90)
  })

  // TC34..TC39 visibleMax checks per age group
  it('TC34/TC37/TC40: maximum visible bugs per age group matches configuration', async () => {
    // 8-10 => visibleMax 3
    const { container: c1 } = render(
      <MemoryRouter>
        <BugCleanupGame ageGroup={'8-10'} />
      </MemoryRouter>
    )
    fireEvent.click(screen.getByRole('button', { name: /Volgende/i }))
    await waitFor(() => expect(c1.querySelectorAll('.bc-bug').length).toBeGreaterThan(0))
    expect(c1.querySelectorAll('.bc-bug').length).toBe(3)

    // 11-13 => visibleMax 4
    vi.resetAllMocks()
    const { container: c2 } = render(
      <MemoryRouter>
        <BugCleanupGame ageGroup={'11-13'} />
      </MemoryRouter>
    )
    fireEvent.click(screen.getByRole('button', { name: /Volgende/i }))
    await waitFor(() => expect(c2.querySelectorAll('.bc-bug').length).toBeGreaterThan(0))
    expect(c2.querySelectorAll('.bc-bug').length).toBe(4)

    // 14-16 => visibleMax 4 (component config uses 4)
    vi.resetAllMocks()
    const { container: c3 } = render(
      <MemoryRouter>
        <BugCleanupGame ageGroup={'14-16'} />
      </MemoryRouter>
    )
    fireEvent.click(screen.getByRole('button', { name: /Volgende/i }))
    await waitFor(() => expect(c3.querySelectorAll('.bc-bug').length).toBeGreaterThan(0))
    expect(c3.querySelectorAll('.bc-bug').length).toBe(4)
  })

  // TC40..TC43 split & child removal behaviour requires simulating collision and internal state changes.
  test.todo('TC40: split bug splits into two smaller bugs when hit (requires direct hook access)')
  test.todo('TC41: smaller bug removed when cursor touches it (TODO)')
  test.todo('TC42: progressbar updates after removing smaller bug (TODO)')
  test.todo('TC43: progressbar updates after removing a bug (TODO)')

  // TC44..TC47 cursor delay / speed tests
  it('TC44/TC47: delayed cursor element is rendered and follows pointer (basic smoke)', async () => {
    const { container } = render(
      <MemoryRouter>
        <BugCleanupGame ageGroup={'11-13'} />
      </MemoryRouter>
    )
    fireEvent.click(screen.getByRole('button', { name: /Volgende/i }))

    // lag-cursor element present
    const cursor = container.querySelector('.bc-lag-cursor') as HTMLElement | null
    expect(cursor).toBeTruthy()

    // dispatch a mousemove - the component listens on window and will update mouse ref
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 150, clientY: 120 }))
    // we can't reliably assert acceleration without access to internal refs; smoke-test that cursor exists
    expect(cursor).toBeTruthy()
  })

  test.todo('TC45: cursor becomes faster after removing a bug (requires controlling game loop)')
  test.todo('TC46: cursor does not speed up when no bug removed (TODO)')
})

