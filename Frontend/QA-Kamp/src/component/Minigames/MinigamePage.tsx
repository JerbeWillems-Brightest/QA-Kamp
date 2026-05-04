import { useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import PasswordZapperGame from './PasswordZapper/PasswordZapperGame.tsx'
import PrinterSlaatOpHolGame from './PrinterSlaatOpHol/PrinterSlaatOpHolGame.tsx'
import BugCleanupGame from './BugCleanup/BugCleanupGame.tsx'
import HINT_IMG from '../../assets/hint.png'
import PAUSE_IMG from '../../assets/pauze.png'
import VRAAG_IMG from '../../assets/vraag.png'
// Decorative assets reused from waiting room
import LineImg from '../../assets/Line.png'
import RocketImg from '../../assets/Rocketship.png'
import ShapeImg from '../../assets/shape.png'
import CurveImg from '../../assets/curve.png'
import StarImg from '../../assets/Star.png'

// star animation CSS (kept small and inline like WaitingRoom)
const starStyles = `
  .animated-stars { display: flex; gap: 12px; align-items: center; justify-content: center; }
  .animated-star { width: 18px; height: 18px; transform-origin: center; opacity: 0.35; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.12)); }
  .animated-star svg{ display:block; width:100%; height:100% }
  .animated-star:nth-child(1){ animation: starPulse 1.0s infinite ease-in-out; animation-delay: 0s }
  .animated-star:nth-child(2){ animation: starPulse 1.0s infinite ease-in-out; animation-delay: 0.2s }
  .animated-star:nth-child(3){ animation: starPulse 1.0s infinite ease-in-out; animation-delay: 0.4s }

  @keyframes starPulse {
    0% { transform: translateY(0) scale(1); opacity: 0.35 }
    50% { transform: translateY(-6px) scale(1.18); opacity: 1 }
    100% { transform: translateY(0) scale(1); opacity: 0.35 }
  }
`

function useQuery() {
  return new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
}

export function MinigamePage() {
  const q = useQuery()
  const navigate = useNavigate()
  const location = useLocation()
  // allow game to be specified either via ?game=... or via pathname (/minigame/passwordzapper)
  const game = q.get('game') || (location?.pathname?.toLowerCase().includes('passwordzapper') ? 'passwordzapper' : '')
  // Prefer explicit ?age= query param, otherwise fall back to the logged-in player's stored category
  const age = q.get('age') || (typeof window !== 'undefined' ? sessionStorage.getItem('playerCategory') || '' : '')

  // Map age query value to component prop expected values
  function mapAge(a: string) {
    const raw = (a || '').toString().trim()
    if (!raw) return '11-13'
    // allow both '8-10' and '8%2D10' etc
    if (/8\D*10/.test(raw)) return '8-10'
    if (/11\D*13/.test(raw)) return '11-13'
    if (/14\D*16/.test(raw)) return '14-16'
    // try to extract digits
    if (raw.startsWith('8')) return '8-10'
    if (raw.startsWith('14')) return '14-16'
    return '11-13'
  }

  const ageGroup = mapAge(age)
  // whether the hint button (top-level control) is unlocked; the game will
  // dispatch a global event `minigame:hint-unlocked` when the mistake threshold
  // is reached and the hint modal should appear. We also read a transient
  // global flag so a late-mounted controller can pick up the state.
  const [hintUnlocked, setHintUnlocked] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const w = window as unknown as Record<string, unknown>
        return Boolean(w['__pz_hint_unlocked'])
      }
    } catch { /* ignore */ }
    return false
  })
  // Ensure player-side state is present so other components can read it
  useEffect(() => {
    function onHintUnlocked() {
      try { setHintUnlocked(true) } catch { /* ignore */ }
    }
    function onHintLocked() {
      try { setHintUnlocked(false) } catch { /* ignore */ }
    }
    window.addEventListener('minigame:hint-unlocked', onHintUnlocked)
    window.addEventListener('minigame:hint-locked', onHintLocked)
    try {
      const existing = sessionStorage.getItem('playerActiveGame')
      if (!existing) {
        const info: Record<string, unknown> = { gameName: game || undefined, category: ageGroup || undefined, sessionId: localStorage.getItem('currentSessionId') || undefined }
        try {
          // include optional network join key when present in URL
          const keyParam = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '').get('key')
          if (keyParam) info.key = keyParam
        } catch { /* ignore */ }
        try { sessionStorage.setItem('playerActiveGame', JSON.stringify(info)) } catch { /* ignore */ }
      }
    } catch { /* ignore */ }
    return () => { window.removeEventListener('minigame:hint-unlocked', onHintUnlocked); window.removeEventListener('minigame:hint-locked', onHintLocked); }
  }, [game, ageGroup])

  // Listen for organizer actions (stop, kick, session end, onlinePlayers change)
  useEffect(() => {
    function handleCustom(ev: Event) {
      try {
        const ce = ev as CustomEvent
        const details = ce.detail
        if (!details) {
          try { sessionStorage.removeItem('playerActiveGame') } catch { /* ignore */ }
          try { navigate('/player/waiting') } catch { /* ignore */ }
        }
      } catch { /* ignore */ }
    }

    function handleStorage(e: StorageEvent) {
      try {
        // explicit kick (kick_<playerNumber>)
        if (e.key && e.key.startsWith('kick_')) {
          const kicked = e.key.slice(5)
          const plain = sessionStorage.getItem('playerNumber') || ''
          const padded = String(plain).padStart(3, '0')
          if (kicked === plain || kicked === padded) {
            try { sessionStorage.removeItem('playerNumber') } catch { /* ignore */ }
            try { sessionStorage.removeItem('playerSessionId') } catch { /* ignore */ }
            try { sessionStorage.removeItem('playerActiveGame') } catch { /* ignore */ }
            try { sessionStorage.removeItem('playerOnlineLocked') } catch { /* ignore */ }
            try { localStorage.removeItem('currentSessionId') } catch { /* ignore */ }
            try { navigate('/') } catch { /* ignore */ }
            return
          }
        }

        // onlinePlayers change: if this player is no longer present, force logout
        if (e.key === 'onlinePlayers' || e.key === 'onlinePlayers_last_update') {
          try {
            const raw = (e.key === 'onlinePlayers') ? (e.newValue ?? localStorage.getItem('onlinePlayers')) : localStorage.getItem('onlinePlayers')
            const arr = raw ? JSON.parse(String(raw)) as string[] : []
            const padded = String(sessionStorage.getItem('playerNumber') || '').padStart(3,'0')
            const plain = String(sessionStorage.getItem('playerNumber') || '')
            const exists = Array.isArray(arr) && (arr.includes(plain) || arr.includes(padded))
            if (!exists) {
              try { sessionStorage.removeItem('playerNumber') } catch { /* ignore */ }
              try { sessionStorage.removeItem('playerSessionId') } catch { /* ignore */ }
              try { sessionStorage.removeItem('playerActiveGame') } catch { /* ignore */ }
              try { sessionStorage.removeItem('playerOnlineLocked') } catch { /* ignore */ }
              try { localStorage.removeItem('currentSessionId') } catch { /* ignore */ }
              try { navigate('/') } catch { /* ignore */ }
            }
          } catch { /* ignore */ }
        }

        // session ended/cleared by organizer
        if (e.key === 'currentSessionId') {
          if (e.newValue === null) {
            try { sessionStorage.removeItem('playerActiveGame') } catch { /* ignore */ }
            try { sessionStorage.removeItem('playerNumber') } catch { /* ignore */ }
            try { sessionStorage.removeItem('playerSessionId') } catch { /* ignore */ }
            try { sessionStorage.removeItem('playerOnlineLocked') } catch { /* ignore */ }
            try {
              const raw = localStorage.getItem('onlinePlayers')
              const arr = raw ? JSON.parse(raw) as string[] : []
              const plain = String(sessionStorage.getItem('playerNumber') || '')
              const padded = String(sessionStorage.getItem('playerNumber') || '').padStart(3, '0')
              const filtered = Array.isArray(arr) ? arr.filter(x => (String(x) !== plain && String(x) !== padded)) : []
              localStorage.setItem('onlinePlayers', JSON.stringify(filtered))
              window.dispatchEvent(new StorageEvent('storage', { key: 'onlinePlayers', newValue: JSON.stringify(filtered) }))
            } catch { /* ignore */ }
            try { navigate('/') } catch { /* ignore */ }
          }
          return
        }

        // activeGame cleared -> go back to waiting
        if (e.key === 'activeGameInfo' || e.key === 'activeGame') {
          const nv = e.newValue
          if (nv === null || typeof nv === 'undefined' || nv === '' || String(nv) === 'null') {
            try { sessionStorage.removeItem('playerActiveGame') } catch { /* ignore */ }
            try { navigate('/player/waiting') } catch { /* ignore */ }
          }
        }
      } catch { /* ignore */ }
    }

    window.addEventListener('activeGameInfoChanged', handleCustom)
    window.addEventListener('storage', handleStorage)
    return () => {
      window.removeEventListener('activeGameInfoChanged', handleCustom)
      window.removeEventListener('storage', handleStorage)
    }
  }, [navigate])

  // Fallback: poll localStorage periodically to detect cleared activeGameInfo
  useEffect(() => {
    const id = window.setInterval(() => {
      try {
        const raw = localStorage.getItem('activeGameInfo') ?? localStorage.getItem('activeGame')
        if (!raw || raw === 'null') {
          try { sessionStorage.removeItem('playerActiveGame') } catch { /* ignore */ }
          try { navigate('/player/waiting') } catch { /* ignore */ }
        }
      } catch { /* ignore */ }
    }, 1000)
    return () => clearInterval(id)
  }, [navigate])

  // Poll the server periodically for authoritative activeGameInfo so remote
  // devices (different machines) can detect when the organizer cleared the
  // game. We do this in addition to localStorage/storage events which only
  // synchronize within the same browser/profile.
  useEffect(() => {
    let mounted = true
    let timer: number | undefined
    async function pollServer() {
      try {
        const sid = (() => { try { return localStorage.getItem('currentSessionId') } catch { return null } })()
        if (!sid) return
        const api = await import('../../api')
        const resp = await api.getActiveGameInfo(sid)
        if (!mounted) return
        if (resp && (resp.activeGameInfo === null || typeof resp.activeGameInfo === 'undefined')) {
          try { localStorage.removeItem('activeGameInfo') } catch { /* ignore */ }
          try { sessionStorage.removeItem('playerActiveGame') } catch { /* ignore */ }
          try { navigate('/player/waiting') } catch { /* ignore */ }
          return
        }
      } catch {
        // network errors are safe; we'll retry
      } finally {
        if (mounted) timer = window.setTimeout(pollServer, 5000)
      }
    }
    pollServer()
    return () => { mounted = false; if (timer) clearTimeout(timer) }
  }, [navigate])

  // Also poll the authoritative onlinePlayers list so the minigame page can
  // detect if this player was removed/kicked while on the minigame and force
  // a logout/navigation to the home page.
  useEffect(() => {
    let cancelled = false
    async function pollOnline() {
      try {
        const sid = (() => { try { return localStorage.getItem('currentSessionId') } catch { return null } })()
        const pn = (() => { try { return sessionStorage.getItem('playerNumber') || '' } catch { return '' } })()
        if (!sid || !pn) return
        const api = await import('../../api')
        const resp = await api.fetchOnlinePlayers(sid)
        const list = (resp.onlinePlayers || []).map(p => String(p.playerNumber).padStart(3,'0'))
        const plain = String(pn)
        const padded = String(pn).padStart(3,'0')
        const exists = Array.isArray(list) && (list.includes(plain) || list.includes(padded))
        if (!exists && !cancelled) {
          try { sessionStorage.removeItem('playerNumber') } catch { /* ignore */ }
          try { sessionStorage.removeItem('playerSessionId') } catch { /* ignore */ }
          try { sessionStorage.removeItem('playerActiveGame') } catch { /* ignore */ }
          try { sessionStorage.removeItem('playerOnlineLocked') } catch { /* ignore */ }
          try { localStorage.removeItem('currentSessionId') } catch { /* ignore */ }
          try { navigate('/') } catch { /* ignore */ }
        }
      } catch {
        // ignore and retry
      }
    }
    void pollOnline()
    const id = window.setInterval(pollOnline, 5000)
    return () => { cancelled = true; clearInterval(id) }
  }, [navigate])

  // render fullscreen container. We intentionally omit the back button and title
  return (
    <div className="pz-root">
      {game === 'passwordzapper' || game === 'printerslaatophol' || game === 'bugcleanup' ? (
        <>
          <div className="pz-controls">
            <button
              className="pz-btn"
              aria-label="Hint"
              onClick={() => { try { window.dispatchEvent(new CustomEvent('minigame:hint')) } catch { void 0 } }}
              disabled={game !== 'bugcleanup' && !hintUnlocked}
              title={game === 'bugcleanup' ? 'Toon hint' : (!hintUnlocked ? 'Hints worden beschikbaar na enkele fouten' : 'Toon hint')}
            >
              <img src={HINT_IMG} alt="hint" />
            </button>
            <button className="pz-btn" aria-label="Pause" onClick={() => { try { window.dispatchEvent(new CustomEvent('minigame:pause')) } catch { void 0 } }}>
              <img src={PAUSE_IMG} alt="pause" />
            </button>
          </div>
          {game === 'printerslaatophol' ? (
            <PrinterSlaatOpHolGame ageGroup={ageGroup as "8-10" | "11-13" | "14-16"} />
          ) : game === 'bugcleanup' ? (
            <BugCleanupGame ageGroup={ageGroup as "8-10" | "11-13" | "14-16"} />
          ) : (
            <PasswordZapperGame ageGroup={ageGroup as "8-10" | "11-13" | "14-16"} />
          )}
          <button className="pz-help" aria-label="Vraag" onClick={() => { try { window.dispatchEvent(new CustomEvent('minigame:question')) } catch { void 0 } }}>
            <img src={VRAAG_IMG} alt="vraag" />
          </button>
        </>
      ) : (
        <>
          <style>{starStyles}</style>
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
                <div className="hero-inner center-card">
                  <h1 style={{ padding: 8 }}>Onbekend spel</h1>
                  <p style={{ marginTop: 8, color: '#444' }}>Onbekend spel: {game || 'niet opgegeven'}</p>
                  <p style={{ marginTop: 8, color: '#444' }}>Probeer opnieuw vanaf het dashboard of vraag de organisator om het spel te (her)starten.</p>

                  <div style={{ marginTop: 18 }} aria-hidden="true">
                    <div className="animated-stars">
                      <div className="animated-star" aria-hidden>
                        <svg viewBox="0 0 24 24" fill="#f4b400" xmlns="http://www.w3.org/2000/svg"><path d="M12 17.3l6.18 3.73-1.64-7.03L21 9.24l-7.19-.61L12 2 10.19 8.63 3 9.24l5.46 4.76L6.82 21z"/></svg>
                      </div>
                      <div className="animated-star" aria-hidden>
                        <svg viewBox="0 0 24 24" fill="#f4b400" xmlns="http://www.w3.org/2000/svg"><path d="M12 17.3l6.18 3.73-1.64-7.03L21 9.24l-7.19-.61L12 2 10.19 8.63 3 9.24l5.46 4.76L6.82 21z"/></svg>
                      </div>
                      <div className="animated-star" aria-hidden>
                        <svg viewBox="0 0 24 24" fill="#f4b400" xmlns="http://www.w3.org/2000/svg"><path d="M12 17.3l6.18 3.73-1.64-7.03L21 9.24l-7.19-.61L12 2 10.19 8.63 3 9.24l5.46 4.76L6.82 21z"/></svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid-bottom-right">
                <img src={StarImg} alt="Star decoration" className="grid-img" />
              </div>
            </div>
          </main>
        </>
      )}
    </div>
  )
}

export default MinigamePage

