import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchLeaderboard, fetchPlayersForSession } from '../../api'
import { useSession } from '../../context/SessionContext'
// Embedded CSS so HTML + CSS live in a single file
const embeddedCss = `
body{
    font-family: Arial, Helvetica, sans-serif;
    background: #ffffff;
}

/* make scoreboard full width with comfortable side padding */
.container{
    width: calc(100% - 48px);
    margin:20px 24px;
    box-sizing: border-box;
}

.back{
    text-decoration:none;
    color:#555;
    font-size:14px;
}

h1{ margin-top:10px }

.table-header{
    display:grid;
    grid-template-columns: 1fr 3fr 1fr;
    margin-top:30px;
    font-weight:bold;
    color:#666;
}

.row{
    display:grid;
    grid-template-columns: 1fr 3fr 1fr;
    align-items:center;
    padding:10px 15px;
    margin-top:8px;
    border-radius:8px;
    width: 100%;
}

/* ensure individual cells are grid items and center the score (3rd column) */
.row > span{
    display: block; /* make spans act as grid items we can align */
}
.row > span:nth-child(3){
    justify-self: center; /* center horizontally in the 3rd column */
    text-align: center;   /* center the text inside the span */
}

.table-header span:nth-child(3){
    text-align: center; /* center the header label for the score column */
}

/* top 3 */
.gold1{ background:#f1c40f; color:white; font-weight:bold }
.silver{ background:#bfbfbf; color:white; font-weight:bold }
.gold3{ background:#f5b041; color:white; font-weight:bold }

/* gewone rijen */
.normal{ border:2px solid #f1c40f; background:white }

.badge{
    background:#f1c40f;
    padding:4px 10px;
    border-radius:6px;
    color:white;
    font-weight:bold;
    width:fit-content;
}

@media (max-width: 640px) {
  .container { width: 100%; margin: 12px; }
  .table-header, .row { grid-template-columns: 1fr 2fr 1fr; }
}
`
document.head.insertAdjacentHTML('beforeend', `<style>${embeddedCss}</style>`)

type LeaderboardItem = {
  playerNumber: string
  name: string
  category?: string
  score?: number
}

export default function Scoreboard() {
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
    const iv = setInterval(load, 10000) // poll every 10 seconds
    return () => { mounted = false; clearInterval(iv) }
  }, [sessionId])

  return (
    <main style={{ padding: 20 }}>
      {/* Back link and title grouped and left-aligned under the logo */}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', paddingLeft: 24, gap: 8 }}>
        <Link id="BackBtn" to="/day-overview" className="back" aria-label="Terug naar kalender" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>Terug</span>
        </Link>
        <h1 style={{ margin: 0, fontSize: 48, fontWeight: '800' }}>Scorebord</h1>
      </div>
      <div style={{ width: '100%' }}>
        {!sessionId && <div style={{ color: '#b00020' }}>Geen actieve sessie gevonden</div>}
        {loading && <div>Laden...</div>}
        {error && <div style={{ color: '#b00020' }}>{error}</div>}
        {!loading && !error && (
          <div className="container">
            {items.length === 0 ? (
              <div style={{ padding: 20, border: '1px dashed #ddd', borderRadius: 8 }}>Er is nog geen scorebord beschikbaar</div>
            ) : (
              <>
                <div className="table-header">
                  <span>Plaats</span>
                  <span>Naam</span>
                  <span>Score</span>
                </div>

                {items.map((p, i) => {
                  const idx = i + 1
                  let cls = 'row normal'
                  if (idx === 1) cls = 'row gold1'
                  else if (idx === 2) cls = 'row silver'
                  else if (idx === 3) cls = 'row gold3'
                  return (
                    <div key={p.playerNumber || i} className={cls}>
                      <span>{idx}</span>
                      <span>{p.name}</span>
                      <span className={idx > 3 ? 'badge' : ''}>{p.score ?? 0}</span>
                    </div>
                  )
                })}
              </>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
