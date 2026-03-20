import { useEffect, useState, useCallback } from 'react'
import { fetchLeaderboard, getActiveGameInfo } from '../../api'
import { useNavigate } from 'react-router-dom'
import LineImg from '../../assets/Line.png'
import RocketImg from '../../assets/Rocketship.png'
import ShapeImg from '../../assets/shape.png'
import CurveImg from '../../assets/curve.png'
import StarImg from '../../assets/Star.png'

// Helper: safely map unknown activeGame payloads to a typed shape
function mapActiveInfo(v: unknown): { gameName?: string; day?: string; category?: string; sessionId?: string } | null {
  if (!v) return null
  if (typeof v === 'string') {
    try {
      const parsed = JSON.parse(v)
      return mapActiveInfo(parsed)
    } catch {
      return null
    }
  }
  if (typeof v !== 'object') return null
  const rec = v as Record<string, unknown>
  const gameName = typeof rec['gameName'] === 'string' ? rec['gameName'] as string : (typeof rec['game'] === 'string' ? rec['game'] as string : undefined)
  const day = typeof rec['day'] === 'string' ? rec['day'] as string : undefined
  const category = typeof rec['category'] === 'string' ? rec['category'] as string : undefined
  const sessionId = typeof rec['sessionId'] === 'string' ? rec['sessionId'] as string : (rec['_id'] ? String(rec['_id']) : undefined)
  // if we have at least one relevant field return mapped object, otherwise return null
  if (gameName || day || category || sessionId) return { gameName, day, category, sessionId }
  return null
}

export default function WaitingRoom() {
  const playerNumber = sessionStorage.getItem('playerNumber') || ''
  // prefer sessionStorage (set during login), but fall back to localStorage.currentSessionId
  // to handle cases where a player opened the frontend in another tab or has stale storage
  const sessionStorageId = sessionStorage.getItem('playerSessionId')
  const localStorageId = localStorage.getItem('currentSessionId')
  const sessionId = (sessionStorageId && sessionStorageId !== 'null') ? sessionStorageId : (localStorageId ?? '')
  // Debug: if both exist but differ, sync sessionStorage to localStorage (prefer localStorage)
  if (sessionStorageId && localStorageId && sessionStorageId !== localStorageId) {
    try { sessionStorage.setItem('playerSessionId', localStorageId as string) } catch { /* ignore */ }
    console.debug('WaitingRoom: synced sessionStorage.playerSessionId to localStorage.currentSessionId', { sessionStorageId, localStorageId })
  }
  const [message, setMessage] = useState('Wacht tot het spel start')
  const [started, setStarted] = useState(false)
  const navigate = useNavigate()

  // helper to enter the game page when an activeGame is announced
  const enterGame = useCallback((details: { sessionId?: string; gameName?: string; day?: string; category?: string } | null) => {
    if (!details) return
    // ensure this is for our session
    if (details.sessionId && sessionId && details.sessionId !== sessionId) return
    try {
      sessionStorage.setItem('playerActiveGame', JSON.stringify(details))
    } catch (err) { void err }
    // navigate to a dedicated player game page (route should exist) or fallback to /player/game
    try {
      navigate('/player/game')
    } catch (err) { void err }
  }, [navigate, sessionId])

  // on mount check if there's already an active game (player joining late)
  useEffect(() => {
    try {
      // support both keys: older 'activeGame' and organizer's 'activeGameInfo'
      const rawInfo = localStorage.getItem('activeGameInfo') || localStorage.getItem('activeGame')
      if (rawInfo) {
        const mapped = mapActiveInfo(rawInfo)
        if (mapped) enterGame(mapped)
      }
    } catch (err) { void err }

    // listen for storage events from organizer when they start a game
    function onStorage(e: StorageEvent) {
      // handle explicit kick keys like 'kick_123' or 'kick_001'
      try {
        if (e.key && e.key.startsWith('kick_')) {
          const kicked = e.key.slice(5) // the player number part
          const plain = String(playerNumber)
          const padded = String(playerNumber).padStart(3,'0')
          if (kicked === plain || kicked === padded) {
            // organizer explicitly kicked this player
            try { sessionStorage.removeItem('playerNumber') } catch { /* ignore */ }
            try { sessionStorage.removeItem('playerSessionId') } catch { /* ignore */ }
            try { sessionStorage.removeItem('playerActiveGame') } catch { /* ignore */ }
            try { localStorage.removeItem('currentSessionId') } catch { /* ignore */ }
            try { navigate('/') } catch { /* ignore */ }
            return
          }
        }
      } catch { /* ignore */ }

      if (e.key === 'onlinePlayers' || e.key === 'onlinePlayers_last_update') {
        try {
          // when the transient timestamp key is written, e.newValue will be a timestamp string;
          // in that case read the canonical onlinePlayers value from localStorage. Otherwise use newValue.
          const raw = (e.key === 'onlinePlayers') ? (e.newValue ?? localStorage.getItem('onlinePlayers')) : localStorage.getItem('onlinePlayers')
          const arr = raw ? JSON.parse(String(raw)) as string[] : []
          const padded = String(playerNumber).padStart(3,'0')
          const plain = String(playerNumber)
          const exists = Array.isArray(arr) && (arr.includes(plain) || arr.includes(padded))
          if (!exists) {
            // player was removed by organizer; force logout
            try { sessionStorage.removeItem('playerNumber') } catch { /* ignore */ }
            try { sessionStorage.removeItem('playerSessionId') } catch { /* ignore */ }
            try { sessionStorage.removeItem('playerActiveGame') } catch { /* ignore */ }
            try { localStorage.removeItem('currentSessionId') } catch { /* ignore */ }
            try { navigate('/') } catch { /* ignore */ }
          }
        } catch { /* ignore */ }
      }
      if (e.key === 'currentSessionId') {
        // session ended/cleared by organizer on another tab
        if (e.newValue === null) {
          try { sessionStorage.removeItem('playerActiveGame') } catch (err) { void err }
          try { sessionStorage.removeItem('playerNumber') } catch (err) { void err }
          try { sessionStorage.removeItem('playerSessionId') } catch (err) { void err }
          // remove this player from onlinePlayers
          try {
            const raw = localStorage.getItem('onlinePlayers')
            const arr = raw ? JSON.parse(raw) as string[] : []
            const plain = String(playerNumber || '')
            const padded = String(playerNumber || '').padStart(3, '0')
            const filtered = Array.isArray(arr) ? arr.filter(x => (String(x) !== plain && String(x) !== padded)) : []
            localStorage.setItem('onlinePlayers', JSON.stringify(filtered))
            // notify other tabs about the change
            window.dispatchEvent(new StorageEvent('storage', { key: 'onlinePlayers', newValue: JSON.stringify(filtered) }))
          } catch { /* ignore */ }
          try { navigate('/') } catch (err) { void err }
        }
        return
      }
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
          const mapped = mapActiveInfo(val)
          if (mapped) enterGame(mapped)
        } catch (err) { void err }
      }
    }

    // same-tab fallback: some browsers don't fire storage events in same window
    function onCustom(ev: Event) {
      try {
        const ce = ev as CustomEvent
        const details = ce.detail
        if (!details) {
          // cleared
          try { sessionStorage.removeItem('playerActiveGame') } catch (err) { void err }
          try { navigate('/player/waiting') } catch (err) { void err }
          return
        }
        const mapped = mapActiveInfo(details)
        if (mapped) enterGame(mapped)
      } catch (err) { void err }
    }

    window.addEventListener('storage', onStorage)
    window.addEventListener('activeGameInfoChanged', onCustom)
    return () => {
      try { window.removeEventListener('storage', onStorage) } catch (err) { void err }
      try { window.removeEventListener('activeGameInfoChanged', onCustom) } catch (err) { void err }
    }
  }, [enterGame, navigate, playerNumber])

  // CSS for animated stars
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

  // register this player as online in localStorage so organizer can see status
  useEffect(() => {
    if (!playerNumber) return
    try {
      // store the playerNumber as a 3-digit padded string for consistency
      const padded = String(playerNumber).padStart(3, '0')
      const raw = localStorage.getItem('onlinePlayers')
      const parsed = raw ? JSON.parse(raw) as unknown : []
      const arr = Array.isArray(parsed) ? parsed as string[] : []
      // normalize existing entries to padded form to avoid duplicates and mismatches
      const normalized = arr.map(x => String(x).padStart(3, '0'))
      const hasStored = normalized.includes(padded)
      if (!hasStored) {
        const next = [...normalized, padded]
        localStorage.setItem('onlinePlayers', JSON.stringify(next))
        // notify other tabs (some browsers don't fire storage for same-tab writes)
        try { window.dispatchEvent(new StorageEvent('storage', { key: 'onlinePlayers', newValue: JSON.stringify(next) })) } catch { /* ignore */ }
      }
    } catch {
      try { localStorage.setItem('onlinePlayers', JSON.stringify([String(playerNumber).padStart(3,'0')])) } catch { /* ignore */ }
    }

    const cleanup = () => {
      try {
        const raw2 = localStorage.getItem('onlinePlayers')
        const arr2 = raw2 ? JSON.parse(raw2) as string[] : []
        const padded = String(playerNumber).padStart(3,'0')
        const normalized2 = arr2.map(x => String(x).padStart(3,'0'))
        const filtered = Array.isArray(normalized2) ? normalized2.filter(x => (String(x) !== padded)) : []
        localStorage.setItem('onlinePlayers', JSON.stringify(filtered))
        try { window.dispatchEvent(new StorageEvent('storage', { key: 'onlinePlayers', newValue: JSON.stringify(filtered) })) } catch { /* ignore */ }
      } catch { /* ignore */ }
    }

    // Remove player only when the browser/tab is closed (beforeunload).
    // Do NOT remove the player on component unmount so the online status persists
    // when the player navigates within the SPA (e.g. to /player/game).
    window.addEventListener('beforeunload', cleanup)
    return () => { try { window.removeEventListener('beforeunload', cleanup) } catch { /* ignore */ } }
  }, [playerNumber])

  // Periodically re-check localStorage.onlinePlayers so the waiting-room tab reacts
  // immediately when the organizer removes the player (even if a storage event
  // didn't arrive). This avoids requiring a manual refresh.
  useEffect(() => {
    if (!playerNumber) return
    const intervalMs = 2000 // check every 2s
    const check = () => {
      try {
        const raw = localStorage.getItem('onlinePlayers')
        const arr = raw ? JSON.parse(raw) as string[] : []
        const padded = String(playerNumber).padStart(3, '0')
        const plain = String(playerNumber)
        // consider existence if either plain or padded present, or after normalizing entries
        const exists = Array.isArray(arr) && (arr.includes(plain) || arr.includes(padded) || arr.map(x => String(x).padStart(3,'0')).includes(padded))
        if (!exists) {
          // force logout locally
          try { sessionStorage.removeItem('playerNumber') } catch { /* ignore */ }
          try { sessionStorage.removeItem('playerSessionId') } catch { /* ignore */ }
          try { sessionStorage.removeItem('playerActiveGame') } catch { /* ignore */ }
          try { localStorage.removeItem('currentSessionId') } catch { /* ignore */ }
          try { navigate('/') } catch { /* ignore */ }
        }
      } catch { /* ignore parse errors */ }
    }
    const id = window.setInterval(check, intervalMs)
    // run immediate check once (don't wait interval)
    check()
    return () => clearInterval(id)
  }, [playerNumber, navigate])

  useEffect(() => {
    let mounted = true
    let timer: number | undefined
    async function poll() {
      if (!sessionId) return
      try {
        const res = await fetchLeaderboard(sessionId)
        const list = res.leaderboard || []
        if (!mounted) return
        if (list.length > 0) {
          setStarted(true)
          setMessage('Welkom in de sessie, wacht tot de begeleider het spel start')
          // if organizer started a game and also wrote activeGame to localStorage, enter it
          try {
            const rawInfo = localStorage.getItem('activeGameInfo') || localStorage.getItem('activeGame')
            if (rawInfo) {
              const mapped = mapActiveInfo(rawInfo)
              if (mapped) enterGame(mapped)
            } else {
              // no local activeGameInfo persisted (e.g. different device). Ask server for authoritative activeGameInfo
              try {
                const sid = sessionId
                if (sid) {
                  const serverResp = await getActiveGameInfo(sid)
                  if (serverResp && serverResp.activeGameInfo) {
                    const info = serverResp.activeGameInfo
                    try { localStorage.setItem('activeGameInfo', JSON.stringify(info)) } catch (err) { void err }
                    try { window.dispatchEvent(new CustomEvent('activeGameInfoChanged', { detail: info })) } catch (err) { void err }
                    const mapped = mapActiveInfo(info)
                    if (mapped) enterGame(mapped)
                  } else if (serverResp && (serverResp.activeGameInfo === null || typeof serverResp.activeGameInfo === 'undefined')) {
                    // server explicitly cleared the active game; ensure local clients remove it too
                    try { localStorage.removeItem('activeGameInfo') } catch (err) { void err }
                    try { window.dispatchEvent(new CustomEvent('activeGameInfoChanged', { detail: null })) } catch (err) { void err }
                    try { window.dispatchEvent(new StorageEvent('storage', { key: 'activeGameInfo', newValue: null })) } catch { /* ignore */ }
                    try { sessionStorage.removeItem('playerActiveGame') } catch (err) { void err }
                    try { navigate('/player/waiting') } catch (err) { void err }
                  }
                }
              } catch (err) { void err }
            }
          } catch (err) { void err }
        } else {
          setStarted(false)
          setMessage('Wacht tot het spel start')
        }
      } catch (err) {
        console.warn('polling leaderboard failed', err)
      } finally {
        timer = window.setTimeout(poll, 5000)
      }
    }
    poll()
    return () => { mounted = false; if (timer) clearTimeout(timer) }
  }, [sessionId, enterGame, navigate])

  if (!sessionId || !playerNumber) {
    return (
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
                <h1 style={{ padding: 8 }}>Geen sessie of spelergegevens gevonden</h1>
                <p style={{ marginTop: 8, color: '#444' }}>Ga terug naar de startpagina om opnieuw in te loggen</p>
                <div style={{ marginTop: 18 }}>
                  <button onClick={() => navigate('/')} className="cta" style={{ width: 220 }}>Terug naar home</button>
                </div>

                {/* animated stars while on waiting page (even in the no-session fallback we show them) */}
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
    )
  }

  return (
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
            <div className="hero-inner">
              {/* Title and subtitle like HomePage */}
              <h1 style={{ padding: 25, fontSize: 40 }}>Maak je klaar!</h1>
              <p style={{ marginTop: 6, color: '#666', fontSize: 16  }}>De sessie start zo meteen. Wacht tot je begeleider het spel start.</p>

              {/* animated stars */}
              <div style={{ marginTop: 18, display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center' }} aria-hidden>
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

              {/* status message */}
              <div style={{ marginTop: 16, fontSize: 16, color: started ? '#27ae60' : '#444' }}>{message}</div>

            </div>
          </div>

          <div className="grid-bottom-right">
            <img src={StarImg} alt="Star decoration" className="grid-img" />
          </div>
        </div>
      </main>
    </>
  )
}
