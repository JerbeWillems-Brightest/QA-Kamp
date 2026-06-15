import { useEffect, useLayoutEffect, useState, useCallback } from 'react'
import { fetchLeaderboard, getActiveGameInfo, fetchPlayersForSession, fetchOnlinePlayers } from '../../api'
import { useNavigate } from 'react-router-dom'
import LineImg from '../../assets/Line.png'
import RocketImg from '../../assets/Rocketship.png'
import ShapeImg from '../../assets/shape.png'
import CurveImg from '../../assets/curve.png'
import StarImg from '../../assets/Star.png'

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
  if (gameName || day || category || sessionId) return { gameName, day, category, sessionId }
  return null
}

export default function WaitingRoom() {
  const playerNumber = sessionStorage.getItem('playerNumber') || ''
  const sessionStorageId = sessionStorage.getItem('playerSessionId')
  const localStorageId = localStorage.getItem('currentSessionId')
  const sessionId = (sessionStorageId && sessionStorageId !== 'null') ? sessionStorageId : (localStorageId ?? '')
  if (sessionStorageId && localStorageId && sessionStorageId !== localStorageId) {
    try { sessionStorage.setItem('playerSessionId', localStorageId as string) } catch { /* ignore */ }
    console.debug('WaitingRoom: synced sessionStorage.playerSessionId to localStorage.currentSessionId', { sessionStorageId, localStorageId })
  }
  const [message, setMessage] = useState('Wacht tot het spel start')
  const [started, setStarted] = useState(false)
  const [serverOnlineConfirmed, setServerOnlineConfirmed] = useState(false)
  const navigate = useNavigate()

  const enterGame = useCallback((details: { sessionId?: string; gameName?: string; day?: string; category?: string } | null) => {
    if (!details) return
    if (details.sessionId && sessionId && details.sessionId !== sessionId) return
    try {
      sessionStorage.setItem('playerActiveGame', JSON.stringify(details))
    } catch (err) { void err }
    try {
      const rawGame = String(details.gameName ?? '')
      const normalizeKey = (s: string) => s.toLowerCase().normalize('NFKD').replace(/\p{Diacritic}/gu, '').replace(/\s+/g,'').replace(/[^a-z0-9]/g,'')
      const gameKey = normalizeKey(rawGame) || ''
      const rawCat = String(details.category ?? '')
      const mapAge = (a: string) => {
        const r = (a || '').toString().toLowerCase()
        if (/8\D*10/.test(r) || r.includes('8')) return '8-10'
        if (/11\D*13/.test(r) || r.includes('11')) return '11-13'
        if (/14\D*16/.test(r) || r.includes('14')) return '14-16'
        return '11-13'
      }
      const ageParam = encodeURIComponent(mapAge(rawCat))
      const gameParam = encodeURIComponent(gameKey)
      if (gameKey) {
        navigate(`/minigame?game=${gameParam}&age=${ageParam}`)
        return
      }
      navigate('/player/game')
    } catch (err) { void err }
  }, [navigate, sessionId])

  useLayoutEffect(() => {
    try {
      const rawInfo = localStorage.getItem('activeGameInfo') || localStorage.getItem('activeGame')
      if (rawInfo) {
        const mapped = mapActiveInfo(rawInfo)
        if (mapped) enterGame(mapped)
      }
    } catch (err) { void err }

    function onStorage(e: StorageEvent) {
      try {
        if (e.key && e.key.startsWith('kick_')) {
          const kicked = e.key.slice(5) // the player number part
          const plain = String(playerNumber)
          const padded = String(playerNumber).padStart(3,'0')
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
      } catch { /* ignore */ }

      if (e.key === 'onlinePlayers' || e.key === 'onlinePlayers_last_update') {
        try {
          const raw = (e.key === 'onlinePlayers') ? (e.newValue ?? localStorage.getItem('onlinePlayers')) : localStorage.getItem('onlinePlayers')
          const arr = raw ? JSON.parse(String(raw)) as string[] : []
          const padded = String(playerNumber).padStart(3,'0')
          const plain = String(playerNumber)
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
          try { sessionStorage.removeItem('playerActiveGame') } catch (err) { void err }
          try { sessionStorage.removeItem('playerNumber') } catch (err) { void err }
          try { sessionStorage.removeItem('playerSessionId') } catch (err) { void err }
          try { sessionStorage.removeItem('playerOnlineLocked') } catch { /* ignore */ }
          try {
            const raw = localStorage.getItem('onlinePlayers')
            const arr = raw ? JSON.parse(raw) as string[] : []
            const plain = String(playerNumber || '')
            const padded = String(playerNumber || '').padStart(3, '0')
            const filtered = Array.isArray(arr) ? arr.filter(x => (String(x) !== plain && String(x) !== padded)) : []
            localStorage.setItem('onlinePlayers', JSON.stringify(filtered))
            window.dispatchEvent(new StorageEvent('storage', { key: 'onlinePlayers', newValue: JSON.stringify(filtered) }))
          } catch { /* ignore */ }
          try { navigate('/') } catch (err) { void err }
        }
        return
      }
      if (e.key === 'activeGame' || e.key === 'activeGameInfo') {
        try { if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'test') console.log('WaitingRoom.onStorage', { key: e.key, newValue: e.newValue, oldValue: e.oldValue }) } catch { /* ignore */ }
        try {
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

    function onCustom(ev: Event) {
      try {
        const ce = ev as CustomEvent
        const details = ce.detail
        if (!details) {
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

  useEffect(() => {
    if (!playerNumber) return
    const sess = sessionId
    let cancelled = false

    async function markOnline() {
      setServerOnlineConfirmed(false)


      const onlineLocked = (() => {
        try { return sessionStorage.getItem('playerOnlineLocked') === 'true' } catch { return false }
      })()

      let serverOk = false
      if (sess) {
        if (onlineLocked) {
          serverOk = true
        } else {
          try {
            const api = await import('../../api')
            await api.setPlayerOnline(sess, String(playerNumber))

            try { sessionStorage.setItem('playerOnlineLocked', 'true') } catch { /* ignore */ }
            serverOk = true
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err)
            if (/online/i.test(msg) || /al online/i.test(msg) || /already online/i.test(msg)) {

              try { sessionStorage.setItem('playerOnlineLocked', 'true') } catch { /* ignore */ }
              serverOk = true
            } else {
              console.warn('Failed to set player online on server (falling back to localStorage):', err)
            }
          }
        }
      }

      if (cancelled) return


      const storedVal = String(playerNumber)
      const padded = storedVal.padStart(3, '0')

      if (serverOk || !sess) {
        try {
          const raw = localStorage.getItem('onlinePlayers')
          const parsed = raw ? JSON.parse(raw) as unknown : []
          const arr = Array.isArray(parsed) ? parsed as string[] : []
          const hasStored = arr.includes(storedVal) || arr.includes(padded)
          if (!hasStored) {
            const next = [...arr.filter(Boolean), storedVal]
            localStorage.setItem('onlinePlayers', JSON.stringify(next))
            try { window.dispatchEvent(new StorageEvent('storage', { key: 'onlinePlayers', newValue: JSON.stringify(next) })) } catch { /* ignore */ }
          }
        } catch {
          try { localStorage.setItem('onlinePlayers', JSON.stringify([storedVal])) } catch { /* ignore */ }
        }
      }

      if (serverOk || !sess) setServerOnlineConfirmed(true)
    }

    void markOnline()

    const cleanup = () => {
      try {
        const raw2 = localStorage.getItem('onlinePlayers')
        const arr2 = raw2 ? JSON.parse(raw2) as string[] : []
        const plain = String(playerNumber)
        const padded = plain.padStart(3, '0')
        const filtered = Array.isArray(arr2) ? arr2.filter(x => (String(x) !== plain && String(x) !== padded)) : []
        localStorage.setItem('onlinePlayers', JSON.stringify(filtered))
        try { window.dispatchEvent(new StorageEvent('storage', { key: 'onlinePlayers', newValue: JSON.stringify(filtered) })) } catch { /* ignore */ }
      } catch { /* ignore */ }

      try {
        const sid = sessionId
        if (sid) {
          void import('../../api').then(m => m.setPlayerOffline(sid, String(playerNumber))).catch(() => {})
        }
      } catch { /* ignore */ }
    }


    window.addEventListener('beforeunload', cleanup)
    return () => {
      cancelled = true
      try { window.removeEventListener('beforeunload', cleanup) } catch { /* ignore */ }
    }
  }, [playerNumber, sessionId, navigate])

  useEffect(() => {
    if (!sessionId || !playerNumber) return
    if (!serverOnlineConfirmed) return

    let cancelled = false

    async function syncOnlinePlayers() {
      try {
        const resp = await fetchOnlinePlayers(sessionId)
        const list = (resp.onlinePlayers || []).map(p => String(p.playerNumber).padStart(3, '0'))


        const raw = localStorage.getItem('onlinePlayers')
        let cur: string[]
        try {
          cur = raw ? (JSON.parse(raw) as string[]) : []
        } catch {
          cur = []
        }

        const same = Array.isArray(cur) && cur.length === list.length && cur.every((v, i) => String(v) === String(list[i]))
        if (!same) {
          localStorage.setItem('onlinePlayers', JSON.stringify(list))
          try { localStorage.setItem('onlinePlayers_last_update', String(Date.now())) } catch { /* ignore */ }
          try { window.dispatchEvent(new StorageEvent('storage', { key: 'onlinePlayers', newValue: JSON.stringify(list) })) } catch { /* ignore */ }
        }
      } catch {
        // ignore sync errors; next tick may succeed
      }
    }

    void syncOnlinePlayers()
    const id = window.setInterval(() => {
      if (cancelled) return
      void syncOnlinePlayers()
    }, 5000)

    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [sessionId, playerNumber, serverOnlineConfirmed])

  useEffect(() => {
    if (!playerNumber) return

    if (sessionId && !serverOnlineConfirmed) return
    const intervalMs = 2000 // check every 2s
    const check = () => {
      try {
        const raw = localStorage.getItem('onlinePlayers')
        const arr = raw ? JSON.parse(raw) as string[] : []
        const padded = String(playerNumber).padStart(3, '0')
        const plain = String(playerNumber)
        const exists = Array.isArray(arr) && (arr.includes(plain) || arr.includes(padded) || arr.map(x => String(x).padStart(3,'0')).includes(padded))
        if (!exists) {
          try { sessionStorage.removeItem('playerNumber') } catch { /* ignore */ }
          try { sessionStorage.removeItem('playerSessionId') } catch { /* ignore */ }
          try { sessionStorage.removeItem('playerActiveGame') } catch { /* ignore */ }
          try { sessionStorage.removeItem('playerOnlineLocked') } catch { /* ignore */ }
          try { localStorage.removeItem('currentSessionId') } catch { /* ignore */ }
          try { navigate('/') } catch { /* ignore */ }
        }
      } catch { /* ignore parse errors */ }
    }
    const id = window.setInterval(check, intervalMs)
    check()
    return () => clearInterval(id)
  }, [playerNumber, navigate, sessionId, serverOnlineConfirmed])

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
          try {
            const rawInfo = localStorage.getItem('activeGameInfo') || localStorage.getItem('activeGame')
            if (rawInfo) {
              const mapped = mapActiveInfo(rawInfo)
              if (mapped) enterGame(mapped)
            } else {
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
          try {
            const playersResp = await fetchPlayersForSession(sessionId)
            const playersList = (playersResp && (playersResp as { players?: unknown[] }).players) || []
            const plain = String(playerNumber)
            const padded = plain.padStart(3, '0')
            const exists = Array.isArray(playersList) && playersList.some((p: unknown) => {
              const rec = p as Record<string, unknown>
              const pn = rec['playerNumber'] ?? rec['nummer'] ?? ''
              const s = String(pn)
              return s === plain || s === padded || s.padStart(3,'0') === padded
            })
            if (!exists) {
              try { sessionStorage.removeItem('playerNumber') } catch { /* ignore */ }
              try { sessionStorage.removeItem('playerSessionId') } catch { /* ignore */ }
              try { sessionStorage.removeItem('playerActiveGame') } catch { /* ignore */ }
              try { sessionStorage.removeItem('playerOnlineLocked') } catch { /* ignore */ }
              try { localStorage.removeItem('currentSessionId') } catch { /* ignore */ }
              try { navigate('/') } catch { /* ignore */ }
            } else {
              setStarted(false)
              setMessage('Wacht tot het spel start')
            }
          } catch {
            try { sessionStorage.removeItem('playerNumber') } catch { /* ignore */ }
            try { sessionStorage.removeItem('playerSessionId') } catch { /* ignore */ }
            try { sessionStorage.removeItem('playerActiveGame') } catch { /* ignore */ }
            try { sessionStorage.removeItem('playerOnlineLocked') } catch { /* ignore */ }
            try { localStorage.removeItem('currentSessionId') } catch { /* ignore */ }
              try {
                  localStorage.removeItem('onlinePlayers')
              }
              catch {
                  /* ignore */
              }
            try { navigate('/') } catch { /* ignore */ }
          }
        }
      } catch (err) {
        console.warn('polling leaderboard failed', err)
      } finally {
        timer = window.setTimeout(poll, 5000)
      }
    }
    poll()
    return () => { mounted = false; if (timer) clearTimeout(timer) }
  }, [sessionId, enterGame, navigate, playerNumber])

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
