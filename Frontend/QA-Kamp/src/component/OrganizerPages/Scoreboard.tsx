import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchLeaderboard, fetchPlayersForSession, fetchPlayersRawForSession } from '../../api'
import { useSession } from '../../context/SessionContext'
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

/* podium styles for top 3 */
.podium{
  display:grid;
  /* flexible columns: center pillar slightly larger for emphasis */
  grid-template-columns: 1fr 1fr 1fr;
  gap: 12px;
  align-items: end;
  margin: 20px 0;
}
.pillar{
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:flex-end;
  position:relative; /* needed so .pillar-number can be centered absolutely */
  padding:12px;
  border-radius:10px;
  background: linear-gradient(180deg, #ffffff 0%, #f7f7f7 100%);
  box-shadow: 0 4px 10px rgba(0,0,0,0.06);
}
.pillar-number{
  font-size:40px;
  font-weight:800;
  color:#444;
  position:absolute;
  left:50%;
  top:50%;
  transform:translate(-50%,-50%);
  z-index:2;
}
.pillar-name{
  margin-bottom:8px;
  font-weight:700;
  color:#111;
  text-align:center;
  padding:0 8px;
  font-size:40px;
}
.pillar-score{
  margin-top:6px;
  font-size:20px;
  font-weight:900;
  color:#fff;
  padding:6px 12px;
  border-radius:8px;
}
.pillar-wrapper{ display:flex; flex-direction:column; align-items:center; }
/* pillar 1: gold (prominent)
   pillar 2: darker gray
   pillar 3: darker bronze/amber */
.pillar-1{ height:500px; background: linear-gradient(180deg,#ffd700 0%, #ffed8f 100%); color:#111; width:75% }
.pillar-2{ height:400px; background: linear-gradient(180deg,#999999 0%, #eeeeee 100%); color:#fff; width:75% }
.pillar-3{ height:400px; background: linear-gradient(180deg,#b45f06 0%, #f9cb9c 100%); color:#fff; width:75% }
/* unified score badge styling for contrast on colored pillars */
.pillar .pillar-score{ background: rgba(0,0,0,0.6); color: #fff }

/* positioneer score en 'punten' hoger op de pilaar */
.pillar{ position: relative; }
.pillar .pillar-score{
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  bottom: 110px; /* schuif omhoog; pas waarde aan indien gewenst */
  margin-top: 0;
  z-index: 3;
}
.pillar .pillar-punten{
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  bottom: 78px; /* iets onder de score; pas aan */
  color: #000; /* changed to black as requested */
  font-weight: 900;
  font-size: 1.25rem; /* verhoogd lettertype */
  z-index: 3;
}
.pillar-1 .pillar-score { bottom: 140px; }
.pillar-1 .pillar-punten { bottom: 108px; }
.pillar-2 .pillar-score,
.pillar-3 .pillar-score { bottom: 96px; }
.pillar-2 .pillar-punten,
.pillar-3 .pillar-punten { bottom: 64px; }

@media (max-width: 640px) {
  .pillar .pillar-score { bottom: 48px; font-size: 1.05rem; }
  .pillar .pillar-punten { bottom: 18px; font-size: 1.05rem; }
  .pillar-1 .pillar-score { bottom: 68px; }
  .pillar-1 .pillar-punten { bottom: 38px; }
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

/* top 3 - fallback styles for older rendering */
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
  .podium{ grid-template-columns: 1fr 1fr 1fr; gap:8px }
  .pillar-1{ height:200px; width:90% }
  .pillar-2,.pillar-3{ height:160px; width:80% }
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
        const lbResp = await fetchLeaderboard(sid)
        if (!mounted) return
        const lb = (lbResp && lbResp.leaderboard) || []
        const leaderboardTyped = lb as LeaderboardItem[]
        const hasNonZero = leaderboardTyped.some((p) => (p.score ?? 0) > 0)
        if (hasNonZero) {
          setItems(leaderboardTyped)
        } else {
          try {
            const pResp = await fetchPlayersForSession(sid)
            if (!mounted) return
            const rawPlayers = (pResp && (pResp as { players?: unknown[] }).players) || []
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
    async function refreshFromPlayers() {
      try {
        const pResp = await fetchPlayersRawForSession(sid)
        const rawPlayers = (pResp && pResp.players) || []
        const mapped: LeaderboardItem[] = (rawPlayers as Record<string, unknown>[]).map((p) => {
          // preserve game-specific fields and legacy score
          const pzRaw = Object.prototype.hasOwnProperty.call(p, 'score_passwordzapper') ? p['score_passwordzapper'] : undefined
          const prRaw = Object.prototype.hasOwnProperty.call(p, 'score_printerslaatophol') ? p['score_printerslaatophol'] : undefined
          const legacyRaw = Object.prototype.hasOwnProperty.call(p, 'score') ? p['score'] : undefined
          const pz = typeof pzRaw === 'number' ? pzRaw : (typeof pzRaw === 'string' ? Number(pzRaw) : NaN)
          const pr = typeof prRaw === 'number' ? prRaw : (typeof prRaw === 'string' ? Number(prRaw) : NaN)
          const legacy = typeof legacyRaw === 'number' ? legacyRaw : (typeof legacyRaw === 'string' ? Number(legacyRaw) : NaN)
          let scoreVal: number | undefined = undefined
          const hasAny = !Number.isNaN(pz) || !Number.isNaN(pr) || !Number.isNaN(legacy)
          if (hasAny) {
            scoreVal = (Number.isNaN(pz) ? 0 : pz) + (Number.isNaN(pr) ? 0 : pr) + (Number.isNaN(legacy) ? 0 : legacy)
          }
          return {
            playerNumber: String(p['playerNumber'] ?? p['nummer'] ?? ''),
            name: String(p['name'] ?? p['naam'] ?? '').toLowerCase(),
            category: String(p['category'] ?? ''),
            score: typeof scoreVal === 'number' ? scoreVal : 0,
          }
        })
        mapped.sort((a, b) => {
          const sa = a.score ?? 0
          const sb = b.score ?? 0
          if (sa !== sb) return sb - sa
          return a.name.localeCompare(b.name)
        })
        if (mounted) setItems(mapped)
      } catch (err) {
        // ignore and let load() try
        void err
      }
    }
    load()

    const iv = setInterval(load, 10000)

    const applyOptimistic = (payload: { sessionId?: string; playerNumber?: string; score?: number } | null) => {
      try {
        if (!payload || !payload.playerNumber) return
        if (payload.sessionId && payload.sessionId !== sid) return
        const pn = String((payload.playerNumber || '').toString()).padStart(3, '0')
        const sc = typeof payload.score === 'number' ? payload.score : undefined
        if (typeof sc !== 'number') return
        setItems((prev) => {
          const copy = prev.slice()
          const idx = copy.findIndex((it) => String(it.playerNumber || '').padStart(3, '0') === pn)
          if (idx >= 0) {
            const existing = copy[idx]
            if ((existing.score ?? 0) !== sc) {
              copy[idx] = { ...existing, score: sc }
            }
            return copy
          }

          copy.push({ playerNumber: pn, name: `#${pn}`, score: sc })
          copy.sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || a.name.localeCompare(b.name))
          return copy
        })
      } catch {
        /* ignore */
      }
    }

    const onStorage = (ev: StorageEvent) => {
      try {
        if (!ev || !ev.key) return
        if (ev.key === 'pz_score_update' || ev.key === 'activeGameInfo') {
          if (ev.key === 'pz_score_update') {
            try {
              const parsed = ev.newValue ? JSON.parse(ev.newValue) : null
              applyOptimistic(parsed)
            } catch { /* ignore parse errors */ }
          }
          void refreshFromPlayers().catch(() => {})
          setTimeout(() => { void load().catch(() => {}) }, 0)
        }
      } catch {
        /* ignore */
      }
    }
    type PzScoreUpdateDetail = { sessionId?: string; playerNumber?: string; score?: number } | null

    const onCustom = (ev: Event) => {
      try {
        try {
          const ce = ev as CustomEvent<PzScoreUpdateDetail>
          const det = ce?.detail ?? null
          applyOptimistic(det)
        } catch { /* ignore */ }
        void refreshFromPlayers().catch(() => {})
        setTimeout(() => { void load().catch(() => {}) }, 0)
      } catch {
        /* ignore */
      }
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener('pz_score_update', onCustom)

    return () => { mounted = false; clearInterval(iv); window.removeEventListener('storage', onStorage); window.removeEventListener('pz_score_update', onCustom) }
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
                {/* Podium for top 3 */}
                <div className="podium" aria-hidden={items.length === 0}>
                  {/** left: #2 */}
                  {(() => {
                    const p = items[1]
                    return (
                      <div className="pillar-wrapper">
                        <div className="pillar-name">{p ? p.name : '—'}</div>
                        <div className={`pillar pillar-2`}>
                          <div className="pillar-number">#2</div>
                          <div className="pillar-score">{p ? p.score ?? 0 : '—'}</div>
                          <div className="pillar-punten">punten</div>
                        </div>
                      </div>
                    )
                  })()}

                  {/** center: #1 */}
                  {(() => {
                    const p = items[0]
                    return (
                      <div className="pillar-wrapper">
                        <div className="pillar-name">{p ? p.name : '—'}</div>
                        <div className={`pillar pillar-1`}>
                          <div className="pillar-number">#1</div>
                          <div className="pillar-score">{p ? p.score ?? 0 : '—'}</div>
                          <div className="pillar-punten">punten</div>
                        </div>
                      </div>
                    )
                  })()}

                  {/** right: #3 */}
                  {(() => {
                    const p = items[2]
                    return (
                      <div className="pillar-wrapper">
                        <div className="pillar-name">{p ? p.name : '—'}</div>
                        <div className={`pillar pillar-3`}>
                          <div className="pillar-number">#3</div>
                          <div className="pillar-score">{p ? p.score ?? 0 : '—'}</div>
                          <div className="pillar-punten">punten</div>
                        </div>
                      </div>
                    )
                  })()}
                </div>

                {/* Remaining ranks (4+) shown as list with header */}
                {items.length > 3 && (
                  <>
                    <div className="table-header">
                      <span>Plaats</span>
                      <span>Naam</span>
                      <span>Score</span>
                    </div>
                    {items.slice(3).map((p, i) => {
                      const idx = i + 4
                      const cls = 'row normal'
                      return (
                        <div key={(p && p.playerNumber) || idx} className={cls}>
                          <span>{idx}</span>
                          <span>{p.name}</span>
                          <span className="badge">{p.score ?? 0}</span>
                        </div>
                      )
                    })}
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
