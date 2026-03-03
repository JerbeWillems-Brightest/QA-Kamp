import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [status, setStatus] = useState<{ message: string; time: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // New state for health button
  const [healthMessage, setHealthMessage] = useState<string | null>(null)
  const [healthLoading, setHealthLoading] = useState(false)
  const [healthError, setHealthError] = useState<string | null>(null)

  useEffect(() => {
    // Use relative /api path — vite proxy will forward to backend in dev
    async function fetchStatus() {
      try {
        const res = await fetch('/api/status')
        if (!res.ok) {
          setError(`HTTP ${res.status}`)
          return
        }
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
  }, [])

  // Handler for the health button
  async function checkHealth() {
    setHealthLoading(true)
    setHealthError(null)
    setHealthMessage(null)
    try {
      // Call the dedicated health endpoint on the backend
      const res = await fetch('/api/status')
      if (!res.ok) {
        setHealthError(`HTTP ${res.status}`)
        return
      }
      const data = await res.json()

      // Type guard to check for a `message` property without using `any`
      function hasMessage(obj: unknown): obj is { message: unknown } {
        return typeof obj === 'object' && obj !== null && 'message' in obj
      }

      // If the backend returns an object with message, use it; otherwise stringify
      if (hasMessage(data)) {
        const msg = data.message
        setHealthMessage(typeof msg === 'string' ? msg : JSON.stringify(msg))
      } else if (typeof data === 'string') {
        setHealthMessage(data)
      } else {
        setHealthMessage(JSON.stringify(data))
      }
    } catch (err) {
      setHealthError(String(err))
    } finally {
      setHealthLoading(false)
    }
  }

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        {loading && <div>Loading backend status...</div>}
        {error && <div style={{ color: 'red' }}>Error: {error}</div>}
        {status && (
          <div>
            <strong>Backend:</strong> {status.message} <br />
            <small>{status.time}</small>
          </div>
        )}
      </div>

      <div style={{ marginBottom: 16 }}>
        <button onClick={checkHealth} disabled={healthLoading}>
          {healthLoading ? 'Checking health...' : 'Check health'}
        </button>
        {healthError && <div style={{ color: 'red' }}>Error: {healthError}</div>}
        {healthMessage && (
          <div>
            <strong>Health:</strong> {healthMessage}
          </div>
        )}
      </div>
    </>
  )
}

export default App
