import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Import functions under test
import * as api from './index'

// Minimal mock for sessionStorage used by setPlayerOnline
function makeSessionStorageMock(initial: Record<string, string> = {}) {
  let store: Record<string, string> = { ...initial }
  return {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => { store[k] = String(v) },
    removeItem: (k: string) => { delete store[k] },
    clear: () => { store = {} },
  }
}

type HasSession = { sessionStorage: Storage | null }

describe('api/index', () => {
  const originalFetch = globalThis.fetch
  const originalSessionStorage = globalThis.sessionStorage

  beforeEach(() => {
    vi.resetAllMocks()
    // Provide a default sessionStorage mock using vitest helper
    vi.stubGlobal('sessionStorage', makeSessionStorageMock())
  })
  afterEach(() => {
    globalThis.fetch = originalFetch
    // restore original sessionStorage
    ;(globalThis as unknown as HasSession).sessionStorage = originalSessionStorage
  })

  it('loginOrganizer: surfaces network/CORS fetch errors', async () => {
    globalThis.fetch = vi.fn(() => { throw new Error('network down') }) as unknown as typeof fetch
    await expect(api.loginOrganizer('a', 'b')).rejects.toThrow(/Network or CORS error/)
  })

  it('loginOrganizer: handles non-ok json error body', async () => {
    globalThis.fetch = vi.fn(() => Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'bad cred' }) })) as unknown as typeof fetch
    await expect(api.loginOrganizer('a', 'b')).rejects.toThrow(/bad cred/)
  })

  it('createSession: normalizes _id and createdAt fields', async () => {
    const fake = {
      session: { _id: 'abc123', organizerId: { _id: 'org1' }, createdAt: '2024-01-02T00:00:00Z', name: 'mysess' }
    }
    globalThis.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(fake) })) as unknown as typeof fetch
    const res = await api.createSession('org1', 'mysess')
    expect(res.session).toBeDefined()
    expect(res.session?.id).toBe('abc123')
    expect(res.session?.organizerId).toBe('org1')
    expect(res.session?.startedAt).toBe('2024-01-02T00:00:00Z')
  })

  it('deleteSession: treats 404 as success', async () => {
    globalThis.fetch = vi.fn(() => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({ error: 'not found' }) })) as unknown as typeof fetch
    const res = await api.deleteSession('sess1')
    expect(res.success).toBe(true)
  })

  it('fetchPlayersForSession: maps backend fields', async () => {
    const backendPlayers = { players: [ { nummer: '5', naam: 'Jan', leeftijd: 9, lastseen: 'x' } ] }
    globalThis.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(backendPlayers) })) as unknown as typeof fetch
    const out = await api.fetchPlayersForSession('s')
    expect(out.players[0].playerNumber).toBe('5')
    expect(out.players[0].name).toBe('Jan')
    expect(out.players[0].age).toBe(9)
  })

  it('fetchOnlinePlayers: pads player numbers to 3 digits and maps lastSeen', async () => {
    const backend = { onlinePlayers: [ { nummer: '7', lastseen: 'now' } ] }
    globalThis.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(backend) })) as unknown as typeof fetch
    const out = await api.fetchOnlinePlayers('s')
    expect(out.onlinePlayers[0].playerNumber).toBe('007')
    expect(out.onlinePlayers[0].lastSeen).toBe('now')
  })

  it('setActiveGameInfo: omits body when info is null and sends body when provided', async () => {
    // When info === null, server will return ok true
    const calls: Array<{ url: string; opts?: RequestInit | undefined }> = []
    globalThis.fetch = vi.fn((url: string, opts?: RequestInit) => {
      calls.push({ url, opts })
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) }) as unknown as typeof fetch
    }) as unknown as typeof fetch
    const r1 = await api.setActiveGameInfo('sess', null)
    expect(r1.success).toBe(true)
    // implementation sets method:'POST' but omits headers/body when info is null
    expect(calls[0].opts).toBeDefined()
    expect((calls[0].opts as RequestInit).method).toBe('POST')
    expect((calls[0].opts as RequestInit).body).toBeUndefined()

    const r2 = await api.setActiveGameInfo('sess', { game: 'x' })
    expect(r2.success).toBe(true)
    expect(calls[1].opts).toBeDefined()
    // body should be a JSON string
    expect(String((calls[1].opts as RequestInit).body)).toContain('"game":"x"')
  })

  it('getActiveGameInfo: returns parsed json', async () => {
    globalThis.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ activeGameInfo: { foo: 'bar' } }) })) as unknown as typeof fetch
    const r = await api.getActiveGameInfo('sess')
    expect((r.activeGameInfo as unknown as Record<string, unknown>).foo).toBe('bar')
  })

  it('setPlayerOnline: respects local online lock and handles 409 from server', async () => {
    // set sessionStorage to indicate already locked for this session/player
    vi.stubGlobal('sessionStorage', makeSessionStorageMock({ playerOnlineLocked: 'true', playerSessionId: 's1', playerNumber: '007' }))
    // fetch should not be called in this case
    globalThis.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) })) as unknown as typeof fetch
    const r = await api.setPlayerOnline('s1', '007')
    expect(r.success).toBe(true)

    // Now simulate server 409 behavior
    vi.stubGlobal('sessionStorage', makeSessionStorageMock())
    globalThis.fetch = vi.fn(() => Promise.resolve({ ok: false, status: 409, json: () => Promise.resolve({ player: { playerNumber: '007' } }) })) as unknown as typeof fetch
    const r2 = await api.setPlayerOnline('s1', '007')
    expect(r2.success).toBe(true)
    expect(r2.player).toBeDefined()
  })

  it('joinSession, getActiveSession and joinActiveSession success paths', async () => {
    // joinSession
    globalThis.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ session: { id: 'js1' } }) })) as unknown as typeof fetch
    const j = await api.joinSession('code')
    expect(j.session?.id).toBe('js1')

    // getActiveSession
    globalThis.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ session: { id: 'active' } }) })) as unknown as typeof fetch
    const a = await api.getActiveSession()
    expect(a.session?.id).toBe('active')

    // joinActiveSession
    globalThis.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ session: { id: 's2' }, player: { playerNumber: '1' } }) })) as unknown as typeof fetch
    const ja = await api.joinActiveSession('1')
    expect(ja.session?.id).toBe('s2')
    const jaPlayer = ja.player as unknown as { playerNumber: string }
    expect(jaPlayer.playerNumber).toBe('1')
  })

  it('getSessions maps different id shapes and throws on error', async () => {
    // success with id field
    globalThis.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ sessions: [{ id: 'x', organizerId: 'o', startedAt: 't' }] }) })) as unknown as typeof fetch
    const r = await api.getSessions('o')
    expect(r.sessions[0].id).toBe('x')

    // error path
    globalThis.fetch = vi.fn(() => Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({ message: 'boom' }) })) as unknown as typeof fetch
    await expect(api.getSessions()).rejects.toThrow('boom')
  })

  it('addPlayersToSession handles success, overwrite and string error body', async () => {
    // success without overwrite
    globalThis.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ created: [{ playerNumber: '1' }] }) })) as unknown as typeof fetch
    const ok1 = await api.addPlayersToSession('s', [{ playerNumber: '1', name: 'A', age: 1 }])
    expect(ok1.created?.[0].playerNumber).toBe('1')

    // success with overwrite true (query param)
    const calls: Array<{ url: string }>= []
    globalThis.fetch = vi.fn((u: string) => { calls.push({ url: String(u) }); return Promise.resolve({ ok: true, json: () => Promise.resolve({ created: [] }) }) }) as unknown as typeof fetch
    await api.addPlayersToSession('s', [], true)
    expect(calls[0].url).toContain('?overwrite=true')

    // error where server returns a plain string body
    globalThis.fetch = vi.fn(() => Promise.resolve({ ok: false, status: 400, json: () => Promise.resolve('plain error') })) as unknown as typeof fetch
    await expect(api.addPlayersToSession('s', [])).rejects.toThrow('plain error')
  })

  it('updatePlayerInSession, deletePlayerFromSession and fetchLeaderboard mapping', async () => {
    // update success
    globalThis.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ player: { playerNumber: '2' } }) })) as unknown as typeof fetch
    const up = await api.updatePlayerInSession('s', '2', { playerNumber: '2', name: 'B', age: 2 })
    expect(up.player?.playerNumber).toBe('2')

    // delete player error path -> non-ok should throw
    globalThis.fetch = vi.fn(() => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({ error: 'nope' }) })) as unknown as typeof fetch
    await expect(api.deletePlayerFromSession('s', '9')).rejects.toThrow('nope')

    // leaderboard mapping with numeric score
    globalThis.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ leaderboard: [{ playerNumber: '3', name: 'C', age: 3, score: 42 }] }) })) as unknown as typeof fetch
    const lb = await api.fetchLeaderboard('s')
    expect(lb.leaderboard[0].playerNumber).toBe('3')
    const lbItem = lb.leaderboard[0] as unknown as { score?: number }
    expect(lbItem.score).toBe(42)
  })

  it('postPlayerHeartbeat success and setPlayerOffline success', async () => {
    globalThis.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) })) as unknown as typeof fetch
    const h = await api.postPlayerHeartbeat('s', '1')
    expect(h.success).toBe(true)

    globalThis.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) })) as unknown as typeof fetch
    const off = await api.setPlayerOffline('s', '1')
    expect(off.success).toBe(true)
  })

  it('loginOrganizer: non-ok and res.json rejects -> throws HTTP status', async () => {
    // simulate server error where res.json throws during parsing
    globalThis.fetch = vi.fn(() => Promise.resolve({ ok: false, status: 418, json: () => Promise.reject(new Error('bad json')) })) as unknown as typeof fetch
    await expect(api.loginOrganizer('x', 'y')).rejects.toThrow('HTTP 418')
  })

  it('createSession: handles numeric organizerId._id by stringifying it', async () => {
    const fake = { session: { _id: 'sid', organizerId: { _id: 5 }, createdAt: 12345 } }
    globalThis.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(fake) })) as unknown as typeof fetch
    const res = await api.createSession('5')
    expect(res.session?.organizerId).toBe('5')
  })

  it('getSessions: uses createdAt when startedAt missing and stringifies numbers', async () => {
    const backend = { sessions: [{ _id: 'n1', organizerId: { _id: 'o1' }, createdAt: 9999 }] }
    globalThis.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(backend) })) as unknown as typeof fetch
    const out = await api.getSessions('o1')
    expect(out.sessions[0].startedAt).toBe('9999')
  })

  it('setPlayerOnline: falls through when sessionStorage.getItem throws and handles non-409 errors', async () => {
    // Make sessionStorage.getItem throw to hit the try/catch branch
    vi.stubGlobal('sessionStorage', { getItem: () => { throw new Error('boom') } } as unknown as Storage)
    // Now simulate server success
    globalThis.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) })) as unknown as typeof fetch
    const r = await api.setPlayerOnline('sX', '42')
    expect(r.success).toBe(true)

    // Simulate non-409 server error
    globalThis.fetch = vi.fn(() => Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({ message: 'srvfail' }) })) as unknown as typeof fetch
    await expect(api.setPlayerOnline('sX', '42')).rejects.toThrow('srvfail')
  })

  it('deleteSession: ok response returns parsed json', async () => {
    globalThis.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) })) as unknown as typeof fetch
    const r = await api.deleteSession('sok')
    expect(r.success).toBe(true)
  })

  it('fetchOnlinePlayers: non-ok with empty body falls back to HTTP status message', async () => {
    globalThis.fetch = vi.fn(() => Promise.resolve({ ok: false, status: 401, json: () => Promise.resolve({}) })) as unknown as typeof fetch
    await expect(api.fetchOnlinePlayers('s')).rejects.toThrow('HTTP 401')
  })

  it('createSession: returns raw json when session missing', async () => {
    globalThis.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ foo: 'bar' }) })) as unknown as typeof fetch
    const r = await api.createSession('o')
    // should return the raw JSON (no .session)
    expect((r as unknown as Record<string, unknown>).foo).toBe('bar')
  })

  it('fetchPlayersForSession: non-ok responses with different error shapes', async () => {
    // plain string
    globalThis.fetch = vi.fn(() => Promise.resolve({ ok: false, status: 400, json: () => Promise.resolve('simple') })) as unknown as typeof fetch
    await expect(api.fetchPlayersForSession('s')).rejects.toThrow('simple')

    // Error instance
    globalThis.fetch = vi.fn(() => Promise.resolve({ ok: false, status: 401, json: () => Promise.resolve(new Error('errinst')) })) as unknown as typeof fetch
    await expect(api.fetchPlayersForSession('s')).rejects.toThrow('errinst')

    // object with error field
    globalThis.fetch = vi.fn(() => Promise.resolve({ ok: false, status: 402, json: () => Promise.resolve({ error: 'oops' }) })) as unknown as typeof fetch
    await expect(api.fetchPlayersForSession('s')).rejects.toThrow('oops')
  })

  it('fetchPlayersForSession: handles lastSeen variants and Dutch/English fields', async () => {
    const backend = { players: [ { playerNumber: '9', name: 'X', age: 1, lastSeen: 'a' }, { nummer: '10', naam: 'Y', leeftijd: 2, last_seen: 'b' }, { nummer: '11', naam: 'Z', leeftijd: 3, lastseen: 'c' } ] }
    globalThis.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(backend) })) as unknown as typeof fetch
    const o = await api.fetchPlayersForSession('s')
    expect(o.players[0].playerNumber).toBe('9')
    expect(o.players[1].playerNumber).toBe('10')
    expect(o.players[1].name).toBe('Y')
    expect(o.players[2].lastSeen).toBe('c')
  })

  it('fetchOnlinePlayers: handles playerNumber key and null lastSeen', async () => {
    const backend = { onlinePlayers: [ { playerNumber: '4' }, { nummer: '5', lastseen: null } ] }
    globalThis.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(backend) })) as unknown as typeof fetch
    const out = await api.fetchOnlinePlayers('s')
    expect(out.onlinePlayers[0].playerNumber).toBe('004')
    expect(out.onlinePlayers[1].playerNumber).toBe('005')
    expect(out.onlinePlayers[1].lastSeen).toBeNull()
  })

  it('setActiveGameInfo: undefined info omits body (treated like null) and returns success', async () => {
    globalThis.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) })) as unknown as typeof fetch
    const r = await api.setActiveGameInfo('s', undefined)
    expect(r.success).toBe(true)
  })

  it('updatePlayerInSession: non-ok with json rejecting falls back to HTTP status', async () => {
    globalThis.fetch = vi.fn(() => Promise.resolve({ ok: false, status: 503, json: () => Promise.reject(new Error('nojson')) })) as unknown as typeof fetch
    // when json() rejects the implementation falls back to the default error object
    await expect(api.updatePlayerInSession('s', '1', { playerNumber: '1', name: 'n', age: 1 })).rejects.toThrow('Unknown error')
  })

  it('setPlayerOffline: non-ok sets error status on thrown error', async () => {
    globalThis.fetch = vi.fn(() => Promise.resolve({ ok: false, status: 401, json: () => Promise.resolve({ message: 'nope' }) })) as unknown as typeof fetch
    await expect(api.setPlayerOffline('s', '1')).rejects.toMatchObject({ message: 'nope', status: 401 })
  })

  it('fetchPlayersForSession: res.json resolves to null -> fallback HTTP status used', async () => {
    globalThis.fetch = vi.fn(() => Promise.resolve({ ok: false, status: 418, json: () => Promise.resolve(null) })) as unknown as typeof fetch
    await expect(api.fetchPlayersForSession('s')).rejects.toThrow('HTTP 418')
  })

  it('fetchLeaderboard: category string and lastSeen mapping preserved', async () => {
    globalThis.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ leaderboard: [{ playerNumber: '10', name: 'Z', age: 10, category: 'A', lastSeen: 'ls', score: 7 }] }) })) as unknown as typeof fetch
    const lb = await api.fetchLeaderboard('s')
    expect(lb.leaderboard[0].category).toBe('A')
    const lbItem3 = lb.leaderboard[0] as unknown as { score?: number }
    expect(lbItem3.score).toBe(7)
    expect(lb.leaderboard[0].lastSeen).toBe('ls')
  })

  it('getActiveGameInfo: non-ok throws parsed message', async () => {
    globalThis.fetch = vi.fn(() => Promise.resolve({ ok: false, status: 403, json: () => Promise.resolve({ error: 'nope2' }) })) as unknown as typeof fetch
    await expect(api.getActiveGameInfo('s')).rejects.toThrow('nope2')
  })

  it('fetchOnlinePlayers: empty playerNumber results in 000 padding', async () => {
    const backend = { onlinePlayers: [ { foo: 'bar' } ] }
    globalThis.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(backend) })) as unknown as typeof fetch
    const out = await api.fetchOnlinePlayers('s')
    expect(out.onlinePlayers[0].playerNumber).toBe('000')
  })

  it('computeApiUrlFromEnv and __test_recomputeApiUrl/__test_getApiUrl behaviour (VITE_API_URL only)', () => {
    // VITE_API_URL taking precedence and stripping trailing /api
    const r1 = api.computeApiUrlFromEnv({ VITE_API_URL: 'https://api.example.com/api' } as { VITE_API_URL?: string; DEV?: boolean }, 'https://irrelevant')
    expect(r1).toBe('https://api.example.com')

    // When VITE_API_URL is empty we return empty string (dev URLs removed)
    const r2 = api.computeApiUrlFromEnv({ VITE_API_URL: '' } as { VITE_API_URL?: string; DEV?: boolean }, '')
    expect(r2).toBe('')

    // __test_recomputeApiUrl uses only VITE_API_URL and strips trailing /api
    const recomputed = api.__test_recomputeApiUrl({ VITE_API_URL: 'http://forced.dev/api' } as { VITE_API_URL?: string }, 'http://origin')
    expect(recomputed).toBe('http://forced.dev')
    expect(api.__test_getApiUrl()).toBe('http://forced.dev')
  })

  it('computeApiUrlFromEnv: tolerates non-string VITE_API_URL (try/catch path)', () => {
    // Pass a non-string so .endsWith would throw inside the try block and be caught
    const env = { VITE_API_URL: 123 } as unknown as { VITE_API_URL?: string }
    const val = api.computeApiUrlFromEnv(env, '')
    // treat returned value as unknown and compare
    expect(val as unknown as number).toBe(123)
  })


  it('createSession: handles truthy non-string organizerId._id by stringifying via extractId', async () => {
    const fake = { session: { _id: 'sid2', organizerId: { _id: true }, createdAt: 't' } }
    globalThis.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(fake) })) as unknown as typeof fetch
    const res = await api.createSession('o')
    // organizerId._id true should stringify to 'true'
    expect(res.session?.organizerId).toBe('true')
  })

  it('createSession: uses explicit id field when present and preserves startedAt', async () => {
    const fake = { session: { id: 'IDHERE', organizerId: 'orgX', startedAt: '2020-01-01', name: 'n' } }
    globalThis.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(fake) })) as unknown as typeof fetch
    const res = await api.createSession('orgX')
    expect(res.session?.id).toBe('IDHERE')
    expect(res.session?.startedAt).toBe('2020-01-01')
  })

  it('createSession: missing id/_id results in empty id string', async () => {
    const fake = { session: { organizerId: null, createdAt: 'ts' } }
    globalThis.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(fake) })) as unknown as typeof fetch
    const res = await api.createSession('org')
    expect(res.session?.id).toBe('')
  })

  it('__test_recomputeApiUrl: when frontend does not match and DEV false, VITE_API_URL_DEV may still be used if it ends with /api (implementation detail)', () => {
    const out = api.__test_recomputeApiUrl({ VITE_API_URL: '' } as { VITE_API_URL?: string }, 'https://not-a-match')
    // VITE_API_URL_DEV is removed from implementation; expect empty string when VITE_API_URL empty
    expect(out).toBe('')
  })

  it('computeApiUrlFromEnv: empty VITE_API_URL returns empty string (dev removed)', () => {
    const out = api.computeApiUrlFromEnv({ VITE_API_URL: '' } as { VITE_API_URL?: string; DEV?: boolean }, 'https://origin')
    expect(out).toBe('')
  })
})

