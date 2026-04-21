import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Navbar from './Navbar'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'

// Ensure the dynamic import used by Navbar (import('../api')) is mocked so
// setPlayerOffline can be observed without loading the real module.
vi.mock('../api', () => {
  return {
    setPlayerOffline: vi.fn(() => Promise.resolve({ success: true })),
  }
})

describe('Navbar', () => {
  beforeEach(() => {
    // Reset vitest mocks between tests so mock call counts don't leak
    vi.resetAllMocks()
    // Ensure a clean storage state for each test
    localStorage.clear()
    sessionStorage.clear()
  })
  afterEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
  // Test: controleert dat het QA Kamp-logo zichtbaar is en dat er geen uitlog-knop
  // wordt weergegeven wanneer de gebruiker niet is ingelogd (AuthProvider levert geen sessie).
  it('renders logo and no logout when not logged in', () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <Navbar />
        </AuthProvider>
      </BrowserRouter>
    )

    const logo = screen.getByAltText(/QA Kamp logo/i)
    expect(logo).toBeDefined()
    // logout button should not be present when not logged in
    expect(screen.queryByLabelText(/uitloggen/i)).toBeNull()
  })

  it('shows logout when organizer logged in and clicking it clears stored user', () => {
    // Simulate an authenticated organizer via localStorage (AuthProvider reads this on init)
    localStorage.setItem('user', JSON.stringify({ id: 'u1', email: 'organizer@example.com' }))
    render(
      <BrowserRouter>
        <AuthProvider>
          <Navbar />
        </AuthProvider>
      </BrowserRouter>
    )

    // logout button should now be present
    const btn = screen.getByLabelText(/uitloggen/i)
    expect(btn).toBeDefined()

    // click the logout button and assert that the user is removed from localStorage
    fireEvent.click(btn)
    // AuthProvider's logout should remove the 'user' key
    expect(localStorage.getItem('user')).toBeNull()
  })

  it('player logout clears sessionStorage and updates onlinePlayers in localStorage', () => {
    // Simulate logged-in player via sessionStorage
    sessionStorage.setItem('playerNumber', '5')
    sessionStorage.setItem('playerSessionId', 'sess-1')
    // Set onlinePlayers containing the plain and padded forms
    localStorage.setItem('onlinePlayers', JSON.stringify(['5', '010', '007']))
    // set a currentSessionId to be removed
    localStorage.setItem('currentSessionId', 'sess-1')

    // stub global.fetch so any dynamic import setPlayerOffline calls won't fail
    // (Navbar uses import('../api').then(m => m.setPlayerOffline(...)))
    // We provide a harmless resolved response for any fetch calls
    // Stub global.fetch so dynamic import won't fail in tests
    global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) })) as unknown as typeof global.fetch

    // spy on dispatchEvent to ensure storage events are fired
    const spy = vi.spyOn(window, 'dispatchEvent')

    render(
      <BrowserRouter>
        <AuthProvider>
          <Navbar />
        </AuthProvider>
      </BrowserRouter>
    )

    const btn = screen.getByLabelText(/uitloggen/i)
    expect(btn).toBeDefined()

    fireEvent.click(btn)

    // player-specific sessionStorage keys should be removed
    expect(sessionStorage.getItem('playerNumber')).toBeNull()
    expect(sessionStorage.getItem('playerSessionId')).toBeNull()
    expect(sessionStorage.getItem('playerOnlineLocked')).toBeNull()

    // onlinePlayers should have filtered out '5' (plain and padded '005')
    const remaining = JSON.parse(String(localStorage.getItem('onlinePlayers') || '[]'))
    expect(remaining).toEqual(['010', '007'])

    // currentSessionId should be removed
    expect(localStorage.getItem('currentSessionId')).toBeNull()

    // dispatchEvent should have been called at least once for storage notifications
    expect(spy).toHaveBeenCalled()

    spy.mockRestore()
  })

  it('player logout ensures setPlayerOffline is called when playerSessionId present', async () => {
    sessionStorage.setItem('playerNumber', '5')
    sessionStorage.setItem('playerSessionId', 'sess-1')
    localStorage.setItem('onlinePlayers', JSON.stringify(['5','010']))
    localStorage.setItem('currentSessionId', 'sess-1')

    // render and click
    render(
      <BrowserRouter>
        <AuthProvider>
          <Navbar />
        </AuthProvider>
      </BrowserRouter>
    )
    const btn = screen.getByLabelText(/uitloggen/i)
    fireEvent.click(btn)

    // import mocked api and assert setPlayerOffline was invoked
    const api = await import('../api')
    expect(api.setPlayerOffline).toHaveBeenCalledWith('sess-1', '5')
  })

  it('player logout when onlinePlayers missing still clears sessionStorage and currentSessionId', () => {
    sessionStorage.setItem('playerNumber', '21')
    sessionStorage.setItem('playerSessionId', 'sess-21')
    // do NOT set localStorage.onlinePlayers so getItem returns null

    render(
      <BrowserRouter>
        <AuthProvider>
          <Navbar />
        </AuthProvider>
      </BrowserRouter>
    )

    const btn = screen.getByLabelText(/uitloggen/i)
    expect(btn).toBeDefined()

    // clicking should not throw even when onlinePlayers absent
    fireEvent.click(btn)

    expect(sessionStorage.getItem('playerNumber')).toBeNull()
    expect(localStorage.getItem('currentSessionId')).toBeNull()
  })

  it('player logout handles invalid JSON in onlinePlayers gracefully', () => {
    sessionStorage.setItem('playerNumber', '33')
    sessionStorage.setItem('playerSessionId', 'sess-33')
    // invalid JSON to trigger parse error
    localStorage.setItem('onlinePlayers', 'not-a-json')
    localStorage.setItem('currentSessionId', 'sess-33')

    const spy = vi.spyOn(window, 'dispatchEvent')

    render(
      <BrowserRouter>
        <AuthProvider>
          <Navbar />
        </AuthProvider>
      </BrowserRouter>
    )

    const btn = screen.getByLabelText(/uitloggen/i)
    expect(btn).toBeDefined()
    fireEvent.click(btn)

    // invalid JSON should be caught and cleanup should still happen
    expect(sessionStorage.getItem('playerNumber')).toBeNull()
    expect(localStorage.getItem('currentSessionId')).toBeNull()
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  it('does not throw if window.dispatchEvent throws during logout', () => {
    localStorage.setItem('user', JSON.stringify({ id: 'uX', email: 'x' }))
    // make dispatchEvent throw to exercise inner try/catch
    const originalDispatch = window.dispatchEvent
    // assign a throwing implementation; cast through unknown to match the
    // expected dispatchEvent signature without using `any`.
    window.dispatchEvent = (() => { throw new Error('boom dispatch') }) as unknown as (ev: Event) => boolean

    render(
      <BrowserRouter>
        <AuthProvider>
          <Navbar />
        </AuthProvider>
      </BrowserRouter>
    )

    const btn = screen.getByLabelText(/uitloggen/i)
    expect(btn).toBeDefined()
    // clicking should not throw even if dispatchEvent throws
    expect(() => fireEvent.click(btn)).not.toThrow()

    // restore original dispatch implementation
    window.dispatchEvent = originalDispatch as (ev: Event) => boolean
  })

  it('player logout uses localStorage.currentSessionId when playerSessionId missing and calls setPlayerOffline', async () => {
    // No playerSessionId in sessionStorage, but currentSessionId in localStorage
    sessionStorage.setItem('playerNumber', '12')
    // deliberately omit sessionStorage.playerSessionId
    localStorage.setItem('currentSessionId', 'sess-2')
    localStorage.setItem('onlinePlayers', JSON.stringify(['012','099']))

    // spy on storage dispatches
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent')

    // render
    render(
      <BrowserRouter>
        <AuthProvider>
          <Navbar />
        </AuthProvider>
      </BrowserRouter>
    )

    const btn = screen.getByLabelText(/uitloggen/i)
    expect(btn).toBeDefined()

    // click and await potential dynamic import call
    fireEvent.click(btn)

    // the mocked module's setPlayerOffline should have been called with sess-2 and playerNumber
    const api = await import('../api')
    expect(api.setPlayerOffline).toHaveBeenCalledWith('sess-2', '12')

    // storage cleanup
    expect(sessionStorage.getItem('playerNumber')).toBeNull()
    expect(sessionStorage.getItem('playerSessionId')).toBeNull()
    // onlinePlayers filtered
    const rem = JSON.parse(String(localStorage.getItem('onlinePlayers') || '[]'))
    expect(rem).toEqual(['099'])

    // currentSessionId removed
    expect(localStorage.getItem('currentSessionId')).toBeNull()

    expect(dispatchSpy).toHaveBeenCalled()
    dispatchSpy.mockRestore()
  })

  it('logout button hover changes background and mouseout restores it', () => {
    localStorage.setItem('user', JSON.stringify({ id: 'u2', email: 'e' }))
    render(
      <BrowserRouter>
        <AuthProvider>
          <Navbar />
        </AuthProvider>
      </BrowserRouter>
    )
    const btn = screen.getByLabelText(/uitloggen/i)
    expect(btn).toBeDefined()
    // jsdom serializes computed inline color values to rgb(...) strings; read style.background
    const el = btn as HTMLElement
    const beforeBg = el.style.background
    // initial background should be white (rgb(255,255,255) or '#ffffff')
    expect(beforeBg === '#ffffff' || beforeBg.includes('255')).toBeTruthy()
    fireEvent.mouseOver(btn)
    const hoverBg = el.style.background
    // hover color is '#f6f6f6' => rgb(246,246,246) or hex
    expect(hoverBg === '#f6f6f6' || hoverBg.includes('246')).toBeTruthy()
    fireEvent.mouseOut(btn)
    const afterBg = el.style.background
    expect(afterBg === '#ffffff' || afterBg.includes('255')).toBeTruthy()
  })

  it('player logout when no session ids does not call setPlayerOffline and still clears storage', async () => {
    // playerNumber present but no playerSessionId and no currentSessionId
    sessionStorage.setItem('playerNumber', '99')
    // ensure neither sessionStorage.playerSessionId nor localStorage.currentSessionId exist

    render(
      <BrowserRouter>
        <AuthProvider>
          <Navbar />
        </AuthProvider>
      </BrowserRouter>
    )

    const btn = screen.getByLabelText(/uitloggen/i)
    fireEvent.click(btn)

    // setPlayerOffline should not have been called
    const api = await import('../api')
    expect(api.setPlayerOffline).not.toHaveBeenCalled()

    // storage cleared
    expect(sessionStorage.getItem('playerNumber')).toBeNull()
  })

  it('handles setPlayerOffline rejection without throwing', async () => {
    // prepare player with session id
    sessionStorage.setItem('playerNumber', '77')
    sessionStorage.setItem('playerSessionId', 'sess-77')
    localStorage.setItem('onlinePlayers', JSON.stringify(['077']))
    localStorage.setItem('currentSessionId', 'sess-77')

    const api = await import('../api')
    // make mocked implementation reject (cast to vitest Mock so mockImplementation is typed)
    if (api.setPlayerOffline) {
      ;(api.setPlayerOffline as unknown as Mock).mockImplementation(() => Promise.reject(new Error('remote fail')))
    }

    render(
      <BrowserRouter>
        <AuthProvider>
          <Navbar />
        </AuthProvider>
      </BrowserRouter>
    )

    const btn = screen.getByLabelText(/uitloggen/i)
    // clicking should not throw even when setPlayerOffline rejects
    expect(() => fireEvent.click(btn)).not.toThrow()

    // cleanup: restore mock to resolved to avoid impacting other tests
    if (api.setPlayerOffline) {
      ;(api.setPlayerOffline as unknown as Mock).mockImplementation(() => Promise.resolve({ success: true }))
    }
  })

  it('does not throw when sessionStorage.removeItem throws during logout', () => {
    // make a sessionStorage that throws on removeItem
    const originalSession = (globalThis as unknown as { sessionStorage?: Storage | null }).sessionStorage
    const throwingSession = {
      getItem: (k: string) => (k === 'playerNumber' ? '55' : null),
      setItem: () => {},
      removeItem: () => { throw new Error('boom remove') },
      clear: () => {},
      key: () => null,
      length: 0,
    } as unknown as Storage
    // stub the global sessionStorage with a throwing implementation (cast to Storage)
    vi.stubGlobal('sessionStorage', throwingSession as unknown as Storage)

    render(
      <BrowserRouter>
        <AuthProvider>
          <Navbar />
        </AuthProvider>
      </BrowserRouter>
    )

    const btn = screen.getByLabelText(/uitloggen/i)
    expect(() => fireEvent.click(btn)).not.toThrow()

    // restore original sessionStorage
    vi.stubGlobal('sessionStorage', originalSession as unknown as Storage)
  })

  it('player logout navigates to root (/) after logout', () => {
    // start at a different path so we can observe navigation
    window.history.pushState({}, '', '/play')

    sessionStorage.setItem('playerNumber', '42')
    sessionStorage.setItem('playerSessionId', 'sess-42')
    localStorage.setItem('onlinePlayers', JSON.stringify(['042']))

    render(
      <BrowserRouter>
        <AuthProvider>
          <Navbar />
        </AuthProvider>
      </BrowserRouter>
    )

    const btn = screen.getByLabelText(/uitloggen/i)
    fireEvent.click(btn)

    // navbar should navigate back to root for player logout
    expect(window.location.pathname).toBe('/')
  })

  it('organizer logout navigates to /organizer-login', () => {
    // place user in storage to simulate organizer
    localStorage.setItem('user', JSON.stringify({ id: 'org1', email: 'o' }))
    // start at a different path
    window.history.pushState({}, '', '/dashboard')

    render(
      <BrowserRouter>
        <AuthProvider>
          <Navbar />
        </AuthProvider>
      </BrowserRouter>
    )

    const btn = screen.getByLabelText(/uitloggen/i)
    fireEvent.click(btn)

    expect(window.location.pathname).toBe('/organizer-login')
  })

  it('player takes precedence over organizer when both present', () => {
    // both user and playerNumber present: player branch should be executed
    localStorage.setItem('user', JSON.stringify({ id: 'org2', email: 'org2@example.com' }))
    sessionStorage.setItem('playerNumber', '88')
    sessionStorage.setItem('playerSessionId', 'sess-88')
    localStorage.setItem('onlinePlayers', JSON.stringify(['088']))

    // start somewhere else
    window.history.pushState({}, '', '/somewhere')

    render(
      <BrowserRouter>
        <AuthProvider>
          <Navbar />
        </AuthProvider>
      </BrowserRouter>
    )

    const btn = screen.getByLabelText(/uitloggen/i)
    fireEvent.click(btn)

    // player logout should navigate to root
    expect(window.location.pathname).toBe('/')
    // user in localStorage should remain (player branch doesn't call auth.logout)
    expect(localStorage.getItem('user')).not.toBeNull()
  })

  it('does not throw when window.dispatchEvent throws during player logout', () => {
    // prepare player
    sessionStorage.setItem('playerNumber', '66')
    sessionStorage.setItem('playerSessionId', 'sess-66')
    localStorage.setItem('onlinePlayers', JSON.stringify(['066']))

    const originalDispatch = window.dispatchEvent
    // make dispatchEvent throw during player logout
    window.dispatchEvent = (() => { throw new Error('boom dispatch') }) as unknown as (ev: Event) => boolean

    render(
      <BrowserRouter>
        <AuthProvider>
          <Navbar />
        </AuthProvider>
      </BrowserRouter>
    )

    const btn = screen.getByLabelText(/uitloggen/i)
    expect(() => fireEvent.click(btn)).not.toThrow()

    // navigation should still have occurred
    expect(window.location.pathname).toBe('/')

    // restore
    window.dispatchEvent = originalDispatch as (ev: Event) => boolean
  })
})
