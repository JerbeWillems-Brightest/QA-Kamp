import React, { useCallback, useEffect, useRef, useState } from 'react'
import type { ApiPlayer } from '../../../api'
import './PrinterSlaatOpHolGame.css'
import printerBg from '../../../assets/PrinterBackground.png'

// debug: resolve the background URL reliably. Prefer the imported value but fall back to import.meta.url
let resolvedBgUrl: string | undefined = undefined
try {
  if (printerBg) resolvedBgUrl = String(printerBg)
  else if (typeof import.meta !== 'undefined') {
    // resolve relative to this module path
    try { resolvedBgUrl = new URL('../../../assets/PrinterBackground.png', import.meta.url).href } catch { void 0 }
  }
} catch { /* ignore */ }
try { if (typeof console !== 'undefined' && console && console.log) console.log('PrinterBackground resolved URL:', resolvedBgUrl) } catch { /* ignore */ }

const bgStyle = resolvedBgUrl ? { backgroundImage: `url(${resolvedBgUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' } : undefined

type AgeGroup = '8-10' | '11-13' | '14-16'

interface EndResults { score: number; timeMs: number; mistakes: number }
interface Props { ageGroup?: AgeGroup; onEnd?: (results: EndResults) => void }

type Item = { id:number; text:string; x:number; y:number; isOdd?:boolean }

const GRID_BY_AGE: Record<AgeGroup, number> = { '8-10': 3, '11-13': 4, '14-16': 5 }

export default function PrinterSlaatOpHolGame({ ageGroup, onEnd }: Props) {
  const [running, setRunning] = useState(false)
  const [showTutorial, setShowTutorial] = useState(true)
  const [showIntro, setShowIntro] = useState(true)
  const [round, setRound] = useState(0)
  const [score, setScore] = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const [items, setItems] = useState<Item[]>([])
  const [elapsedMs, setElapsedMs] = useState(0)
  // start a bit larger so grid appears larger on first render
  const [cellSize, setCellSize] = useState<number>(100)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [shouldFinishAfterTransition, setShouldFinishAfterTransition] = useState(false)
  const [isEntering, setIsEntering] = useState(false)
  const [showEnd, setShowEnd] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const hintAutoShownRef = useRef(false)
  const startRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)
  const gameContentRef = useRef<HTMLDivElement | null>(null)
  const fwCanvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    if (running) {
      if (startRef.current == null) startRef.current = Date.now()
      const loop = () => { setElapsedMs(Date.now() - (startRef.current || Date.now())); rafRef.current = requestAnimationFrame(loop) }
      rafRef.current = requestAnimationFrame(loop)
      return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); rafRef.current = null }
    }
  }, [running])

  const formatMs = useCallback((ms: number) => { const s = Math.floor(ms/1000); return `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}` }, [])

  const randomBaseText = useCallback(() => {
    const words = ['A','B','C','D','E','F','G','H','I','J','K','L']
    return words[Math.floor(Math.random() * words.length)]
  }, [])

  const generateOdd = useCallback((base: string, age: AgeGroup) => {
    if (age === '8-10') return base + '!' // obvious
    if (age === '11-13') return base.split('').reverse().join('') // subtle
    return base + (Math.random() > 0.5 ? '1' : '0') // abstract
  }, [])

  // Normalize/derive ageGroup using the same priority as PasswordZapper:
  // sessionStorage.playerCategory -> prop ageGroup -> URL ?age= param -> default '11-13'
  function inferAgeGroupFromString(s: string | null | undefined): AgeGroup {
    const raw = String(s || '').toLowerCase()
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
    } catch { /* fall through */ }
    return '11-13'
  }

  const sessionCat = (typeof window !== 'undefined') ? sessionStorage.getItem('playerCategory') : null
  const urlAge = (typeof window !== 'undefined') ? new URLSearchParams(window.location.search || '').get('age') : null
  const candidatePriority = sessionCat || (ageGroup as string | null) || urlAge || null
  const effectiveAge: AgeGroup = inferAgeGroupFromString(candidatePriority)

  const nextRound = useCallback(() => {
    const grid = GRID_BY_AGE[effectiveAge]
    const total = grid * grid
    const baseText = randomBaseText()
    const nextItems: Item[] = []
    const oddIndex = Math.floor(Math.random() * total)
    for (let i = 0; i < total; i++) {
      const isOdd = i === oddIndex
      nextItems.push({ id: i + 1, text: isOdd ? generateOdd(baseText, effectiveAge) : baseText, x: (i % grid), y: Math.floor(i / grid), isOdd })
    }
    setItems(nextItems)
    // trigger enter animation for the fresh sheet
    setIsEntering(true)
  }, [effectiveAge, randomBaseText, generateOdd])

  // grid size based on age group (used for layout)
  const grid = GRID_BY_AGE[effectiveAge] || 4

  // compute cell size so the entire grid fits within the available game content area
  useEffect(() => {
    function computeSize() {
      const gap = 12 // same as CSS gap used
      const minCell = 48
      // allow larger maximum cell so grid scales up on larger sheets
      const maxCell = 200
      const content = gameContentRef.current
      if (!content) return
      const rect = content.getBoundingClientRect()
      // subtract some vertical space for header/controls inside game-content (slightly reduced)
      const reservedVertical = 60
      const availableWidth = Math.max(120, rect.width)
      const availableHeight = Math.max(120, rect.height - reservedVertical)
      const cellByWidth = Math.floor((availableWidth - gap * (grid - 1)) / grid)
      const cellByHeight = Math.floor((availableHeight - gap * (grid - 1)) / grid)
      let size = Math.max(minCell, Math.min(cellByWidth, cellByHeight))
      size = Math.min(maxCell, size)
      setCellSize(size)
    }
    computeSize()
    window.addEventListener('resize', computeSize)
    const ro = new ResizeObserver(() => computeSize())
    if (gameContentRef.current) ro.observe(gameContentRef.current)
    return () => { window.removeEventListener('resize', computeSize); ro.disconnect() }
  }, [grid])

  const startGame = useCallback(() => {
    setShowTutorial(false)
    setRunning(true)
    // start with round 0 so progress shows 0/10 until the player acts
    setRound(0)
    setScore(0)
    setMistakes(0)
    startRef.current = Date.now()
    // schedule next round to avoid impure work during render
    setTimeout(() => nextRound(), 0)
  }, [nextRound])

  const finish = useCallback(() => {
    setRunning(false)
    setShowEnd(true)
    try { if (onEnd) onEnd({ score, timeMs: elapsedMs, mistakes }) } catch { /* ignore */ }
  }, [onEnd, score, elapsedMs, mistakes])

  const resetGame = useCallback(() => {
    // reset counters and start over
    setShowEnd(false)
    setRound(0)
    setScore(0)
    setMistakes(0)
    setItems([])
    setRunning(true)
    setIsTransitioning(false)
    setShouldFinishAfterTransition(false)
    startRef.current = Date.now()
    setTimeout(() => nextRound(), 0)
  }, [nextRound])

  const handleClick = useCallback((item: Item) => {
    if (!running || isTransitioning) return
    if (item.isOdd) {
      setScore(s => s + 2)
      // increment round count and then determine if we've reached the last round
      const next = round + 1
      setRound(next)
      const TOTAL_ROUNDS = 20
      const willFinish = next >= TOTAL_ROUNDS
      setShouldFinishAfterTransition(willFinish)
      // trigger sheet fly-out animation; nextRound or finish will be called after animation ends
      setIsTransitioning(true)
      // ensure we don't call nextRound here - animationend handler will do that
    } else {
      setMistakes(m => m + 1)
      setScore(s => Math.max(0, s - 1))
    }
  }, [running, round, isTransitioning])

  // called when the top sheet finished flying out
  const handleSheetAnimationEnd = useCallback((e?: React.AnimationEvent<HTMLDivElement>) => {
    // Determine which animation ended via animationName (enter or fly)
    const name = e?.nativeEvent && (e.nativeEvent as AnimationEvent).animationName ? String((e.nativeEvent as AnimationEvent).animationName) : undefined
    if (name === 'pz-sheet-enter') {
      // entering finished; clear entering state
      setIsEntering(false)
      return
    }
    if (name === 'pz-sheet-fly' || !name) {
      // fly-out finished
      if (!isTransitioning) return
      setIsTransitioning(false)
      if (shouldFinishAfterTransition) {
        finish()
      } else {
        // start the next sheet (this sets isEntering true)
        nextRound()
      }
    }
  }, [isTransitioning, shouldFinishAfterTransition, finish, nextRound])

  // Fireworks canvas: initialize when end screen is shown (reuse PasswordZapper fireworks)
  useEffect(() => {
    if (!showEnd) return
    let cleanup: (() => void) | null = null
    ;(async () => {
      try {
        const mod = await import('../PasswordZapper/passwordZapperFireworks')
        const canvasEl = fwCanvasRef.current
        if (!canvasEl) return
        const maybeInit = (mod as unknown) as { default?: unknown }
        if (typeof maybeInit.default === 'function') {
          cleanup = (maybeInit.default as (c: HTMLCanvasElement) => (() => void))(canvasEl)
        }
      } catch { /* ignore */ }
    })()
    return () => { try { if (cleanup) cleanup() } catch { /* ignore */ } }
  }, [showEnd])

  // Persist player's highscore when the end screen is shown so the organiser
  // scoreboard can pick it up. Mirrors the behavior in PasswordZapper.
  useEffect(() => {
    if (!showEnd) return
    ;(async () => {
      try {
        const localKey = 'pz-highscore_printerslaatophol'
        // Update local stored highscore (keep max)
        try {
          const existingRaw = localStorage.getItem(localKey)
          const existingNum = existingRaw ? (Number(existingRaw) || 0) : 0
          const finalHigh = Math.max(existingNum || 0, score)
          localStorage.setItem(localKey, String(finalHigh))
        } catch { /* ignore localStorage errors */ }

        // Attempt to persist to backend so organiser's leaderboard shows the player
        const playerNumberRaw = sessionStorage.getItem('playerNumber') || ''
        const sessionStorageId = sessionStorage.getItem('playerSessionId')
        const localStorageId = localStorage.getItem('currentSessionId')
        const sid = (sessionStorageId && sessionStorageId !== 'null') ? sessionStorageId : (localStorageId ?? '')
        if (!sid || !playerNumberRaw) return

        const normalizedPlayerNumber = String((playerNumberRaw || '').toString().replace(/\D/g, '')).padStart(3, '0')

        try {
          const api = await import('../../../api')
          // Read existing player entry to avoid overwriting a higher score
          let shouldUpdate = true
          let foundCategory: string | undefined = undefined
          let found: Record<string, unknown> | undefined = undefined
            try {
              // Use raw players API so we can read game-specific highscore fields
              const pResp = await api.fetchPlayersRawForSession(sid)
              const respTyped = pResp as { players?: unknown[] } | null
              const list = Array.isArray(respTyped?.players) ? (respTyped!.players as Record<string, unknown>[]) : []
              found = list.find((p) => {
                const pn = String(p['playerNumber'] ?? p['nummer'] ?? '')
                return pn.padStart(3, '0') === normalizedPlayerNumber || pn === normalizedPlayerNumber
              })
              if (found) {
                // The backend may store per-game values either as top-level
                // keys (e.g. `score_printerslaatophol`) or inside the
                // `highscores` object. Accept either location when checking
                // an existing value so we don't overwrite a higher stored
                // highscore.
                let existingGameScore: number | undefined = undefined
                try {
                  if (typeof found['score_printerslaatophol'] === 'number') existingGameScore = Number(found['score_printerslaatophol'])
                } catch { /* ignore */ }
                try {
                  const hs = (found as Record<string, unknown>)['highscores'] as Record<string, unknown> | undefined
                  if (typeof existingGameScore !== 'number' && hs && typeof hs['score_printerslaatophol'] !== 'undefined') {
                    const raw = hs['score_printerslaatophol']
                    const n = typeof raw === 'number' ? raw : (typeof raw === 'string' ? Number(raw) : NaN)
                    if (!Number.isNaN(n)) existingGameScore = Number(n)
                  }
                } catch { /* ignore */ }

                const existingLegacy = (typeof found['score'] === 'number') ? Number(found['score']) : undefined
                const existingScoreVal = typeof existingGameScore === 'number' ? existingGameScore : existingLegacy
                if (typeof existingScoreVal === 'number' && !Number.isNaN(existingScoreVal)) {
                  const existingScoreNum = existingScoreVal as number
                  if (existingScoreNum >= score) shouldUpdate = false
                }
                const catVal = found['category']
                if (typeof catVal === 'string' && catVal) foundCategory = catVal
              }
            } catch (readErr) {
              // On read error, continue with optimistic update; try to read category from sessionStorage
              void readErr
              try { const sessCat = sessionStorage.getItem('playerCategory') || undefined; if (sessCat) foundCategory = sessCat } catch { /* ignore */ }
            }

            if (shouldUpdate) {
            // attempt update, retry once on failure. Store under a game-specific key
            // Also set legacy `score` by aggregating with any existing other-game value
            let otherGame = 0
            try {
              // Sum any top-level score/highscore fields except this game's
              for (const k of Object.keys(found || {})) {
                try {
                  const lk = k.toLowerCase()
                  if (lk.includes('score') || lk.includes('highscore')) {
                    if (lk.includes('printerslaatophol')) continue
                    const raw = (found as Record<string, unknown>)[k]
                    const n = typeof raw === 'number' ? raw : (typeof raw === 'string' ? Number(raw) : NaN)
                    if (!Number.isNaN(n)) otherGame += Number(n)
                  }
                } catch { /* ignore per-key */ }
              }
              // Also include values stored inside the highscores object
              try {
                const hs = (found as Record<string, unknown>)['highscores'] as Record<string, unknown> | undefined
                if (hs && typeof hs === 'object') {
                  for (const k of Object.keys(hs)) {
                    try {
                      if (String(k).toLowerCase().includes('printerslaatophol')) continue
                      const raw = hs[k]
                      const n = typeof raw === 'number' ? raw : (typeof raw === 'string' ? Number(raw) : NaN)
                      if (!Number.isNaN(n)) otherGame += Number(n)
                    } catch { /* ignore per-key */ }
                  }
                }
              } catch { /* ignore highscores */ }
            } catch { /* ignore */ }
            const aggregated = score + (Number.isNaN(otherGame as unknown as number) ? 0 : otherGame)
            // Send both legacy top-level keys and an explicit `highscores` object
            // so the backend will merge the per-game field into the stored
            // `highscores` document reliably.
            const payload: Record<string, unknown> = { score_printerslaatophol: score, score: aggregated, highscores: { score_printerslaatophol: score } }
            if (foundCategory) (payload as Record<string, unknown>)['category'] = foundCategory
            try {
              await api.updatePlayerInSession(sid, normalizedPlayerNumber, payload as unknown as ApiPlayer)
            } catch (err) {
              void err
              // retry once after short delay
              await new Promise((r) => setTimeout(r, 250))
              try { await api.updatePlayerInSession(sid, normalizedPlayerNumber, payload as unknown as ApiPlayer) } catch { /* ignore */ }
            }

            // Notify other tabs/organiser UI quickly via localStorage key
            try {
              const key = 'pz_score_update'
              const payload2 = JSON.stringify({ sessionId: sid, playerNumber: normalizedPlayerNumber, score, ts: Date.now() })
              localStorage.setItem(key, payload2)
              // dispatch storage event for other tabs
              try { window.dispatchEvent(new StorageEvent('storage', { key, newValue: payload2 })) } catch { /* ignore */ }
              // also dispatch a same-tab custom event so in-tab listeners react immediately
              try { window.dispatchEvent(new CustomEvent('pz_score_update', { detail: { sessionId: sid, playerNumber: normalizedPlayerNumber, score, ts: Date.now() } })) } catch { /* ignore */ }
            } catch { /* ignore */ }
          }
        } catch (err) {
          console.warn('PrinterSlaatOpHol: failed to persist score to server', err)
        }
      } catch (err) {
        console.warn('PrinterSlaatOpHol: persist highscore failed', err)
      }
    })()
  }, [showEnd, score])

  // When end screen is open, add a global body class so top-level controls (hint/pause/help)
  // are hidden by global CSS (PasswordZapper uses body.pz-end-open for this).
  useEffect(() => {
    try {
      if (showEnd) document.body.classList.add('pz-end-open')
      else document.body.classList.remove('pz-end-open')
    } catch { /* ignore */ }
    return () => { try { document.body.classList.remove('pz-end-open') } catch { /* ignore */ } }
  }, [showEnd])

  // Listen for external hint requests (from top-level hint button)
  useEffect(() => {
    function onHintRequest() {
      try { setShowHint(true) } catch { /* ignore */ }
    }
    window.addEventListener('minigame:hint', onHintRequest)
    return () => window.removeEventListener('minigame:hint', onHintRequest)
  }, [])

  // Unlock and auto-show hint after 3 mistakes (same for all ages)
  useEffect(() => {
    try {
      if (!hintAutoShownRef.current && mistakes >= 3) {
        hintAutoShownRef.current = true
        // set global transient flag and notify other UI
        try {
          const w = window as unknown as Record<string, unknown>
          w['__pz_hint_unlocked'] = true
          window.dispatchEvent(new CustomEvent('minigame:hint-unlocked'))
        } catch { /* ignore */ }
        // open the hint modal for the player
        setShowHint(true)
      }
    } catch { /* ignore */ }
  }, [mistakes])

  // Show an intro popup first, then the PasswordZapper-style tutorial, then the game
  if (showIntro) {
    return (
      <div
        className="pz-layout printer-root"
        style={{ position: 'fixed', top: 'var(--nav-height)', left: 0, right: 0, bottom: 'calc(var(--footer-height) + var(--bottombar-height))', border: '10px solid #000', boxSizing: 'border-box', background: '#000', zIndex: 900 }}
      >
        {/* blurred background so the popup matches the game's background */}
        <div className="game-area printer-area">
          <div className={`bg-blur ${showTutorial ? 'is-blurred' : 'no-blur'}`} style={bgStyle} />
          {!printerBg && <div style={{position:'absolute', top:8, left:8, zIndex:999, background:'rgba(255,0,0,0.85)', color:'#fff', padding:'6px 8px', borderRadius:4}}>Missing background asset</div>}
        </div>

        <div className="pz-start-overlay">
          <div className="pz-start-modal" onClick={(e) => e.stopPropagation()}>
            <h2>De printer is gek geworden!</h2>
            <ul className="pz-start-bullets" style={{ marginTop: 12, textAlign: 'left' }}>
              <li>De gemene Bug heeft de printer gehackt en nu print hij alleen maar foute papieren!</li>
              <li>De baas mag dit NOOIT zien... Zoek snel de fouten op elk blad en klik ze aan voordat de tijd op is!</li>
            </ul>
            <div style={{ marginTop: 18, textAlign: 'center' }}>
              <button className="pz-start-btn pz-start-btn--large" onClick={() => { setShowIntro(false) }}>Volgende</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (showTutorial) {
    return (
      <div
        className="pz-layout printer-root"
        style={{ position: 'fixed', top: 'var(--nav-height)', left: 0, right: 0, bottom: 'calc(var(--footer-height) + var(--bottombar-height))', border: '10px solid #000', boxSizing: 'border-box', background: '#000', zIndex: 900 }}
      >
        {/* blurred background so the popup matches the game's background */}
        <div className="game-area printer-area">
          <div className={`bg-blur ${showTutorial ? 'is-blurred' : 'no-blur'}`} style={bgStyle} />
          {!printerBg && <div style={{position:'absolute', top:8, left:8, zIndex:999, background:'rgba(255,0,0,0.85)', color:'#fff', padding:'6px 8px', borderRadius:4}}>Missing background asset</div>}
        </div>

        <div className="pz-start-overlay">
          <div className="pz-start-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Speluitleg - Printer slaat op hol!</h2>
            <ul className="pz-start-bullets" style={{ marginTop: 12, textAlign: 'left' }}>
              <li>Op elk blad papier zit één ding dat er niet bij hoort.</li>
              <li>Klik op het ding dat er niet bij hoort om deze weg te halen.</li>
              <li>Klik je op het verkeerde? Dan moet je verder zoeken!</li>
              <li>Je hebt maar 2 minuten de tijd!</li>
              <li>Vind zoveel mogelijk fouten en red het kantoor!</li>
            </ul>
            <div style={{ marginTop: 18, textAlign: 'center' }}>
              <button className="pz-start-btn pz-start-btn--large" onClick={() => { startGame() }}>Volgende</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Hint modal (auto-open after 3 mistakes or from hint button)
  if (showHint) {
    return (
      <div className="pz-layout printer-root" style={{ position: 'fixed', top: 'var(--nav-height)', left: 0, right: 0, bottom: 'calc(var(--footer-height) + var(--bottombar-height))', border: '10px solid #000', boxSizing: 'border-box', background: '#000', zIndex: 900 }}>
        <div className="game-area printer-area">
          <div className={`bg-blur ${showTutorial ? 'is-blurred' : 'no-blur'}`} style={bgStyle} />
        </div>

        <div className="pz-start-overlay">
          <div className="pz-start-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Hint</h2>
            <ul className="pz-start-bullets">
              <li>Zoek naar het item dat niet bij de rest past.</li>
              <li>Klik op het foute item om het blad te laten verdwijnen.</li>
              <li>Je krijgt hulp bij 3 fouten. Daarna kun je de hint-knop gebruiken om deze popup opnieuw te kijken.</li>
            </ul>
            <div style={{ marginTop: 12, textAlign: 'center' }}>
              <button className="pz-start-btn pz-start-btn--large" onClick={() => setShowHint(false)}>Verder spelen</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // End screen (shown after finish) - use PasswordZapper end layout with fireworks
  if (showEnd) {
    // compute simple stats: correct vs wrong
    // Use `round` as the authoritative correct-count (each correct increments round).
    const totalRounds = 20
    const totalCorrect = Math.min(Math.max(0, round), totalRounds)
    const totalWrong = mistakes

    // base percent based on how many rounds were correct (20 -> 100%)
    const basePercent = totalRounds > 0 ? (totalCorrect / totalRounds) * 100 : 0
    // each mistake deducts 2.5% (40 mistakes = 100% deduction)
    const deductionPerMistake = 2.5
    const rawPercent = basePercent - (totalWrong * deductionPerMistake)
    // round up to integer percentage (no decimals) and clamp between 0 and 100
    const roundedUpPercent = Math.ceil(rawPercent)
    const clampedScorePercent = Math.max(0, Math.min(100, roundedUpPercent))
    const starCount = clampedScorePercent === 100 ? 3 : clampedScorePercent >= 66 ? 2 : clampedScorePercent >= 33 ? 1 : 0
    const circleStyle = ({ ['--pz-score-pct' as unknown as string]: `${clampedScorePercent}%` } as unknown) as React.CSSProperties

    return (
      <div className="pz-end">
        <div className="pz-end-box">
          <canvas ref={fwCanvasRef} className="pz-fireworks-canvas" aria-hidden={true} />
          <div className="pz-end-content">
            <div className="pz-end-left">
              <div className="pz-score-circle" aria-hidden style={circleStyle}>
                <div className="pz-score-label">SCORE</div>
                <div className="pz-score-number" id="score">{score}</div>
                <div className="pz-score-percent" id="percentage">{clampedScorePercent}%</div>
                <div className="pz-score-stars" aria-hidden>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <span key={i} className={"pz-star " + (i < starCount ? 'pz-star--filled' : 'pz-star--empty')} aria-hidden>
                      <svg viewBox="0 0 24 24" role="img" aria-hidden="true" focusable="false">
                        <path d="M12 .587l3.668 7.431 8.2 1.193-5.934 5.788 1.402 8.168L12 18.896l-7.336 3.869 1.402-8.168L.132 9.211l8.2-1.193z" />
                      </svg>
                    </span>
                  ))}
                </div>
              </div>

              <div className="pz-stats-row">
                <div className="pz-stats-correct">
                  <div className="shine" aria-hidden></div>
                  <div className="label">Juist</div>
                  <div className="score"><span className="plus">+</span>{totalCorrect}</div>
                </div>
                <div className="pz-stats-wrong">
                  <div className="shine" aria-hidden></div>
                  <div className="label">Fout</div>
                  <div className="score"><span className="minus">-</span>{totalWrong}</div>
                </div>
              </div>
            </div>

            <div className="pz-end-right">
              <div className="pz-tips-card">
                <h3>Goed gedaan!</h3>
                <div className="pz-tips">
                  <p>Score: {score} — Tijd: {formatMs(elapsedMs)} — Fouten: {mistakes}</p>
                </div>
                <div className="pz-end-actions">
                  <button id="btnPlayAgain" className="pz-play-again" onClick={() => { try { window.location.reload(); } catch { resetGame(); } }}>Opnieuw spelen</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="pz-layout printer-root"
      style={{ position: 'fixed', top: 'var(--nav-height)', left: 0, right: 0, bottom: 'calc(var(--footer-height) + var(--bottombar-height))', border: '10px solid #000', boxSizing: 'border-box', background: '#000', zIndex: 900 }}
    >
        {/* Score and progress UI (matches PasswordZapper layout) */}
        { /* totalRounds: same as rounds used in game logic (finish at 10) */ }
        {
          (() => {
            const totalRounds = 20
            const displayed = Math.min(Math.max(0, round), totalRounds)
            const fillPercent = Math.max(0, Math.min(100, Math.round((displayed / totalRounds) * 100)))
            return (
              <>
                <div className="pz-score-stack">
                  <div className="pz-score">{`Score: ${score}`}</div>
                  <div className="pz-score pz-timer">{running ? formatMs(elapsedMs) : '00:00'}</div>
                </div>
                <div className="pz-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={fillPercent}>
                  <div className="pz-progress-fill" style={{ width: `${fillPercent}%` }} />
                  <div className="pz-progress-text">{displayed} / {totalRounds}</div>
                </div>
              </>
            )
          })()
        }

        <div className="game-area printer-area">
        {/* blurred background layer using the printer image */}
        <div className={`bg-blur ${showTutorial ? 'is-blurred' : 'no-blur'}`} style={bgStyle} />
        {!printerBg && <div style={{position:'absolute', top:8, left:8, zIndex:999, background:'rgba(255,0,0,0.85)', color:'#fff', padding:'6px 8px', borderRadius:4}}>Missing background asset</div>}

        {/* game content sits above the blurred background */}
        <div className="game-content" ref={gameContentRef}>

          <div className="sheet-stack" aria-hidden={false}>
            <div className="sheet sheet--back" />
            <div className="sheet sheet--mid" />
            <div className={`sheet sheet--top ${isTransitioning ? 'is-flying' : ''} ${isEntering ? 'is-entering' : ''}`} onAnimationEnd={(e) => { try { handleSheetAnimationEnd(e) } catch { /* ignore */ } }}>
              <div
                className="page"
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${grid}, ${cellSize}px)`,
                  gridAutoRows: `${cellSize}px`,
                  gap: 12,
                  justifyContent: 'center',
                  margin: '18px auto'
                }}
              >
                {items.map(it=> (
                  <div key={it.id} className={`cell ${it.isOdd? 'odd':''}`} onClick={()=>handleClick(it)}>{it.text}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

