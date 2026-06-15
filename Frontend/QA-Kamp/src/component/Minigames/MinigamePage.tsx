import { useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useState, useRef, useLayoutEffect } from 'react'
import PasswordZapperGame from './PasswordZapper/PasswordZapperGame.tsx'
import PrinterSlaatOpHolGame from './PrinterSlaatOpHol/PrinterSlaatOpHolGame.tsx'
import BugCleanupGame from './BugCleanup/BugCleanupGame.tsx'
import NietZoSlimmeThermostaat from './NietZoSlimmeThermostaat/NietZoSlimmeThermostaat.tsx'
import FightTheBug from './FightTheBug/FightTheBug.tsx'
import type { ApiPlayer } from '../../api'
import HINT_IMG from '../../assets/hint.png'
import PAUSE_IMG from '../../assets/pauze.png'
import VRAAG_IMG from '../../assets/vraag.png'

import LineImg from '../../assets/Line.png'
import RocketImg from '../../assets/Rocketship.png'
import ShapeImg from '../../assets/shape.png'
import CurveImg from '../../assets/curve.png'
import StarImg from '../../assets/Star.png'


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

const practiceControlHide = `
  body.pz-practice-open .pz-controls .pz-btn,
  body.pz-practice-open .pz-help {
    display: none !important;
    pointer-events: none !important;
    visibility: hidden !important;
  }
`

const helpButtonSafe = `
  .pz-help {
    /* Respect bottom safe-area (home indicator) and any in-app bottombar height */
    bottom: max(calc(var(--bottombar-height, 0px) + 24px + env(safe-area-inset-bottom, 0px)), 24px);
    /* keep a consistent right offset while also accounting for safe-area on the right */
    right: calc(30px + env(safe-area-inset-right, 0px));
  }

  /* Slightly reduce size on tablet widths so the button doesn't overlap content */
  @media (min-width: 600px) and (max-width: 1100px) {
    .pz-help { width: 56px; height: 56px; }
  }
`

function useQuery() {
  return new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
}

interface MinigamePageProps {
  game?: string
  ageGroup?: '8-10' | '11-13' | '14-16'
}

export function MinigamePage({ game: gameProp, ageGroup: ageGroupProp }: MinigamePageProps = {}) {
  const q = useQuery()
  const navigate = useNavigate()
  const location = useLocation()
  const initialMountRef = useRef(true)

  const game = gameProp || q.get('game') || (location?.pathname?.toLowerCase().includes('passwordzapper') ? 'passwordzapper' : '')

  const rawSessionValue = (typeof window !== 'undefined') ? (() => {
    try {
      const raw = sessionStorage.getItem('playerCategory') || sessionStorage.getItem('ageGroup') || sessionStorage.getItem('age') || ''
      const s = String(raw || '').trim()
      const low = s.toLowerCase()
      if (!s || ['null', 'undefined', 'false', '0'].includes(low)) return null
      return s
    } catch {
      return null
    }
  })() : null

  const urlAgeParam = q.get('age') || null
  const initialAgeSource = ageGroupProp ?? rawSessionValue ?? urlAgeParam ?? ''

  function mapAge(a: string) {
    const raw = (a || '').toString().trim().toLowerCase()
    if (!raw) return '11-13'
    try {
      if (/8\D*10/.test(raw)) return '8-10'
      if (/11\D*13/.test(raw)) return '11-13'
      if (/14\D*16/.test(raw)) return '14-16'

      const nums = (raw.match(/\d+/g) || []).map(n => parseInt(n, 10)).filter(n => !Number.isNaN(n))
      if (nums.length >= 1) {
        const n = nums[0]
        if (n <= 10) return '8-10'
        if (n <= 13) return '11-13'
        return '14-16'
      }

      if (raw.includes('8')) return '8-10'
      if (raw.includes('11') || raw.includes('12') || raw.includes('13')) return '11-13'
      if (raw.includes('14') || raw.includes('15') || raw.includes('16')) return '14-16'
    } catch {
      // fall through
    }
    return '11-13'
  }

  const [ageGroup, setAgeGroup] = useState(() => mapAge(initialAgeSource))


  try {
    if (typeof window !== 'undefined' && ageGroup && !rawSessionValue) sessionStorage.setItem('playerCategory', ageGroup)
  } catch { /* ignore */ }

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && ageGroup) sessionStorage.setItem('playerCategory', ageGroup)
    } catch { /* ignore */ }
  }, [ageGroup])

  useEffect(() => {
    try {
      if (typeof window === 'undefined') return
      const params = new URLSearchParams(window.location.search || '')
      const current = params.get('age')
      if (current !== ageGroup && (rawSessionValue !== null || current === null)) {
        const u = new URL(window.location.href)
        u.searchParams.set('age', ageGroup)
        window.history.replaceState({}, '', u.toString())
      }
    } catch {
      /* ignore */
    }
  }, [ageGroup, rawSessionValue])

  useEffect(() => {
    let cancelled = false
    try {
      if (rawSessionValue) return
      const playerNumber = (() => { try { return sessionStorage.getItem('playerNumber') || '' } catch { return '' } })()
      const sidCandidate = (() => { try { return localStorage.getItem('currentSessionId') || sessionStorage.getItem('playerSessionId') || '' } catch { return '' } })()
      if (!playerNumber || !sidCandidate) return

      const tryFetch = async (attemptsLeft: number) => {
        try {
          const api = await import('../../api')
          const resp = await api.fetchPlayersForSession(sidCandidate)
          const list = (resp && (resp as { players?: unknown }).players) || []
          const players = Array.isArray(list) ? (list as ApiPlayer[]) : []
          const normalizedPn = String(playerNumber).padStart(3, '0')
          const found = players.find(p => {
            const rec = p as unknown as Record<string, unknown>
            const pnRaw = rec['playerNumber'] ?? rec['nummer'] ?? ''
            const pn = String(pnRaw ?? '')
            return pn === String(playerNumber) || pn === normalizedPn || String(playerNumber) === String(rec['nummer'] ?? '')
          })
          if (cancelled) return
          if (found) {
            const rec = found as unknown as Record<string, unknown>
            const cat = (typeof rec['category'] === 'string' ? String(rec['category']) : undefined) ?? (typeof rec['age'] === 'number' ? ((rec['age'] as number) <= 10 ? '8-10' : (rec['age'] as number) <= 13 ? '11-13' : '14-16') : undefined)
            if (cat && String(cat)) {
              const mapped = mapAge(String(cat))
              if (mapped && mapped !== ageGroup) {
                try { setAgeGroup(mapped) } catch { /* ignore */ }
                try { sessionStorage.setItem('playerCategory', mapped) } catch { /* ignore */ }
              }
            }
            return
          }
          if (attemptsLeft > 0) {
            await new Promise(res => setTimeout(res, 400))
            if (cancelled) return
            return tryFetch(attemptsLeft - 1)
          }
        } catch {
          // ignore network errors
        }
      }

      void tryFetch(3)
    } catch {
      /* ignore */
    }
    return () => { cancelled = true }
  }, [rawSessionValue, ageGroup])

  const [hintUnlocked, setHintUnlocked] = useState(false)


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
      if (typeof window !== 'undefined' && !initialMountRef.current) {
        const w = window as unknown as Record<string, unknown>
        try { w['__pz_hint_unlocked'] = false } catch { /* ignore */ }
        window.dispatchEvent(new CustomEvent('minigame:hint-locked'))
        setHintUnlocked(false)
      }
    } catch { /* ignore */ }

    try {
      const existing = sessionStorage.getItem('playerActiveGame')
      if (!existing) {
        const info: Record<string, unknown> = { gameName: game || undefined, category: ageGroup || undefined, sessionId: localStorage.getItem('currentSessionId') || undefined }
        try {
          const keyParam = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '').get('key')
          if (keyParam) info.key = keyParam
        } catch { /* ignore */ }
        try { sessionStorage.setItem('playerActiveGame', JSON.stringify(info)) } catch { /* ignore */ }
      }
    } catch { /* ignore */ }

    if (initialMountRef.current) {
      initialMountRef.current = false
    }

    return () => { window.removeEventListener('minigame:hint-unlocked', onHintUnlocked); window.removeEventListener('minigame:hint-locked', onHintLocked); }
  }, [game, ageGroup])

  useLayoutEffect(() => {
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


  return (
      <div className="pz-root">
      <style>{practiceControlHide}</style>
      <style>{helpButtonSafe}</style>
      {game === 'passwordzapper' || game === 'printerslaatophol' || game === 'bugcleanup' || game === 'slimmethermostaat' || game === 'nietzoslimmethermostaat' || game === 'fightthebug' ? (
        <>
          {/* compute support flag to avoid TS narrowing issues in JSX */}
          {(() => {
            const supportsHint = (game === 'bugcleanup' || game === 'slimmethermostaat' || game === 'nietzoslimmethermostaat' || game === 'passwordzapper' || game === 'printerslaatophol' || game === 'fightthebug')
            return (
              <>
                <div className="pz-controls">
                  <button
                    className="pz-btn"
                    aria-label="Hint"
                    onClick={() => { try { window.dispatchEvent(new CustomEvent('minigame:hint')) } catch { void 0 } }}
                    // BugCleanup should always allow the hint button; other games require hintUnlocked
                    disabled={!supportsHint || (game !== 'bugcleanup' && !hintUnlocked)}
                    title={
                      game === 'bugcleanup'
                        ? 'Toon hint'
                        : (supportsHint ? (hintUnlocked ? 'Toon hint' : 'Hints worden beschikbaar na enkele fouten') : 'Hints niet beschikbaar voor dit spel')
                    }
                  >
                    <img src={HINT_IMG} alt="hint" />
                  </button>
                  <button className="pz-btn" aria-label="Pause" onClick={() => { try { window.dispatchEvent(new CustomEvent('minigame:pause')) } catch { void 0 } }}>
                    <img src={PAUSE_IMG} alt="pause" />
                  </button>
                </div>
              </>
            )
          })()}
          {game === 'printerslaatophol' ? (
            <PrinterSlaatOpHolGame ageGroup={ageGroup as "8-10" | "11-13" | "14-16"} />
          ) : game === 'bugcleanup' ? (
            <BugCleanupGame ageGroup={ageGroup as "8-10" | "11-13" | "14-16"} />
          ) : game === 'fightthebug' ? (
            <FightTheBug ageGroup={ageGroup as "8-10" | "11-13" | "14-16"} />
          ) : game === 'slimmethermostaat' || game === 'nietzoslimmethermostaat' ? (
            <NietZoSlimmeThermostaat ageGroup={ageGroup as "8-10" | "11-13" | "14-16"} />
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

