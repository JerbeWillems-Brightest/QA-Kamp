// Base URL from environment, strip trailing /api if present
let API_URL = import.meta.env.VITE_API_URL || '';
if (API_URL.endsWith('/api')) {
  API_URL = API_URL.slice(0, -4);
}

export interface Item {
  _id: string;
  name: string;
  description: string;
  createdAt: string;
}

export async function fetchStatus(): Promise<{ message: string; time: string }> {
  const res = await fetch(`${API_URL}/api/status`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchItems(): Promise<Item[]> {
  const res = await fetch(`${API_URL}/api/items`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function createItem(name: string, description: string): Promise<Item> {
  const res = await fetch(`${API_URL}/api/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function deleteItem(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/items/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export async function updateItem(id: string, name: string, description: string): Promise<Item> {
  const res = await fetch(`${API_URL}/api/items/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

