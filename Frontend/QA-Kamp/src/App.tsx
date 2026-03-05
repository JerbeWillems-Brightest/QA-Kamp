import { useState, useEffect, useCallback } from 'react'
import './App.css'

interface Item {
  _id: string
  name: string
  description: string
  createdAt: string
}

function App() {
  // Get backend base URL from env, remove trailing /api if present
  let API_URL = import.meta.env.VITE_API_URL || ''
  if (API_URL.endsWith('/api')) {
    API_URL = API_URL.slice(0, -4)
  }

  const [status, setStatus] = useState<{ message: string; time: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Items state
  const [items, setItems] = useState<Item[]>([])
  const [itemsLoading, setItemsLoading] = useState(false)
  const [itemsError, setItemsError] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')

  // Editing state
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')

  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch(`${API_URL || ''}/api/status`)
        if (!res.ok) { setError(`HTTP ${res.status}`); return }
        const data = await res.json()
        setStatus(data)
        setError(null)
      } catch (err) {
        setError(String(err))
      } finally {
        setLoading(false)
      }
    }
    fetchStatus()
  }, [API_URL])

  // Fetch items
  const fetchItems = useCallback(async () => {
    setItemsLoading(true)
    setItemsError(null)
    try {
      const res = await fetch(`${API_URL || ''}/api/items`)
      if (!res.ok) { setItemsError(`HTTP ${res.status}`); return }
      const data = await res.json()
      setItems(data)
    } catch (err) {
      setItemsError(String(err))
    } finally {
      setItemsLoading(false)
    }
  }, [API_URL])

  useEffect(() => { fetchItems() }, [fetchItems])

  // Create item
  async function createItem(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    try {
      const res = await fetch(`${API_URL || ''}/api/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, description: newDesc }),
      })
      if (!res.ok) { setItemsError(`HTTP ${res.status}`); return }
      setNewName('')
      setNewDesc('')
      fetchItems()
    } catch (err) {
      setItemsError(String(err))
    }
  }

  // Delete item
  async function deleteItem(id: string) {
    try {
      await fetch(`${API_URL || ''}/api/items/${id}`, { method: 'DELETE' })
      fetchItems()
    } catch (err) {
      setItemsError(String(err))
    }
  }

  // Start editing
  function startEdit(item: Item) {
    setEditId(item._id)
    setEditName(item.name)
    setEditDesc(item.description)
  }

  // Save edit
  async function saveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editId) return
    try {
      const res = await fetch(`${API_URL || ''}/api/items/${editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, description: editDesc }),
      })
      if (!res.ok) { setItemsError(`HTTP ${res.status}`); return }
      setEditId(null)
      fetchItems()
    } catch (err) {
      setItemsError(String(err))
    }
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 24 }}>
      <h1>QA-Kamp</h1>

      {/* Backend status */}
      <div style={{ marginBottom: 16 }}>
        {loading && <div>Loading backend status...</div>}
        {error && <div style={{ color: 'red' }}>Error: {error}</div>}
        {status && (
          <div>
            <strong>Backend:</strong> {status.message} &mdash;{' '}
            <small>{status.time}</small>
          </div>
        )}
      </div>

      <hr />

      {/* Create item form */}
      <h2>Items (MongoDB)</h2>
      <p style={{ fontSize: 12, color: '#888' }}>
        Data wordt opgeslagen in lokale MongoDB &mdash; open <strong>MongoDB Compass</strong> en
        verbind met <code>mongodb://localhost:27017</code>, database <code>qa-kamp</code>
      </p>

      <form onSubmit={createItem} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          placeholder="Name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          required
          style={{ flex: 1 }}
        />
        <input
          placeholder="Description"
          value={newDesc}
          onChange={(e) => setNewDesc(e.target.value)}
          style={{ flex: 2 }}
        />
        <button type="submit">Add</button>
      </form>

      {itemsError && <div style={{ color: 'red', marginBottom: 8 }}>Error: {itemsError}</div>}
      {itemsLoading && <div>Loading items...</div>}

      {/* Items list */}
      {items.length === 0 && !itemsLoading && <p>No items yet. Add one above!</p>}
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {items.map((item) => (
          <li
            key={item._id}
            style={{
              border: '1px solid #ccc',
              borderRadius: 6,
              padding: 12,
              marginBottom: 8,
            }}
          >
            {editId === item._id ? (
              <form onSubmit={saveEdit} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input value={editName} onChange={(e) => setEditName(e.target.value)} required />
                <input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
                <button type="submit">Save</button>
                <button type="button" onClick={() => setEditId(null)}>Cancel</button>
              </form>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{item.name}</strong>
                  {item.description && <span> &mdash; {item.description}</span>}
                  <br />
                  <small style={{ color: '#888' }}>
                    {new Date(item.createdAt).toLocaleString()}
                  </small>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => startEdit(item)}>Edit</button>
                  <button onClick={() => deleteItem(item._id)} style={{ color: 'red' }}>
                    Delete
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default App
