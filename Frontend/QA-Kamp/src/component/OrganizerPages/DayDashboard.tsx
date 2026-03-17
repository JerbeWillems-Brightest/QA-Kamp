import { useEffect } from 'react'
import { useParams, Link, useLocation } from 'react-router-dom'
import Navbar from '../Navbar'
import { useSession } from '../../context/SessionContext'
import { fetchPlayersForSession, fetchLeaderboard } from '../../api'
import { useState } from 'react'
// import images so the bundler (Vite) resolves their URLs
import KRAAK_IMG from '../../assets/KraakHetWachtwoord.png'
import PASS_IMG from '../../assets/PasswordZapper.png'
import BUG_IMG from '../../assets/BugCleanup.png'
import GETAL_IMG from '../../assets/GetalRace.png'
import REACTIE_IMG from '../../assets/ReactieTijdTest.png'
import WHACK_IMG from '../../assets/WhackTheBug.png'
import PRINTER_SLAAT_IMG from '../../assets/PrinterSlaatOpHol.png'
import PRINTER_KRAKEN_IMG from '../../assets/PrinterKraken.png'
import HERSTART_IMG from '../../assets/HerstartDePc.png'
import THERMOSTAAT_IMG from '../../assets/SlimmeThermostaat.png'
import FIGHT_IMG from '../../assets/FightTheBug.png'

// embedded CSS so the component is self-contained
const embeddedCss = `
:root{
  --yellow:#f2c200;
  --yellow-dark:#d9a800;
  --accent:#166534;
  --muted:#f6f6f6;
  --border:#f3e0a0;
}

.day-dashboard {
  font-family: Arial, Helvetica, sans-serif;
  color: #222;
}

.dashboard-inner{
  max-width:1100px;
  margin: 0 auto;
  padding: 28px 20px 80px;
}

.back-btn{
  display:inline-block;
  background:transparent;
  border:none;
  color:#000;
  font-size:14px;
  margin-bottom:12px;
  cursor:pointer;
}

.header-left{
  display:flex;
  flex-direction:column;
  align-items:flex-start;
  gap:6px;
  margin-bottom:24px;
  width:100%;
}

.page-header{
  width:100%;
  box-sizing:border-box;
  background: transparent;
}

.container{
  /* align header under navbar logo (navbar has 16px left padding) */
  max-width: none;
  margin-left: 16px;
  margin-top: 12px;
  margin-bottom: 12px;
  box-sizing: border-box;
}

.back-wrap{ display:block; }

.back{
  text-decoration:none;
  color:#555; /* match Scoreboard */
  font-size:14px;
  display:inline-flex;
  align-items:center; /* vertically center icon and text */
  gap:8px;
}

.back svg{
  display:block; /* remove baseline alignment issues */
  width:16px;
  height:16px;
  transform: translateY(1px); /* tiny nudge to match scoreboard vertical alignment */
}

.back span{ display:inline-block; line-height:1 }

.dashboard-title{
  display:block;
  margin-top:10px; /* match scoreboard */
  margin-bottom:0;
  font-size:48px;
  font-weight:800;
}

/* layout: games + players side-by-side */
.top-grid{
  display:grid;
  grid-template-columns: 1fr 570px; /* give players panel a bit more width so name column fits */
  gap: 28px;
  align-items:start;
}

.games-section h1, .players-panel h1, .scoreboard-section h1{ font-size:30px; margin:0 0 12px; text-align: left; }

.games-row{
  display:flex;
  gap:20px;
  align-items:center;
  flex-wrap:wrap;
  min-height: 260px; /* ensure same visual height as players panel */
}

.game-card{
  width:220px;
  height:220px;
  border-radius:20px;
  overflow:hidden;
  background: linear-gradient(180deg, #fff 0%, #fafafa 100%);
  box-shadow: 0 8px 20px rgba(0,0,0,0.06);
  border: 1px solid rgba(0,0,0,0.04);
  display:flex;
  flex-direction:column;
  justify-content:flex-end;
  padding:0;
  cursor:pointer;
}

/* show the game images like the day tiles: use cover/center and specific assets per button */
.game-card .game-img{
  /* ensure the image container has size and covers the card */
  flex: 1 1 auto;
  background-size: cover;
  background-position: center;
  height: 150px;
  /* default image for all game buttons (same pngs allowed per user) */
  background-image: url('/src/assets/KraakHetWachtwoord.png');
  background-repeat: no-repeat;
}

/* image element fallback / reliable rendering */
.game-img-element{
  width:100%;
  height:185px;
  object-fit:cover;
  display:block;
}

/* allow explicit per-button image selection via data-img attribute */
.game-card[data-img="kraak"] .game-img {
  background-image: url('/src/assets/KraakHetWachtwoord.png');
  background-repeat: no-repeat;
}
.game-card[data-img="password"] .game-img {
  background-image: url('/src/assets/PasswordZapper.png');
  background-repeat: no-repeat;
}

/* specific images for each game button using assets in src/assets */
.game-card[aria-label="Game1Btn"] .game-img {
  background-image: url('/src/assets/KraakHetWachtwoord.png');
  background-repeat: no-repeat;
}
.game-card[aria-label="Game2Btn"] .game-img {
  background-image: url('/src/assets/PasswordZapper.png');
  background-repeat: no-repeat;
}

.game-card .game-title{
  background:var(--yellow);
  color:#fff;
  text-align:center;
  padding:10px 12px;
  font-weight:700;
  border-bottom-left-radius:20px;
  border-bottom-right-radius:20px;
}

.players-panel{
  background:transparent;
}

.players-box{
  border:2px solid var(--yellow);
  border-radius:10px;
  padding:8px; /* tightened so more rows fit */
  background:white;
  max-height: 260px;
  overflow-y: auto;
  overflow-x: hidden; /* prevent horizontal scroll and rows escaping the box */
}

.players-table{
  width:100%;
  border-collapse:collapse;
  font-size:13px;
  box-sizing: border-box;
}

/* make header row align with the grid columns */
.players-table thead{ display:block; padding:6px 8px }
.players-table thead tr{ display:grid; grid-template-columns: 110px minmax(150px,1fr) 120px 80px; gap:8px; align-items:center }
.players-table thead th{ text-align:left; font-weight:700; color:#666; padding:4px 6px; font-size:12px }

/* allow tbody to scroll inside .players-box and have spaced rows */
.players-table tbody{ display:block }
.players-table tbody tr{
  display:grid;
  grid-template-columns: 110px minmax(150px,1fr) 155px 80px; /* match thead */
  gap:8px;
  align-items:center;
  padding:6px; /* tighter row padding to fit more rows */
  border:2px solid var(--yellow);
  border-radius:8px;
  background:#fff;
  margin-bottom:6px; /* closer rows */
  box-sizing: border-box;
  width:100%;
  max-width:100%;
  overflow: hidden; /* ensure content doesn't escape the rounded row */
}
.players-table tbody tr td{ padding:4px 6px; background:transparent; border:none; text-align:left; font-size:13px }

/* allow the name column (2nd column) to wrap so long names are fully visible */
.players-table tbody tr td:nth-child(2) { white-space: normal; overflow-wrap: anywhere }

/* age column centered, status column right-aligned */
.players-table thead th:nth-child(3), .players-table tbody tr td:nth-child(3) { text-align: center }
.players-table thead th:nth-child(4), .players-table tbody tr td:nth-child(4) { text-align: left }

/* right-align the content inside the status cell using flex so badge never overflows */
.players-table tbody tr td:nth-child(4) { display: flex; justify-content: flex-end; align-items: center; min-width: 0 }

/* badges */
.age-badge{
  min-width:72px;
  display:inline-block;
  text-align:center;
  background:var(--yellow);
  color:#fff;
  padding:6px 8px;
  border-radius:12px;
  font-weight:700;
  font-size:12px;
}

.status{
  min-width:72px;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  text-align:center;
  padding:6px 8px;
  border-radius:12px;
  color:#fff;
  font-weight:700;
  font-size:12px;
}
.status.online{ background:#22c55e }
.status.offline{ background:#ef4444 }

/* scoreboard */
.scoreboard-section{ margin-top:28px }
.scoreboard-wrap{ margin-top:12px }

.scoreboard-list{ list-style:none; padding:0; margin:0; }
.score-row{
  display:grid;
  grid-template-columns: 60px 1fr 120px;
  gap:12px;
  align-items:center;
  padding:8px 12px;
  border-radius:14px;
  border:2px solid var(--border);
  margin-bottom:10px;
  background:white;
}

.score-row .place{ font-weight:700; color:#444 }
.score-row .name{ color:#666; font-size:13px }
.score-row .score{ justify-self:center; background:var(--yellow); color:#fff; padding:6px 12px; border-radius:12px; font-weight:700 }

/* highlight top 3 */
.rank-1{ background: linear-gradient(90deg, var(--yellow-dark), var(--yellow)); color:white }
.rank-2{ background:linear-gradient(90deg,#bfbfbf,#d0d0d0); color:white }
.rank-3{ background:linear-gradient(90deg,#f5b041,#f7c57a); color:white }

/* responsive */
@media (max-width:960px){
  .top-grid{ grid-template-columns: 1fr; }
  .game-card{ width:160px; height:140px }
  .score-row{ grid-template-columns: 40px 1fr 80px }
}

/* small tweaks */
.loading, .no-score, .no-players{ color:#666 }
`

if (typeof document !== 'undefined' && !document.getElementById('daydashboard-styles')) {
  document.head.insertAdjacentHTML('beforeend', `<style id="daydashboard-styles">${embeddedCss}</style>`)
}

type Player = {
  playerNumber: string
  name: string
  score?: number
  category?: string
  status?: string
}

type LeaderboardItem = {
  playerNumber: string
  name: string
  score?: number
}

export default function DayDashboard(){
  const { day } = useParams<{ day: string }>()
  const loc = useLocation()
  const { currentSession } = useSession()
  // sessionId logic unchanged
  const sessionId = currentSession?.id ?? (() => { try { return localStorage.getItem('currentSessionId') } catch { return null } })()
  const [players, setPlayers] = useState<Player[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([])
  const [loading, setLoading] = useState(false)

  // If useParams didn't provide a day (tests often render without a Route), try to derive it from the pathname
  const inferredDay = (() => {
    if (day && String(day).trim()) return String(day)
    try {
      // Prefer router location (works with MemoryRouter in tests)
      const p = loc?.pathname ?? (typeof window !== 'undefined' ? window.location.pathname : '')
      // Expecting path like /day/maandag or /day/maandag/...
      const m = p.match(/\/day\/(\w+)/i)
      if (m && m[1]) return m[1]
    } catch {
      // ignore
    }
    return ''
  })()

  // compute the display label for the day using explicit mapping
  const dayLabel = (() => {
    const theDay = (inferredDay || day || '').toString()
    if (!theDay) return 'Dag dashboard'
    const key = theDay.toLowerCase()
    switch (key) {
      case 'maandag':
        return 'Maandag - Security'
      case 'dinsdag':
        return 'Dinsdag - Performance'
      case 'woensdag':
        return 'Woensdag - Aandacht voor detail'
      case 'donderdag':
        return 'Donderdag - Logisch redeneren'
      case 'vrijdag':
        return 'Vrijdag - Fight the bug'
      default:
        return `${theDay.charAt(0).toUpperCase() + theDay.slice(1)} - Security`
    }
  })()

  // mapping of games per day (labels only). Images remain the same for all buttons.
  const gamesByDay: Record<string, string[]> = {
    maandag: ['Kraak het wachtwoord', 'Password zapper'],
    dinsdag: ['Bug Cleanup', 'Getalrace', 'Reactietijd test', 'Whack the bug'],
    woensdag: ['Printer slaat op hol', 'Printer kraken'],
    donderdag: ['Herstart de pc', '(Niet zo) slimme thermostaat'],
    vrijdag: ['Fight the bug'],
  }

  const currentDayKey = (inferredDay || day || '').toString().toLowerCase()
  const gamesForDay = gamesByDay[currentDayKey] ?? gamesByDay['maandag']

  useEffect(() => {
    // only run effect when we have a session id
    if (!sessionId) {
      return
    }
    let mounted = true
    ;(async () => {
      setLoading(true)
      try {
        const lb = await fetchLeaderboard(sessionId)
        if (!mounted) return
        const lbResp = (lb as { leaderboard?: unknown } | null) ?? null
        const raw = Array.isArray(lbResp?.leaderboard) ? lbResp!.leaderboard as unknown[] : []
        // normalize entries
        const parsed: LeaderboardItem[] = raw.map((it) => {
          const obj = (it ?? {}) as Record<string, unknown>
          const playerNumber = typeof obj.playerNumber === 'string' ? obj.playerNumber : (typeof obj.nummer === 'string' ? obj.nummer : '')
          const name = typeof obj.name === 'string' ? obj.name : (typeof obj.naam === 'string' ? obj.naam : '')
          const scoreVal = obj.score ?? obj.points ?? obj.punten
          const score = typeof scoreVal === 'number' ? scoreVal : Number(scoreVal ?? 0) || 0
          // keep original casing for display but sorting will use lowercase
          return { playerNumber: String(playerNumber), name: String(name), score }
        })

        // Sort: primary by score desc, secondary by name asc (case-insensitive)
        parsed.sort((a, b) => {
          const scoreA = typeof a.score === 'number' ? a.score : 0
          const scoreB = typeof b.score === 'number' ? b.score : 0
          if (scoreB !== scoreA) return scoreB - scoreA
          // names may have mixed casing; compare case-insensitive
          const nameA = (a.name ?? '').toString().toLowerCase()
          const nameB = (b.name ?? '').toString().toLowerCase()
          return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' })
        })

        setLeaderboard(parsed)
      } catch (err) {
        console.warn('Failed to fetch leaderboard', err)
        // continue to try fetching players
      }
      try {
        const p = await fetchPlayersForSession(sessionId)
        if (!mounted) return
        const pResp = (p as { players?: unknown } | null) ?? null
        const rawPlayers = Array.isArray(pResp?.players) ? pResp!.players as unknown[] : []
        const parsedPlayers: Player[] = rawPlayers.map((it) => {
           const obj = (it ?? {}) as Record<string, unknown>
           const playerNumber = typeof obj.playerNumber === 'string' ? obj.playerNumber : (typeof obj.nummer === 'string' ? obj.nummer : '')
           const playerNumberStr = String(playerNumber ?? '').trim()
           const name = typeof obj.name === 'string' ? obj.name : (typeof obj.naam === 'string' ? obj.naam : '')
           const scoreVal = obj.score ?? obj.points ?? obj.punten
           const score = typeof scoreVal === 'number' ? scoreVal : Number(scoreVal ?? 0) || 0
          // try several possible fields for the age/category column coming from different backends
          const category = (typeof obj.category === 'string' && obj.category.trim()) ? obj.category
            : (typeof obj.ageCategory === 'string' && obj.ageCategory.trim()) ? obj.ageCategory
            : (typeof obj.leeftijdscategorie === 'string' && obj.leeftijdscategorie.trim()) ? obj.leeftijdscategorie
            : (typeof obj.leeftijd === 'string' && obj.leeftijd.trim()) ? obj.leeftijd
            : (typeof obj.categorie === 'string' && obj.categorie.trim()) ? obj.categorie
            : '-'

          // status detection: boolean flags or string values
          const rawStatus = obj.status ?? obj.online ?? obj.isOnline ?? obj.actief
          // Priority rules:
          // - If the player has NOT entered a playerNumber => Offline
          // - Otherwise, if a boolean/string status exists, use it
          // - If no explicit status but playerNumber exists => Online
          let status: string
          if (!playerNumberStr) {
            status = 'Offline'
          } else if (typeof rawStatus === 'boolean') {
            status = rawStatus ? 'Online' : 'Offline'
          } else if (typeof rawStatus === 'string') {
            status = /off/i.test(rawStatus) ? 'Offline' : 'Online'
          } else {
            status = 'Offline'
          }

          return { playerNumber: playerNumberStr, name: String(name), score, category, status }
        })
        setPlayers(parsedPlayers)
      } catch {
        console.warn('Failed to fetch players')
      }
      setLoading(false)
    })()
    return () => { mounted = false }
  }, [sessionId])

  return (
    <main className="day-dashboard">
      <Navbar />
      <div className="page-header">
        <div className="container">
          <div className="header-left">
            <div className="back-wrap">
              <Link id="BackBtn" to="/day-overview" className="back" aria-label="Terug naar kalender">
                <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <span>Terug</span>
              </Link>
            </div>
            <h1 className="dashboard-title">{dayLabel}</h1>
          </div>
        </div>
      </div>
      <div className="dashboard-inner">
        {!sessionId ? (
          <div className="no-session">Geen actieve sessie gevonden</div>
        ) : (
        <>
        <div className="top-grid">
          <section className="games-section">
            <h1>Games</h1>
            <div className="games-row">
              {gamesForDay.map((label, idx) => (
                // mark the specific image for monday's 'Kraak het wachtwoord'
                (() => {
                  const imgKey = label === 'Kraak het wachtwoord' ? 'kraak' : (label === 'Password zapper' ? 'password' : undefined)
                  // pick inline image src using a normalized label mapping (case-insensitive)
                  const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')
                  const key = normalize(label)
                  let inlineSrc: string | undefined
                  switch (key) {
                    case 'kraakhetwachtwoord': inlineSrc = KRAAK_IMG; break
                    case 'passwordzapper': inlineSrc = PASS_IMG; break
                    case 'bugcleanup': inlineSrc = BUG_IMG; break
                    case 'getalrace': inlineSrc = GETAL_IMG; break
                    case 'reactietijdtest':
                    case 'reactietijd': inlineSrc = REACTIE_IMG; break
                    case 'whackthebug': inlineSrc = WHACK_IMG; break
                    case 'printerslaatophol': inlineSrc = PRINTER_SLAAT_IMG; break
                    case 'printerkraken': inlineSrc = PRINTER_KRAKEN_IMG; break
                    case 'herstartdepc': inlineSrc = HERSTART_IMG; break
                    case 'nietzoslimmethermostaat':
                    case 'slimmethermostaat': inlineSrc = THERMOSTAAT_IMG; break
                    case 'fightthebug': inlineSrc = FIGHT_IMG; break
                    default: inlineSrc = undefined
                  }
                  const style = inlineSrc ? { backgroundImage: `url(${inlineSrc})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined
                  return (
                    <button key={idx} className="game-card" aria-label={`GameBtn-${idx+1}`} data-img={imgKey}>
                      {inlineSrc ? (
                        <img className="game-img-element" src={inlineSrc} alt={label} />
                      ) : (
                        <div className="game-img" style={style} />
                      )}
                       <div className="game-title">{label}</div>
                     </button>
                   )
                  })()
                 ))}
            </div>
          </section>

          <aside className="players-panel">
            <h1>Spelers</h1>
            {players.length === 0 ? <div className="no-players">Geen spelers</div> : (
              // increase players-box height on dinsdag because the games take more vertical space
              <div className="players-box" style={{ maxHeight: currentDayKey === 'dinsdag' ? '460px' : undefined }}>
                 <table className="players-table">
                   <thead>
                     <tr><th>Spelersnummer</th><th>Naam</th><th>Leeftijdscategorie</th><th>Status</th></tr>
                   </thead>
                   <tbody>
                     {players.map((p, idx) => (
                       <tr key={p.playerNumber || `no-${idx}-${p.name}`}>
                         <td>{p.playerNumber || '-'}</td>
                         <td>{p.name}</td>
                         <td><span className="age-badge">{p.category ?? '-'}</span></td>
                         <td><span className={`status ${p.status?.toLowerCase()==='online' ? 'online' : 'offline'}`}>{p.status}</span></td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             )}
           </aside>
        </div>

        <section className="scoreboard-section">
          <h1>Scorebord van vandaag</h1>
          {loading ? <div className="loading">Laden...</div> : (
            <div className="scoreboard-wrap">
              {leaderboard.length === 0 ? <div className="no-score">Er is nog geen scorebord beschikbaar</div> : (
                <ol className="scoreboard-list">
                  {leaderboard.map((p, i) => (
                    <li key={p.playerNumber || i} className={`score-row rank-${i+1}`}>
                      <span className="place">{i+1}</span>
                      <span className="name">{p.name}</span>
                      <span className="score">{p.score ?? 0}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}
        </section>
        </>
        )}
      </div>
    </main>
  )
}
