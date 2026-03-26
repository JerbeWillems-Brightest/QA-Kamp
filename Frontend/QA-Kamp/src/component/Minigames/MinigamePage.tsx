import { useNavigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import PasswordZapperGame from './PasswordZapperGame'
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
  // Ensure player-side state is present so other components can read it
  useEffect(() => {
    try {
      const existing = sessionStorage.getItem('playerActiveGame')
      if (!existing) {
        const info = { gameName: game || undefined, category: ageGroup || undefined, sessionId: localStorage.getItem('currentSessionId') || undefined }
        try { sessionStorage.setItem('playerActiveGame', JSON.stringify(info)) } catch { /* ignore */ }
      }
    } catch { /* ignore */ }
  }, [game, ageGroup])

  // Listen for organizer stopping the game and navigate players back to waiting room
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
        // treat both legacy and current keys
        if (e.key === 'activeGameInfo' || e.key === 'activeGame') {
          const nv = e.newValue
          // consider cleared when newValue is null, undefined, empty string, or the literal 'null'
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

  // render fullscreen container. We intentionally omit the back button and title
  return (
    <div className="pz-root">
      {game === 'passwordzapper' ? (
        <>
          <div className="pz-controls">
            <button className="pz-btn" aria-label="Hint" onClick={() => { try { window.dispatchEvent(new CustomEvent('minigame:hint')) } catch { void 0 } }}>
              <img src={HINT_IMG} alt="hint" />
            </button>
            <button className="pz-btn" aria-label="Pause" onClick={() => { try { window.dispatchEvent(new CustomEvent('minigame:pause')) } catch { void 0 } }}>
              <img src={PAUSE_IMG} alt="pause" />
            </button>
          </div>
          <PasswordZapperGame ageGroup={ageGroup as "8-10" | "11-13" | "14-16"} />
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

