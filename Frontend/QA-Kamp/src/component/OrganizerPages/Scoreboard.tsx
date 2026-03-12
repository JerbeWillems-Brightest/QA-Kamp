import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchLeaderboard, fetchPlayersForSession } from '../../api'
import { useSession } from '../../context/SessionContext'

type LeaderboardItem = {
  playerNumber: string
  name: string
  category?: string
  score?: number
}

export default function Scoreboard() {
  const navigate = useNavigate()
  const { currentSession } = useSession()
  const sessionId = currentSession?.id
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<LeaderboardItem[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionId) {
      setError('Geen actieve sessie gevonden')
      return
    }
    const sid = sessionId as string
    let mounted = true
    async function load() {
      setLoading(true)
      try {
        // try leaderboard (sorted by score desc on server)
        const lbResp = await fetchLeaderboard(sid)
        if (!mounted) return
        const lb = (lbResp && lbResp.leaderboard) || []
        const leaderboardTyped = lb as LeaderboardItem[]
        // check if any score > 0
        const hasNonZero = leaderboardTyped.some((p) => (p.score ?? 0) > 0)
        if (hasNonZero) {
          setItems(leaderboardTyped)
        } else {
          // no game started: fetch players and show alphabetical list (by name)
          try {
            const pResp = await fetchPlayersForSession(sid)
            if (!mounted) return
            const rawPlayers = (pResp && (pResp as { players?: unknown[] }).players) || []
            // map and sort alphabetically by name
            const mapped: LeaderboardItem[] = (rawPlayers as Record<string, unknown>[]).map((p) => ({
              playerNumber: String(p['playerNumber'] ?? p['nummer'] ?? ''),
              name: String(p['name'] ?? p['naam'] ?? '').toLowerCase(),
              category: String(p['category'] ?? ''),
              score: typeof p['score'] === 'number' ? (p['score'] as number) : 0,
            }))
            mapped.sort((a, b) => a.name.localeCompare(b.name))
            setItems(mapped)
          } catch (pe) {
            console.warn('Failed to fetch players fallback', pe)
            setItems([])
          }
        }
        setError(null)
      } catch (err: unknown) {
        console.error('Failed to fetch leaderboard', err)
        if (!mounted) return
        setError('Kon leaderboard niet laden')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    const iv = setInterval(load, 3000)
    return () => { mounted = false; clearInterval(iv) }
  }, [sessionId])

  function handleBack() {
    navigate('/day-overview')
  }

  return (
    <main style={{ padding: 20 }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <button id="BackBtn" onClick={handleBack} style={{ marginBottom: 12, background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 16 }}>⬅️ Terug</button>
        <h2>Scorebord</h2>
        {!sessionId && <div style={{ color: '#b00020' }}>Geen actieve sessie gevonden</div>}
        {loading && <div>Laden...</div>}
        {error && <div style={{ color: '#b00020' }}>{error}</div>}
        {!loading && !error && (
          <div>
            {items.length === 0 ? (
              <div style={{ padding: 20, border: '1px dashed #ddd', borderRadius: 8 }}>Er is nog geen scorebord beschikbaar</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', background: '#f7f7f7' }}>
                      <th style={{ padding: 8 }}>#</th>
                      <th style={{ padding: 8 }}>Naam</th>
                      <th style={{ padding: 8 }}>Spelersnummer</th>
                      <th style={{ padding: 8 }}>Categorie</th>
                      <th style={{ padding: 8 }}>Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((p, i) => (
                      <tr key={p.playerNumber || i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <td style={{ padding: 8 }}>{i + 1}</td>
                        <td style={{ padding: 8 }}>{p.name}</td>
                        <td style={{ padding: 8 }}>{p.playerNumber}</td>
                        <td style={{ padding: 8 }}>{p.category}</td>
                        <td style={{ padding: 8 }}>{p.score ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
