import LineImg from '../../assets/Line.png'
import RocketImg from '../../assets/Rocketship.png'
import ShapeImg from '../../assets/shape.png'
import CurveImg from '../../assets/curve.png'
import StarImg from '../../assets/Star.png'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchPlayersForSession } from '../../api'

const gameDescriptions: Record<string, Record<string, string>> = {
  'kraakhetwachtwoord': {
    '8-10 jaar': 'Je krijgt een computer die niet meer werkt na een vreemde USB-stick. Zoek hints in de kamer en raad het wachtwoord. Leer hoe je sterke wachtwoorden maakt en hackers slim af bent!',
    '11-13 jaar': 'Een computer is geblokkeerd na een verdachte USB-stick. Gebruik slimme hints (zoals foto’s en info) om het wachtwoord te achterhalen. Ontdek hoe makkelijk zwakke wachtwoorden te kraken zijn en hoe je ze beter maakt.',
    '14-16 jaar': 'Een computer raakt besmet na het gebruik van een onbekende USB-stick. Analyseer de omgeving en gebruik indirecte hints om het wachtwoord te achterhalen. Leer waarom voorspelbare wachtwoorden onveilig zijn en hoe je ze sterker maakt.'
  },
  'passwordzapper': {
    '8-10 jaar': 'Vlieg met je ruimteschip en schiet slechte wachtwoorden kapot. Laat de goede wachtwoorden met rust. Leer spelenderwijs wat een sterk wachtwoord is!',
    '11-13 jaar': 'Bestuur je schip en zap zwakke wachtwoorden met duidelijke patronen. Let goed op, want sommige lijken sterk maar zijn dat niet. Ontdek hoe je betere wachtwoorden herkent!',
    '14-16 jaar': 'Zweef door de ruimte en analyseer complexe wachtwoorden voordat je ze zapt. Vermijd fouten en denk na over veiligheid en patronen. Leer hoe hackers zwakke wachtwoorden kunnen kraken.'
  },
  // Dinsdag games
  'bugcleanup': {
    '8-10 jaar': 'Klik de bugs weg en maak je computer weer snel. Hoe meer je er weghaalt, hoe beter alles werkt. Werk rustig en precies!',
    '11-13 jaar': 'Verwijder bugs terwijl je muis traag reageert. Hoe beter je mikt, hoe sneller je systeem wordt. Let op snelheid én controle!',
    '14-16 jaar': 'Ruim zoveel mogelijk bugs op in een traag systeem. Kleine en bewegende bugs maken het moeilijker. Optimaliseer je prestaties door efficiënt te werken.'
  },
  'getalrace': {
    '8-10 jaar': 'Zoek de getallen in de juiste volgorde zo snel mogelijk. Klik ze één voor één aan. Hoe sneller, hoe beter!',
    '11-13 jaar': 'Klik de juiste cijfers in volgorde onder tijdsdruk. Fouten kosten je tijd. Blijf gefocust!',
    '14-16 jaar': 'Werk door een chaotisch raster en vind alle getallen in volgorde. Snelheid en nauwkeurigheid zijn cruciaal. Hoe laag is jouw tijd?'
  },
  'reactietijdtest': {
    '8-10 jaar': 'Klik zo snel mogelijk wanneer je het signaal ziet. Test hoe snel jij reageert. Kan jij supersnel zijn?',
    '11-13 jaar': 'Reageer zo snel mogelijk op onverwachte signalen. Vergelijk jouw score met anderen. Hoe scherp zijn jouw reflexen?',
    '14-16 jaar': 'Meet je reactietijd tot op milliseconden. Snelle beslissingen maken het verschil. Analyseer hoe jij scoort tegenover de norm.'
  },
  'whackthebug': {
    '8-10 jaar': 'Sla op de bugs die verschijnen. Wees snel en raak zoveel mogelijk! Pas op dat je niets verkeerd raakt.',
    '11-13 jaar': 'Klik snel op bugs die willekeurig opduiken. Soms verschijnen er foute targets. Blijf scherp!',
    '14-16 jaar': 'Hoge snelheid en misleidende targets maken dit uitdagend. Sla alleen de echte bugs. Precisie is key.'
  },

  // Woensdag games
  'printerslaatophol': {
    '8-10 jaar': 'Zoek wat niet past op het papier. Klik de foutjes aan. Help de printer stoppen!',
    '11-13 jaar': 'Vind subtiele verschillen in de prints. Kijk goed naar details. Elke fout telt!',
    '14-16 jaar': 'Analyseer complexe patronen en vind afwijkingen. Details maken het verschil. Denk logisch en snel.'
  },
  'printerkraken': {
    '8-10 jaar': 'Tel de juiste dingen en maak de code. Voer de code in om de printer te openen. Goed kijken is belangrijk!',
    '11-13 jaar': 'Zoek en tel objecten in de ruimte. Gebruik de juiste aantallen als code. Let op verborgen details!',
    '14-16 jaar': 'Analyseer de ruimte en vermijd afleidingen. Combineer aantallen tot de juiste code. Nauwkeurigheid is cruciaal.'
  },

  // Donderdag games
  'herstartdepc': {
    '8-10 jaar': 'Zoek wat er mis is met de computer. Los het stap voor stap op. Dan werkt hij weer!',
    '11-13 jaar': 'Herstel de pc door de juiste acties te kiezen. Denk logisch na over het probleem. Elke stap telt!',
    '14-16 jaar': 'Analyseer meerdere problemen en los ze in de juiste volgorde op. Vermijd foute keuzes. Denk als een echte IT’er.'
  },
  'slimmethermostaat': {
    '8-10 jaar': 'Speel met knoppen om de kamertemperatuur comfortabel te houden.',
    '11-13 jaar': 'Stel slimme schema’s in en leer over energiegebruik en comfort.',
    '14-16 jaar': 'Optimaliseer instellingen voor energie en comfort, leer hoe slimme systemen beslissingen nemen.'
  },

  // Vrijdag games
  'fightthebug': {
    '8-10 jaar': 'Versla de grote bug door juiste keuzes te maken. Kies het juiste antwoord. Red de dag!',
    '11-13 jaar': 'Beantwoord vragen en voer acties uit om de bug te verslaan. Fouten kosten je punten. Blijf scherp!',
    '14-16 jaar': 'Ga de strijd aan met complexe vragen en scenario’s. Denk snel en correct. Gebruik alles wat je geleerd hebt!'
  },

  'default': {
    '8-10 jaar': 'Een leuk en leerzaam minigame voor 8-10 jaar.',
    '11-13 jaar': 'Een uitdaging die logisch denken en snelheid beloont voor 11-13 jaar.',
    '14-16 jaar': 'Een complexere variant met extra diepgang voor 14-16 jaar.'
  }
}

export default function PlayerGame() {
  type ActiveGame = { gameName?: string; game?: string; day?: string; category?: string }
  let raw: string | null = null
  try { raw = sessionStorage.getItem('playerActiveGame') } catch (err) { void err }
  const info: ActiveGame | null = raw ? (JSON.parse(raw) as ActiveGame) : null
  const title = info?.gameName || info?.game || 'Actief spel'
  const day = info?.day || ''
  const categoryFromActive = info?.category || ''

  const navigate = useNavigate()

  // New state: resolved player info (category comes from players list) and description
  const [playerCategory, setPlayerCategory] = useState<string | null>(null)
  const [playerName, setPlayerName] = useState<string | null>(null)
  // description derived from game key + playerCategory; useMemo avoids calling setState in effects
  // description will be computed below
  const sessionId = typeof window !== 'undefined' ? sessionStorage.getItem('playerSessionId') || '' : ''
  const playerNumber = typeof window !== 'undefined' ? sessionStorage.getItem('playerNumber') || '' : ''

  // Normalize strings: remove diacritics, lowercase, strip spaces and non-alphanum
  function normalizeKey(s: string) {
    try {
      // strip accents/diacritics, then remove non-alphanum
      return s.normalize('NFKD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')
    } catch {
      return s.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')
    }
  }

  // Try to find a gameDescriptions key that matches a title. Handles variants like
  // '(Niet zo) slimme thermostaat' -> 'slimmethermostaat' by stripping a leading 'nietzo'
  function findGameKeyForTitle(t?: string | null) {
    if (!t) return undefined
    const norm = normalizeKey(t)
    // direct exact match
    if (gameDescriptions[norm]) return norm
    // if title like 'nietzoslimmethermostaat', try stripping leading 'nietzo'
    if (norm.startsWith('nietzo')) {
      const alt = norm.replace(/^nietzo/, '')
      if (gameDescriptions[alt]) return alt
    }
    // try partial/fuzzy matches: check each game key normalized
    for (const k of Object.keys(gameDescriptions)) {
      const kn = normalizeKey(k)
      if (kn === norm) return k // fallback: return original key name
      if (kn.includes(norm) || norm.includes(kn)) return k
    }
    return undefined
  }

  // Normalize category variants to the keys used in gameDescriptions
  function normalizeCategory(raw?: string | null): string {
    if (!raw) return '11-13 jaar'
    const r = String(raw).toLowerCase().replace(/\s+/g, '')
    if (r.includes('8') && r.includes('10')) return '8-10 jaar'
    if (r.includes('11') && r.includes('13')) return '11-13 jaar'
    if (r.includes('14') && r.includes('16')) return '14-16 jaar'
    // fallback: try to detect by numbers
    if (r.includes('8')) return '8-10 jaar'
    if (r.includes('14')) return '14-16 jaar'
    if (r.includes('11')) return '11-13 jaar'
    return '11-13 jaar'
  }

  useEffect(() => {
    let mounted = true
    async function loadPlayer() {
      if (!sessionId || !playerNumber) return
      try {
        const resp = await fetchPlayersForSession(sessionId)
        const found = (resp.players || []).find(p => String(p.playerNumber) === String(playerNumber))
        if (!mounted) return
        if (found) {
          // prefer explicit category, fall back to numeric age if provided
          const f = found as unknown as Record<string, unknown>
          const catFromFound = typeof f['category'] === 'string' ? (f['category'] as string) : undefined
          const ageFromFound = typeof f['age'] !== 'undefined' ? String(f['age'] as unknown) : undefined
          const rawCat = (catFromFound ?? ageFromFound ?? categoryFromActive ?? null) as string | null
          setPlayerCategory(normalizeCategory(rawCat))
          const nameFromFound = typeof f['name'] === 'string' ? (f['name'] as string) : null
          setPlayerName(nameFromFound)
         } else {
           // fallback to active info category
           setPlayerCategory(normalizeCategory(categoryFromActive || null))
         }
       } catch (err) {
         void err
         // ignore, keep category from active info
         setPlayerCategory(normalizeCategory(categoryFromActive || null))
       }
     }
    loadPlayer()
    return () => { mounted = false }
  }, [sessionId, playerNumber, categoryFromActive])

  // derive description with useMemo
  function resolveDescriptionFor(tableSection: Record<string, string>, cat: string) {
    const norm = String(cat || '').toLowerCase().replace(/\s+/g, '')
    // try to find an exact key ignoring spaces and case
    const matchKey = Object.keys(tableSection).find(k => k.toLowerCase().replace(/\s+/g, '') === norm)
    if (matchKey) return tableSection[matchKey]
    // fallback to '11-13 jaar' if available
    if (tableSection['11-13 jaar']) return tableSection['11-13 jaar']
    // otherwise return first available
    const first = Object.keys(tableSection)[0]
    return tableSection[first]
  }

  const description = (() => {
    const table = gameDescriptions as Record<string, Record<string, string>>
    const cat = playerCategory || normalizeCategory(categoryFromActive || null) || '11-13 jaar'
    // try robust resolver first (handles '(Niet zo) slimme thermostaat')
    const resolvedGameKey = findGameKeyForTitle(title) // may be undefined
    if (resolvedGameKey && table[resolvedGameKey]) return resolveDescriptionFor(table[resolvedGameKey], cat)
    // fallback: attempt direct normalized key (older behavior)
    const directKey = normalizeKey(title || '')
    if (directKey && table[directKey]) return resolveDescriptionFor(table[directKey], cat)
    return resolveDescriptionFor(table['default'], cat)
  })()

  // navigate back to waiting room when organizer clears/stops the active game
  useEffect(() => {
    function handleStorage(e: StorageEvent) {
      if (!e.key) return
      if (e.key === 'activeGame' || e.key === 'activeGameInfo') {
        try {
          // storage events set newValue === null when a key is removed
          if (e.newValue === null) {
            try { sessionStorage.removeItem('playerActiveGame') } catch (err) { void err }
            try { navigate('/player/waiting') } catch (err) { void err }
            return
          }
          const val = e.newValue ?? e.oldValue
          if (!val) return
          // update session copy if new active game is set
          try {
            const parsed = JSON.parse(val as string)
            const mapped = (parsed && (parsed.game || parsed.gameName))
              ? { gameName: parsed.gameName ?? parsed.game, day: parsed.day, category: parsed.category, sessionId: parsed.sessionId }
              : parsed
            try { sessionStorage.setItem('playerActiveGame', JSON.stringify(mapped)) } catch { /* ignore */ }
          } catch { /* ignore parse errors */ }
        } catch { /* ignore */ }
      }
    }

    function handleCustom(ev: Event) {
      try {
        const ce = ev as CustomEvent
        const details = ce.detail
        if (!details) {
          try { sessionStorage.removeItem('playerActiveGame') } catch (err) { void err }
          try { navigate('/player/waiting') } catch (err) { void err }
          return
        }
        const mapped = (details && (details.game || details.gameName))
          ? { gameName: details.gameName ?? details.game, day: details.day, category: details.category, sessionId: details.sessionId }
          : details
        try { sessionStorage.setItem('playerActiveGame', JSON.stringify(mapped)) } catch { /* ignore */ }
      } catch { /* ignore */ }
    }

    window.addEventListener('storage', handleStorage)
    window.addEventListener('activeGameInfoChanged', handleCustom)
    return () => {
      try { window.removeEventListener('storage', handleStorage) } catch (err) { void err }
      try { window.removeEventListener('activeGameInfoChanged', handleCustom) } catch (err) { void err }
    }
  }, [navigate])

  return (
    <main className="main">
      <div className="body-grid three-col">
        <div className="grid-top-left">
          <img src={LineImg} alt="Line decoration" className="grid-img" />
        </div>

        <div className="grid-top-center">
          <img src={RocketImg} alt="Rocket" className="grid-rocket" />
        </div>

        <div className="grid-top-right">
          <img src={ShapeImg} alt="Shape decoration" className="grid-img" />
        </div>

        <div className="grid-bottom-left">
          <img src={CurveImg} alt="Curve decoration" className="grid-img" />
        </div>

        <div className="grid-bottom-center">
          <div className="hero-inner center-card" style={{ textAlign: 'left', alignItems: 'flex-start' }}>
            <h1 style={{ fontSize: 36, marginBottom: 8 }}>{title}</h1>
            <p style={{ color: '#666', marginBottom: 12 }}>{playerName ? `${playerName}, welkom bij het spel` : 'Welkom bij het spel'}{day ? ` - ${day}` : ''}{playerCategory ? ` - ${playerCategory}` : (categoryFromActive ? ` (${normalizeCategory(categoryFromActive)})` : '')}</p>
            <p style={{ maxWidth: 900, color: '#444', fontSize: 16 }}>{description}</p>
          </div>
        </div>

        <div className="grid-bottom-right">
          <img src={StarImg} alt="Star decoration" className="grid-img" />
        </div>
      </div>
    </main>
  )
}
