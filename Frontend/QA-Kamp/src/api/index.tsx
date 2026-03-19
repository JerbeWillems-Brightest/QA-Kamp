// Base URL from environment, strip trailing /api if present
let API_URL = import.meta.env.VITE_API_URL || ''
if (API_URL.endsWith('/api')) {
  API_URL = API_URL.slice(0, -4)
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

// heartbeat endpoint is intentionally not exported for now; if needed implement and enable.
