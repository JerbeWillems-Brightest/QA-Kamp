// Base URL from environment, strip trailing /api if present
let API_URL = ''

export function computeApiUrlFromEnv(env: { VITE_API_URL?: string; DEV?: boolean }, _locationOrigin?: string) {
  // mark unused param as used to satisfy lint rule when callers pass a second arg in tests
  void _locationOrigin
  // derive raw value: only consider the production API URL (VITE_API_URL)
  const rawApi = env && typeof env.VITE_API_URL !== 'undefined' ? (env.VITE_API_URL || '') : (import.meta.env.VITE_API_URL || '')

  let computed = rawApi || ''
  try {
    if (computed.endsWith('/api')) computed = computed.slice(0, -4)
  } catch {
    // ignore
  }

  return computed
}

// initialize using real import.meta.env
API_URL = computeApiUrlFromEnv(import.meta.env as unknown as { VITE_API_URL?: string; DEV?: boolean })

    // Expose test helpers so unit tests can exercise the environment-based branches
    // without having to reload the module under different build-time envs.
    export function __test_recomputeApiUrl(env?: { VITE_API_URL?: string; VITE_API_URL_DEV?: string; VITE_FRONTEND_DEV?: string; DEV?: boolean }, _locationOrigin?: string) {
          // mark optional param used to satisfy lint when tests pass two args
          void _locationOrigin
          // Use provided values or fall back to current import.meta.env
          const apiUrlRaw = env && typeof env.VITE_API_URL !== 'undefined' ? (env.VITE_API_URL || '') : (import.meta.env.VITE_API_URL || '')

          let computed = apiUrlRaw || ''
          try {
            if (computed.endsWith('/api')) computed = computed.slice(0, -4)
          } catch {
            // ignore
          }

          API_URL = computed
          return API_URL
        }

    export function __test_getApiUrl() {
      return API_URL
    }

export interface LoginResponse {
  message: string;
  user?: { id: string; email: string; name?: string };
}

// Helper: centralize fetch handling so network/CORS errors are surfaced clearly
async function safeFetch<T = never>(url: string, opts?: RequestInit): Promise<T> {
  // First do the network-level fetch and catch network/CORS errors explicitly
  let res: Response
  try {
    res = await fetch(url, opts)
  } catch (err: unknown) {
    const original = err instanceof Error ? err.message : String(err)
    const message = `Network or CORS error fetching ${url}: ${original}`
    console.error(message, { url, opts, err })
    throw new Error(message)
  }

  // Now handle non-OK HTTP responses (server returned error)
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    const errMsg = (body && (body.error || body.message)) || `HTTP ${res.status}`
    throw new Error(errMsg)
  }

  // parse JSON (or throw if invalid)
  return await res.json()
}

export async function loginOrganizer(email: string, password: string): Promise<LoginResponse> {
  const url = `${API_URL}/api/auth/login`
  return safeFetch<LoginResponse>(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
}

export async function joinSession(code: string): Promise<{ session?: { id: string; organizerId?: string; name?: string; code?: string } }> {
  const url = `${API_URL}/api/sessions/join`
  return safeFetch<{ session?: { id: string; organizerId?: string; name?: string; code?: string } }>(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  })
}

export async function getActiveSession(): Promise<{ session?: { id: string; organizerId?: string; name?: string; code?: string } }> {
  const url = `${API_URL}/api/sessions/active`
  return safeFetch<{ session?: { id: string; organizerId?: string; name?: string; code?: string } }>(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })
}

// Join the currently active session using only the player's number.
// Returns { session, player } on success.
export async function joinActiveSession(playerNumber: string): Promise<{ session?: { id: string; code?: string; name?: string }, player?: ApiPlayer | unknown }> {
  const url = `${API_URL}/api/sessions/active/join`
  return safeFetch<{ session?: { id: string; code?: string; name?: string }, player?: ApiPlayer | unknown }>(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerNumber }),
  })
}

export interface SessionResponse {
  session?: { id: string; organizerId?: string; startedAt: string; name?: string };
  success?: boolean;
  error?: string;
}

function extractId(v: unknown): string | undefined {
  if (!v) return undefined
  if (typeof v === 'string') return v
  if (typeof v === 'object') {
    const r = v as Record<string, unknown>
    if (typeof r.id === 'string') return r.id
    if (typeof r._id === 'string') return r._id
    if (r._id) return String(r._id)
  }
  return undefined
}

export async function createSession(organizerId: string, name?: string): Promise<SessionResponse> {
  const res = await fetch(`${API_URL}/api/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ organizerId, name }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(err.error || err.message || `HTTP ${res.status}`)
  }
  const json = await res.json()
  // normalize mongoose _id to id for frontend convenience
  if (json?.session) {
    const s = json.session as Record<string, unknown>
    const normalized = {
      id: extractId(s) ?? '',
      organizerId: extractId(s.organizerId),
      startedAt: typeof s.startedAt === 'string' ? s.startedAt : (s.createdAt ? String(s.createdAt) : ''),
      name: typeof s.name === 'string' ? s.name : undefined,
    }
    return { session: normalized as SessionResponse['session'] }
  }
  return json
}

export async function deleteSession(sessionId: string): Promise<SessionResponse> {
  // Build URL: if VITE_API_URL is empty this becomes a relative path (/api/...), which works with Vite dev proxy
  const base = API_URL || ''
  const url = `${base}/api/sessions/${sessionId}?confirm=true`
  const res = await fetch(url, { method: 'DELETE', headers: { 'Content-Type': 'application/json', 'x-confirm-delete': 'true' } })
  if (!res.ok) {
    // If session not found (404), treat as successful deletion (session already gone)
    if (res.status === 404) {
      const body = await res.json().catch(() => null)
      console.warn('deleteSession: server returned 404 (not found):', body)
      return { success: true }
    }
    const body = await res.json().catch(() => null)
    const msg = (body && (body.error || body.message)) || `HTTP ${res.status}`
    throw new Error(String(msg))
  }
  return res.json()
}

export async function getSessions(organizerId?: string) : Promise<{ sessions: Array<{ id: string; organizerId?: string; startedAt: string; name?: string }> }> {
  const url = organizerId ? `${API_URL}/api/sessions?organizerId=${encodeURIComponent(organizerId)}` : `${API_URL}/api/sessions`
  const res = await fetch(url)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(err.error || err.message || `HTTP ${res.status}`)
  }
  const json = await res.json()
  const list = (json.sessions || []).map((s: unknown) => {
    const r = s as Record<string, unknown>
    return {
      id: extractId(r) ?? '',
      organizerId: extractId(r.organizerId),
      startedAt: typeof r.startedAt === 'string' ? r.startedAt : (r.createdAt ? String(r.createdAt) : ''),
      name: typeof r.name === 'string' ? r.name : undefined,
    }
  }) as { id: string; organizerId?: string; startedAt: string; name?: string }[]
  return { sessions: list }
}

// --- Players helpers ---
export interface ApiPlayer {
  playerNumber: string
  name: string
  age: number
  lastSeen?: string | null
  category?: string
}

// Represent possible shapes returned by the backend (old Dutch names included for robustness)
type BackendPlayer = Partial<Record<'playerNumber'|'nummer'|'name'|'naam'|'age'|'leeftijd'|'category'|'lastSeen'|'last_seen'|'lastseen', unknown>>

function parseErrorMessage(err: unknown, fallback: string) {
  if (!err) return fallback
  if (typeof err === 'string') return err
  if (err instanceof Error) return err.message
  try {
    const o = err as Record<string, unknown>
    if (typeof o.error === 'string') return o.error
    if (typeof o.message === 'string') return o.message
    return fallback
  } catch {
    return fallback
  }
}

export async function fetchPlayersForSession(sessionId: string): Promise<{ players: ApiPlayer[] }> {
  const res = await fetch(`${API_URL}/api/sessions/${sessionId}/players`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(parseErrorMessage(err, `HTTP ${res.status}`))
  }
  const json = await res.json()
  // The backend now returns players with English fields; normalize if needed
  const players = (json.players || []).map((p: unknown) => {
    const bp = p as BackendPlayer
    const playerNumber = String(bp.playerNumber ?? bp.nummer ?? '')
    const name = String(bp.name ?? bp.naam ?? '')
    const age = Number(bp.age ?? bp.leeftijd ?? 0)
    const category = typeof bp.category === 'string' ? bp.category : undefined
    const bpRec = bp as Record<string, unknown>
    const lastSeen = (bpRec['lastSeen'] ?? bpRec['last_seen'] ?? bpRec['lastseen'] ?? null) as string | null
    return { playerNumber, name, age, category, lastSeen } as ApiPlayer
  })
  return { players }
}

// Fetch authoritative online players for a session (backend endpoint returns players with lastSeen)
export async function fetchOnlinePlayers(sessionId: string, cutoffMs = 15000): Promise<{ onlinePlayers: { playerNumber: string; lastSeen?: string | null }[] }> {
  const url = `${API_URL}/api/sessions/${encodeURIComponent(sessionId)}/online-players?cutoffMs=${encodeURIComponent(String(cutoffMs))}`
  const res = await fetch(url)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(parseErrorMessage(err, `HTTP ${res.status}`))
  }
  const json = await res.json()
        const list = (json.onlinePlayers || []).map((p: unknown) => {
          const obj = p as Record<string, unknown>
          const pn = String(obj['playerNumber'] ?? obj['nummer'] ?? '')
          const lastSeen = (obj['lastSeen'] ?? obj['last_seen'] ?? obj['lastseen'] ?? null) as string | null
          return { playerNumber: pn.padStart(3, '0'), lastSeen }
        })
  return { onlinePlayers: list }
}

export async function addPlayersToSession(sessionId: string, players: ApiPlayer[], overwrite = false): Promise<{ created?: ApiPlayer[] }> {
  const q = overwrite ? '?overwrite=true' : ''
  const res = await fetch(`${API_URL}/api/sessions/${sessionId}/players${q}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ players }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(parseErrorMessage(err, `HTTP ${res.status}`))
  }
  return res.json()
}

export async function updatePlayerInSession(sessionId: string, playerNumber: string, player: ApiPlayer): Promise<{ player?: ApiPlayer }> {
  const res = await fetch(`${API_URL}/api/sessions/${sessionId}/players/${encodeURIComponent(playerNumber)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ player }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(parseErrorMessage(err, `HTTP ${res.status}`))
  }
  return res.json()
}

export async function deletePlayerFromSession(sessionId: string, playerNumber: string): Promise<{ success?: boolean }> {
  const res = await fetch(`${API_URL}/api/sessions/${sessionId}/players/${encodeURIComponent(playerNumber)}`, { method: 'DELETE' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(parseErrorMessage(err, `HTTP ${res.status}`))
  }
  return res.json()
}

export async function fetchLeaderboard(sessionId: string): Promise<{ leaderboard: ApiPlayer[] }> {
  const res = await fetch(`${API_URL}/api/sessions/${sessionId}/leaderboard`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(parseErrorMessage(err, `HTTP ${res.status}`))
  }
  const json = await res.json()
  const list = (json.leaderboard || []).map((p: unknown) => {
    const bp = p as Record<string, unknown>
    const playerNumber = String(bp['playerNumber'] ?? bp['nummer'] ?? '')
    const name = String(bp['name'] ?? bp['naam'] ?? '')
    const age = Number(bp['age'] ?? bp['leeftijd'] ?? 0)
    const category = typeof bp['category'] === 'string' ? String(bp['category']) : ''
    const lastSeen = bp && bp['lastSeen'] ? String(bp['lastSeen']) : null
    const out: ApiPlayer & { score?: number } = { playerNumber, name, age, category, lastSeen }
    const scoreVal = bp['score']
    if (typeof scoreVal === 'number') out.score = scoreVal as number
    return out
  })
  return { leaderboard: list }
}

export async function setActiveGameInfo(sessionId: string, info: Record<string, unknown> | null | undefined): Promise<{ success?: boolean; activeGameInfo?: unknown }> {
  const url = `${API_URL || ''}/api/sessions/${sessionId}/active-game`
  // Avoid sending the literal JSON "null" (JSON.stringify(null) -> "null") because
  // body-parser in strict mode rejects non-object/array JSON (it treats "null" as invalid).
  // If info is null we'll omit the body so the server sees no body and we can interpret
  // that as a request to clear the activeGameInfo (the backend code uses `req.body || null`).
  const opts: RequestInit = { method: 'POST' }
  if (info !== null && typeof info !== 'undefined') {
    opts.headers = { 'Content-Type': 'application/json' }
    opts.body = JSON.stringify(info)
  }
  const res = await fetch(url, opts)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(parseErrorMessage(err, `HTTP ${res.status}`))
  }
  return res.json()
}

export async function getActiveGameInfo(sessionId: string): Promise<{ activeGameInfo?: unknown }> {
  const url = `${API_URL || ''}/api/sessions/${sessionId}/active-game`
  const res = await fetch(url)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(parseErrorMessage(err, `HTTP ${res.status}`))
  }
  return res.json()
}

export async function postPlayerHeartbeat(sessionId: string, playerNumber: string): Promise<{ success?: boolean; player?: unknown }> {
  const base = API_URL || ''
  const url = `${base}/api/sessions/${sessionId}/players/${encodeURIComponent(playerNumber)}/heartbeat`
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' } })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }))
    const msg = parseErrorMessage(err, `HTTP ${res.status}`)
    const e = new Error(msg) as Error & { status?: number }
    e.status = res.status
    throw e
  }
  return res.json()
}

// Explicit online/offline controls
export async function setPlayerOnline(sessionId: string, playerNumber: string): Promise<{ success?: boolean; player?: unknown }> {
  // If this client/tab already holds a local 'online lock' (set during login),
  // avoid calling the server again to prevent 409 races when multiple tabs
  // attempt to mark the same player online. This guard is safe because the
  // local lock is set only after a successful server-side setPlayerOnline.
  try {
    if (typeof window !== 'undefined') {
      const locked = sessionStorage.getItem('playerOnlineLocked') === 'true'
      const sid = sessionStorage.getItem('playerSessionId') || ''
      const pn = sessionStorage.getItem('playerNumber') || ''
      if (locked && sid && pn && sid === String(sessionId) && pn === String(playerNumber)) {
        return { success: true }
      }
    }
  } catch {
    // ignore and fall through to network call
  }

  const url = `${API_URL}/api/sessions/${encodeURIComponent(sessionId)}/players/${encodeURIComponent(playerNumber)}/online`
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' } })
  if (!res.ok) {
    // If backend returns 409 Conflict for "already online", treat as non-fatal
    // and return success so callers don't have to special-case thrown errors.
    if (res.status === 409) {
      // try to read body for additional info but ignore parse failures
      const body = await res.json().catch(() => null)
      return { success: true, player: body?.player ?? undefined }
    }
    const err = await res.json().catch(() => ({ error: 'Unknown error' }))
    const msg = parseErrorMessage(err, `HTTP ${res.status}`)
    const e = new Error(msg) as Error & { status?: number }
    e.status = res.status
    throw e
  }
  return res.json()
}

export async function setPlayerOffline(sessionId: string, playerNumber: string): Promise<{ success?: boolean }> {
  const url = `${API_URL}/api/sessions/${encodeURIComponent(sessionId)}/players/${encodeURIComponent(playerNumber)}/offline`
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' } })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }))
    const msg = parseErrorMessage(err, `HTTP ${res.status}`)
    const e = new Error(msg) as Error & { status?: number }
    e.status = res.status
    throw e
  }
  return res.json()
}
