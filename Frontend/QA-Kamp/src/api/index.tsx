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
