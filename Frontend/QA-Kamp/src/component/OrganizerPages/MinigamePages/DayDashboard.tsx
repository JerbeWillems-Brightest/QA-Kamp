import { useEffect } from 'react'
import { useParams, Link, useLocation } from 'react-router-dom'
import Navbar from '../../Navbar.tsx'
import { useSession } from '../../../context/SessionContext.tsx'
import { fetchPlayersForSession, fetchLeaderboard } from '../../../api'
import { useState } from 'react'
// import images so the bundler (Vite) resolves their URLs
import KRAAK_IMG from '../../../assets/KraakHetWachtwoord.png'
import PASS_IMG from '../../../assets/PasswordZapper.png'
import BUG_IMG from '../../../assets/BugCleanup.png'
import GETAL_IMG from '../../../assets/GetalRace.png'
import REACTIE_IMG from '../../../assets/ReactieTijdTest.png'
import WHACK_IMG from '../../../assets/WhackTheBug.png'
import PRINTER_SLAAT_IMG from '../../../assets/PrinterSlaatOpHol.png'
import PRINTER_KRAKEN_IMG from '../../../assets/PrinterKraken.png'
import HERSTART_IMG from '../../../assets/HerstartDePc.png'
import THERMOSTAAT_IMG from '../../../assets/SlimmeThermostaat.png'
import FIGHT_IMG from '../../../assets/FightTheBug.png'
import MinigamePopup from './MinigamePopup'

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

function DayDashboard(){
  const { day } = useParams<{ day: string }>()
  const loc = useLocation()
  const { currentSession } = useSession()
  // sessionId logic unchanged
  const sessionId = currentSession?.id ?? (() => { try { return localStorage.getItem('currentSessionId') } catch { return null } })()
  const [players, setPlayers] = useState<Player[]>([])
  // track which playerNumbers are currently online (synchronized via localStorage)
  const [onlinePlayers, setOnlinePlayers] = useState<string[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([])
  const [loading, setLoading] = useState(false)

  // popup state
  const [selectedGame, setSelectedGame] = useState<string | null>(null)
  const [selectedAges, setSelectedAges] = useState<string[]>([])
  // global running state for the day dashboard: which game is active
  const [isGameRunning, setIsGameRunning] = useState(false)
  const [activeGame, setActiveGame] = useState<string | null>(null)

  // helper to read onlinePlayers from localStorage safely
  function readOnlinePlayersFromStorage(): string[] {
    try {
      const raw = localStorage.getItem('onlinePlayers')
      if (!raw) return []
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed.map((v) => String(v).padStart(3,'0'))
      // back-compat: comma-separated
      if (raw.includes(',')) return raw.split(',').map(s => s.trim()).filter(Boolean).map(s => String(s).padStart(3,'0'))
      return []
    } catch {
      return []
    }
  }

  // initialize and subscribe to localStorage changes for onlinePlayers
  useEffect(() => {
    // initial read
    setOnlinePlayers(readOnlinePlayersFromStorage())
    // storage event listener to sync across tabs
    const onStorage = (ev: StorageEvent) => {
      if (ev.key === 'onlinePlayers') {
        setOnlinePlayers(readOnlinePlayersFromStorage())
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  // initialize running state from localStorage so it persists across navigation/tabs
  useEffect(() => {
    try {
      const raw = localStorage.getItem('activeGameInfo')
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed && parsed.game) {
          // defer state update to avoid calling setState synchronously in effect
          setTimeout(() => {
            setIsGameRunning(true)
            setActiveGame(parsed.game)
          }, 0)
        }
      }
    } catch { /* ignore */ }

    const onStorage = (ev: StorageEvent) => {
      if (ev.key === 'activeGameInfo') {
        if (ev.newValue) {
          try {
            const parsed = JSON.parse(ev.newValue)
            // defer to avoid synchronous state update within storage event handler
            setTimeout(() => {
              setIsGameRunning(true)
              setActiveGame(parsed.game)
            }, 0)
          } catch { setIsGameRunning(true) }
        } else {
          setIsGameRunning(false)
          setActiveGame(null)
        }
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const gameDetails: Record<string, { title: string; rules: string; ages?: string[]; ageDescriptions?: Record<string,string> }> = {
    'kraakhetwachtwoord': { title: 'Kraak het wachtwoord', rules: 'Ontcijfer het wachtwoord binnen de tijd. Punten worden gegeven per juist antwoord.', ages: ['8-10','11-13','14-16'], ageDescriptions: {
      '8-10': 'Je krijgt een computer die niet meer werkt na een vreemde USB-stick. Zoek hints in de kamer en raad het wachtwoord. Leer hoe je sterke wachtwoorden maakt en hackers slim af bent!',
      '11-13': 'Een computer is geblokkeerd na een verdachte USB-stick. Gebruik slimme hints (zoals foto’s en info) om het wachtwoord te achterhalen. Ontdek hoe makkelijk zwakke wachtwoorden te kraken zijn en hoe je ze beter maakt.',
      '14-16': 'Een computer raakt besmet na het gebruik van een onbekende USB-stick. Analyseer de omgeving en gebruik indirecte hints om het wachtwoord te achterhalen. Leer waarom voorspelbare wachtwoorden onveilig zijn en hoe je ze sterker maakt.'
    }},
    'passwordzapper': { title: 'Password Zapper', rules: 'Verwijder de kwetsbare wachtwoorden door correcte keuzes te maken.', ages: ['8-10','11-13','14-16'], ageDescriptions: {
      '8-10': 'Vlieg met je ruimteschip en schiet slechte wachtwoorden kapot. Laat de goede wachtwoorden met rust. Leer spelenderwijs wat een sterk wachtwoord is!',
      '11-13': 'Bestuur je schip en zap zwakke wachtwoorden met duidelijke patronen. Let goed op, want sommige lijken sterk maar zijn dat niet. Ontdek hoe je betere wachtwoorden herkent!',
      '14-16': 'Zweef door de ruimte en analyseer complexe wachtwoorden voordat je ze zapt. Vermijd fouten en denk na over veiligheid en patronen. Leer hoe hackers zwakke wachtwoorden kunnen kraken.'
    }},
     'bugcleanup': { title: 'Bug Cleanup', rules: 'Verwijder bugs uit de code. Hoe sneller, hoe meer punten.', ages: ['8-10','11-13','14-16'], ageDescriptions: {
             '8-10': 'Klik de bugs weg en maak je computer weer snel. Hoe meer je er weghaalt, hoe beter alles werkt. Werk rustig en precies!',
             '11-13': 'Verwijder bugs terwijl je muis traag reageert. Hoe beter je mikt, hoe sneller je systeem wordt. Let op snelheid én controle!',
             '14-16': 'Ruim zoveel mogelijk bugs op in een traag systeem. Kleine en bewegende bugs maken het moeilijker. Optimaliseer je prestaties door efficiënt te werken.'
         }},
     'getalrace': { title: 'Getalrace', rules: 'Zoek het juiste getal. Sneller is beter.', ages: ['8-10','11-13','14-16'], ageDescriptions: {
             '8-10': 'Zoek de getallen in de juiste volgorde zo snel mogelijk. Klik ze één voor één aan. Hoe sneller, hoe beter!',
             '11-13': 'Klik de juiste cijfers in volgorde onder tijdsdruk. Fouten kosten je tijd. Blijf gefocust!',
             '14-16': 'Werk door een chaotisch raster en vind alle getallen in volgorde. Snelheid en nauwkeurigheid zijn cruciaal. Hoe laag is jouw tijd?'
         }},
     'reactietijdtest': { title: 'Reactietijd Test', rules: 'Klik zo snel mogelijk wanneer het signaal verschijnt.', ages: ['8-10','11-13','14-16'], ageDescriptions: {
             '8-10': 'Klik zo snel mogelijk wanneer je het signaal ziet. Test hoe snel jij reageert. Kan jij supersnel zijn?',
             '11-13': 'Reageer zo snel mogelijk op onverwachte signalen. Vergelijk jouw score met anderen. Hoe scherp zijn jouw reflexen?',
             '14-16': 'Meet je reactietijd tot op milliseconden. Snelle beslissingen maken het verschil. Analyseer hoe jij scoort tegenover de norm.'
         }},
     'whackthebug': { title: 'Whack the bug', rules: 'Sla de bugs die opduiken met de grootste nauwkeurigheid.', ages: ['8-10','11-13','14-16'], ageDescriptions: {
             '8-10': 'Sla op de bugs die verschijnen. Wees snel en raak zoveel mogelijk! Pas op dat je niets verkeerd raakt.',
             '11-13': 'Klik snel op bugs die willekeurig opduiken. Soms verschijnen er foute targets. Blijf scherp!',
             '14-16': 'Hoge snelheid en misleidende targets maken dit uitdagend. Sla alleen de echte bugs. Precisie is key.'
         }},
     'printerslaatophol': { title: 'Printer Slaat Op Hol', rules: 'Los de printopdracht puzzels op zodat de printer stopt.', ages: ['8-10','11-13','14-16'], ageDescriptions: {
             '8-10': 'Zoek wat niet past op het papier. Klik de foutjes aan. Help de printer stoppen!',
             '11-13': 'Vind subtiele verschillen in de prints. Kijk goed naar details. Elke fout telt!',
             '14-16': 'Analyseer complexe patronen en vind afwijkingen. Details maken het verschil. Denk logisch en snel.'
         }},
     'printerkraken': { title: 'Printer Kraken', rules: 'Vind de juiste sequentie om de printer te herstellen.', ages: ['8-10','11-13','14-16'], ageDescriptions: {
             '8-10': 'Tel de juiste dingen en maak de code. Voer de code in om de printer te openen. Goed kijken is belangrijk!',
             '11-13': 'Zoek en tel objecten in de ruimte. Gebruik de juiste aantallen als code. Let op verborgen details!',
             '14-16': 'Analyseer de ruimte en vermijd afleidingen. Combineer aantallen tot de juiste code. Nauwkeurigheid is cruciaal.'
         }},
     'herstartdepc': { title: 'Herstart de PC', rules: 'Herstart en herstel de systemen in de juiste volgorde.', ages: ['8-10','11-13','14-16'], ageDescriptions: {
             '8-10': 'Zoek wat er mis is met de computer. Los het stap voor stap op. Dan werkt hij weer!',
             '11-13': 'Herstel de pc door de juiste acties te kiezen. Denk logisch na over het probleem. Elke stap telt!',
             '14-16': 'Analyseer meerdere problemen en los ze in de juiste volgorde op. Vermijd foute keuzes. Denk als een echte IT’er.'
         }},
     'slimmethermostaat': { title: '(Niet zo) Slimme Thermostaat', rules: 'Kalibreer de slimme thermostaat zonder de instellingen te breken.', ages: ['8-10','11-13','14-16'], ageDescriptions: {
             '8-10': 'Zet de juiste dingen bij elkaar zodat alles werkt. Gebruik simpele plaatjes. Maak de thermostaat slim!',
             '11-13': 'Bouw logische regels met blokken. Test of alles correct werkt. Denk goed na!',
             '14-16': 'Debug en verbeter foutieve logica. Werk met regels en voorwaarden. Begrijp hoe systemen beslissingen nemen.'
         }},
     'fightthebug': { title: 'Fight the bug', rules: 'Versla de grote bug door de juiste acties te kiezen.', ages: ['8-10','11-13','14-16'], ageDescriptions: {
             '8-10': 'Versla de grote bug door juiste keuzes te maken. Kies het juiste antwoord. Red de dag!',
             '11-13': 'Beantwoord vragen en voer acties uit om de bug te verslaan. Fouten kosten je punten. Blijf scherp!',
             '14-16': 'Ga de strijd aan met complexe vragen en scenario’s. Denk snel en correct. Gebruik alles wat je geleerd hebt!'
         }},
   }

  function normalizeKey(s: string){ return s.toLowerCase().replace(/\s+/g,'').replace(/[^a-z0-9]/g,'') }
  function openGameModal(label: string){
    // if another game is running and it's not this one, prevent opening
    if (isGameRunning && activeGame && activeGame !== label) {
      // silently ignore clicks or optionally show an alert
      window.alert(`Kan ${label} niet openen — ${activeGame} is momenteel actief.`)
      return
    }
    setSelectedGame(label); setSelectedAges([])
  }
  function closeModal(){ setSelectedGame(null); setSelectedAges([]) }
  // when the popup selects an age, sync it here as a single-selection
  function handleSelectAgeFromPopup(a: string){ setSelectedAges([a]) }
  async function startGame(){
    if (!selectedGame) return
    setIsGameRunning(true)
    setActiveGame(selectedGame)
    // show alert with game name
    try { window.alert(`${selectedGame} is gestart`) } catch { /* ignore if alert unavailable */ }
    // keep the popup open so the organizer can stop the game from the popup
    console.log('Starting', selectedGame, selectedAges)
    // persist running game so other pages know a game is active
    try {
      // derive day key from the current path (e.g. /day/maandag)
      const p = typeof window !== 'undefined' ? window.location.pathname : ''
      const m = p.match(/\/day\/(\w+)/i)
      const dayKeyForPersist = m && m[1] ? m[1].toLowerCase() : ''
      const info = { game: selectedGame, day: dayKeyForPersist }
      localStorage.setItem('activeGameInfo', JSON.stringify(info))
      // dispatch custom event for same-tab listeners
      try { window.dispatchEvent(new CustomEvent('activeGameInfoChanged', { detail: info })) } catch (err) { void err }
      // also persist to server so remote clients can poll
      try {
        const sid = localStorage.getItem('currentSessionId')
        if (sid) {
          // import API lazily to avoid circular imports
          const api = await import('../../../api')
          try { await api.setActiveGameInfo(sid, info) } catch (err) { console.warn('Failed to set activeGameInfo on server', err) }
        }
      } catch (err) { console.warn('Failed to notify server of activeGameInfo', err) }
    } catch (e) { console.warn('Failed to persist activeGameInfo', e) }
  }
  async function stopGame(){
    if (!selectedGame) return
    setIsGameRunning(false)
    // capture name before clearing
    const name = selectedGame
    setActiveGame(null)
    try { window.alert(`${name} is gestopt`) } catch { /* ignore */ }
    console.log('Stopping', name)
    // close the modal after stopping
    closeModal()
    // Clear localStorage + notify same-tab and other tabs
    try {
      try { localStorage.removeItem('activeGameInfo') } catch (e) { console.warn('Failed to remove activeGameInfo', e) }
      // same-tab listeners: dispatch custom event with null detail so onCustom handler treats it as cleared
      try { window.dispatchEvent(new CustomEvent('activeGameInfoChanged', { detail: null })) } catch (err) { void err }
      // cross-tab listeners: dispatch a storage event so other tabs will receive newValue === null
      try { window.dispatchEvent(new StorageEvent('storage', { key: 'activeGameInfo', newValue: null })) } catch (err) { void err }
    } catch (e) { console.warn('Failed to notify clients of stop', e) }

    // Also clear server-side persisted activeGameInfo so remote devices polling the server know it's cleared
    try {
      const sid = localStorage.getItem('currentSessionId')
      if (sid) {
        const api = await import('../../../api')
        try { await api.setActiveGameInfo(sid, null) } catch (err) { console.warn('Failed to clear activeGameInfo on server', err) }
      }
    } catch (err) { console.warn('Failed to clear activeGameInfo on server', err) }
  }

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

  // helper to find the gameDetails entry for a given label robustly. Handles labels like
  // '(Niet zo) slimme thermostaat' which normalize to 'nietzoslimmethermostaat' while
  // the gameDetails key may be 'slimmethermostaat'. We try exact normalized match, strip
  // common prefixes like 'nietzo', and fall back to partial matches.
  function findGameDetailsByLabel(label: string | null | undefined) {
    if (!label) return undefined
    const key = normalizeKey(label)
    if (gameDetails[key]) return gameDetails[key]
    // try stripping a leading 'nietzo' (handles '(Niet zo) slimme thermostaat')
    if (key.startsWith('nietzo')) {
      const alt = key.replace(/^nietzo/, '')
      if (gameDetails[alt]) return gameDetails[alt]
    }
    // try fuzzy partial matches: either direction
    for (const k of Object.keys(gameDetails)) {
      if (k.includes(key) || key.includes(k)) return gameDetails[k]
    }
    return undefined
  }

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
        const currentOnline = new Set(readOnlinePlayersFromStorage())
        const parsedPlayers: Player[] = rawPlayers.map((it) => {
           const obj = (it ?? {}) as Record<string, unknown>
           const playerNumber = typeof obj.playerNumber === 'string' ? obj.playerNumber : (typeof obj.nummer === 'string' ? obj.nummer : '')
           // normalize playerNumber to 3-digit string so it matches onlinePlayers format
           const playerNumberStr = String(playerNumber ?? '').trim().padStart(3,'0')
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

          // derive status from localStorage onlinePlayers set OR server lastSeen timestamp
          let status = 'Offline'
          try {
            const now = Date.now()
            const lastSeenRaw = (obj['lastSeen'] ?? obj['last_seen'] ?? obj['lastseen'] ?? null) as string | null
            const lastSeenMs = lastSeenRaw ? new Date(lastSeenRaw).getTime() : 0
            const RECENT_MS = 15000 // consider recent within 15s as online (matches heartbeat interval)
            const seenRecently = lastSeenMs && (now - lastSeenMs) <= RECENT_MS
            if (playerNumberStr && (currentOnline.has(playerNumberStr) || seenRecently)) status = 'Online'
          } catch {
            status = playerNumberStr && currentOnline.has(playerNumberStr) ? 'Online' : 'Offline'
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

  // whenever onlinePlayers updates, refresh players' status in state
  useEffect(() => {
    if (!players || players.length === 0) return
    const onlineSet = new Set(onlinePlayers.map(s => String(s)))
    setPlayers(prev => prev.map(p => ({ ...p, status: p.playerNumber && onlineSet.has(p.playerNumber) ? 'Online' : 'Offline' })))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlinePlayers])

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
                  const disabled = !!(isGameRunning && activeGame && activeGame !== label)
                  return (
                    <button
                      key={idx}
                      className="game-card"
                      aria-label={`GameBtn-${idx+1}`}
                      data-img={imgKey}
                      onClick={() => openGameModal(label)}
                      disabled={disabled}
                      aria-disabled={disabled}
                      title={disabled ? `${label} is niet beschikbaar terwijl ${activeGame} draait` : undefined}
                      style={disabled ? { opacity: 0.5, pointerEvents: 'none' } : undefined}
                    >
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

      {/* Render the reusable MinigamePopup */}
      {(() => {
        const details = findGameDetailsByLabel(selectedGame)
        const selectedKey = selectedGame ? normalizeKey(selectedGame) : ''
        return (
          <MinigamePopup
            isOpen={!!selectedGame}
            title={selectedGame ? (details?.title ?? selectedGame) : ''}
            rules={selectedGame ? (details?.rules ?? 'Geen spelregels beschikbaar.') : ''}
            image={selectedGame ? ((): string | undefined => {
              switch (selectedKey) {
                 case 'kraakhetwachtwoord': return KRAAK_IMG
                 case 'passwordzapper': return PASS_IMG
                 case 'bugcleanup': return BUG_IMG
                 case 'getalrace': return GETAL_IMG
                 case 'reactietijdtest': return REACTIE_IMG
                 case 'whackthebug': return WHACK_IMG
                 case 'printerslaatophol': return PRINTER_SLAAT_IMG
                 case 'printerkraken': return PRINTER_KRAKEN_IMG
                 case 'herstartdepc': return HERSTART_IMG
                 case 'slimmethermostaat': return THERMOSTAAT_IMG
                 case 'nietzoslimmethermostaat': return THERMOSTAAT_IMG
                 case 'fightthebug': return FIGHT_IMG
                 default: return undefined
               }
             })() : undefined}
            ages={details?.ages}
             ageDescriptions={details?.ageDescriptions}
             initialAge={selectedAges && selectedAges.length ? selectedAges[0] : null}
             onSelectAge={handleSelectAgeFromPopup}
             onStart={startGame}
             onStop={stopGame}
             onClose={closeModal}
             running={isGameRunning && activeGame === selectedGame}
           />
         )
       })()}
     </main>
   )
 }

export default DayDashboard
