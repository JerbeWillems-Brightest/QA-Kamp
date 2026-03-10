// Base URL from environment, strip trailing /api if present
let API_URL = import.meta.env.VITE_API_URL || '';
if (API_URL.endsWith('/api')) {
  API_URL = API_URL.slice(0, -4);
}

export interface LoginResponse {
  message: string;
  user?: { id: string; email: string; name?: string };
}

export async function loginOrganizer(email: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || err.message || `HTTP ${res.status}`);
  }
  return res.json();
}

export interface SessionResponse {
  session?: { id: string; organizerId?: string; startedAt: string; name?: string };
  success?: boolean;
  error?: string;
}

function extractId(v: unknown): string | undefined {
  if (!v) return undefined
  if (typeof v === 'string') return v
  if (typeof v === 'object' && v !== null) {
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
  const res = await fetch(`${API_URL}/api/sessions/${sessionId}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || err.message || `HTTP ${res.status}`);
  }
  return res.json();
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
