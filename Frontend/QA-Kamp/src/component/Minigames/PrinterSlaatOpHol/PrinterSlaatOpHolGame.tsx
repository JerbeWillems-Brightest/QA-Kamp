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

const GOOD_FEEDBACK_LIST = ['Goed!', 'Top!', 'Nice!', 'Super!']
const BAD_FEEDBACK_LIST = ['Fout!', 'Helaas!', 'Probeer opnieuw']

type AgeGroup = '8-10' | '11-13' | '14-16'

interface EndResults { score: number; timeMs: number; mistakes: number }
interface Props { ageGroup?: AgeGroup; onEnd?: (results: EndResults) => void; networkKey?: string }

type Item = { id:number; text?:string; icon?: string; x:number; y:number; isOdd?:boolean }

const GRID_BY_AGE: Record<AgeGroup, number> = { '8-10': 3, '11-13': 4, '14-16': 5 }

export default function PrinterSlaatOpHolGame({ ageGroup, onEnd, networkKey }: Props) {
  // accept an optional networkKey prop (from ?key= in URL) so player and
  // organiser on separate devices can pair. If provided, persist it to
  // sessionStorage.playerActiveGame (merge with existing) so other parts of
  // the app that read sessionStorage see the join key.
  useEffect(() => {
    try {
      if (!networkKey) return
      const raw = sessionStorage.getItem('playerActiveGame')
      let obj: Record<string, unknown> = raw ? JSON.parse(raw) as Record<string, unknown> : {}
      if (!obj || typeof obj !== 'object') obj = {}
      // do not overwrite existing key unless explicitly provided
      if (obj.key !== networkKey) obj.key = networkKey
      try { sessionStorage.setItem('playerActiveGame', JSON.stringify(obj)) } catch { /* ignore */ }
    } catch { /* ignore */ }
  }, [networkKey])
  const [running, setRunning] = useState(false)
  const [showTutorial, setShowTutorial] = useState(true)
  const [showIntro, setShowIntro] = useState(true)
  const [round, setRound] = useState(0)
  // score is computed from total elapsed time at the end (0-100). Do not
  // keep incremental score state during play; compute on demand.
  const [mistakes, setMistakes] = useState(0)
  const [items, setItems] = useState<Item[]>([])
  const [elapsedMs, setElapsedMs] = useState(0)
  // start a bit larger so grid appears larger on first render
  // start smaller so the grid is more compact by default
  // start noticeably larger so the grid appears bigger on first render
  const [cellSize, setCellSize] = useState<number>(96)
  // gap between cells (kept in state so render uses same value as computeSize)
  // slightly increased default gap to keep larger cells visually separated
  const [cellGap, setCellGap] = useState<number>(10)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [shouldFinishAfterTransition, setShouldFinishAfterTransition] = useState(false)
  const [isEntering, setIsEntering] = useState(false)
  const [showEnd, setShowEnd] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [paused, setPaused] = useState(false)
  const [highScore, setHighScore] = useState<number | null>(null)
  const [isNewHigh, setIsNewHigh] = useState(false)
  const [stoppedByUser, setStoppedByUser] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [feedbackType, setFeedbackType] = useState<'good' | 'bad' | null>(null)
  // Per-round status for cells: only 'bad' (wrong clicked) is kept; green/good coloring removed
  const [cellStatuses, setCellStatuses] = useState<Record<number, 'bad'>>({})
  // Feedback specifically shown under the timer (e.g. "+10s" on mistakes)
  const [timeFeedback, setTimeFeedback] = useState<string | null>(null)
  const [timeFeedbackType, setTimeFeedbackType] = useState<'good' | 'bad' | null>(null)
  const hintAutoShownRef = useRef(false)
  // ...existing code... (removed penalty schedule refs)
  const startRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)
  const gameContentRef = useRef<HTMLDivElement | null>(null)
  const fwCanvasRef = useRef<HTMLCanvasElement | null>(null)
  // track used 'cores' (logical icon groups) during the current playthrough; cleared on end
  const usedCoresRef = useRef<Set<string>>(new Set())

  // When end screen is shown, clear the used cores so a new playthrough can reuse icons
  useEffect(() => {
    try { if (showEnd) usedCoresRef.current.clear() } catch { /* ignore */ }
  }, [showEnd])

  useEffect(() => {
    if (running) {
      if (startRef.current == null) startRef.current = Date.now()
      const loop = () => { setElapsedMs(Date.now() - (startRef.current || Date.now())); rafRef.current = requestAnimationFrame(loop) }
      rafRef.current = requestAnimationFrame(loop)
      return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); rafRef.current = null }
    }
  }, [running])

  const formatMs = useCallback((ms: number) => { const s = Math.floor(ms/1000); return `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}` }, [])

  const randomFrom = useCallback((arr: string[]) => arr[Math.floor(Math.random() * arr.length)], [])

  // Compute final time-based score (0-100) according to user story.
  // 0:00–2:00 => 100, 2:00–2:30 => 90, then every 30s after 2:30 -10 until 0.
  const computeTimeScore = useCallback((ms: number) => {
    const s = Math.floor(ms / 1000)
    if (s <= 120) return 100
    if (s <= 150) return 90
    // after 150s (2:30) every 30s -> -10 points
    const bucketsAfter = Math.floor((s - 150) / 30) // 0..n
    const score = 90 - (bucketsAfter + 1) * 10
    return Math.max(0, Math.min(100, score))
  }, [])

  // Load SVG assets using Vite's import.meta.glob at runtime. Using `any` here
  // because TypeScript's built-in typing for import.meta.glob varies by
  // environment. These calls return an object mapping file paths to URL strings.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const baseModules = (import.meta as any).glob('../../../assets/iconsPrinterSlaatOpHol/BaseIcons/*.svg', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wrong810Modules = (import.meta as any).glob('../../../assets/iconsPrinterSlaatOpHol/Wrong810/*.svg', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wrong1113Modules = (import.meta as any).glob('../../../assets/iconsPrinterSlaatOpHol/Wrong1113/*.svg', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const base1416Modules = (import.meta as any).glob('../../../assets/iconsPrinterSlaatOpHol/BaseIcons1416/*.svg', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wrong1416Modules = (import.meta as any).glob('../../../assets/iconsPrinterSlaatOpHol/Wrong1416/*.svg', { eager: true, query: '?url', import: 'default' }) as Record<string, string>

  const buildCoreMap = useCallback((modules: Record<string, string>, stripPrefixes?: string[]) => {
    const m: Record<string, string> = {}
    for (const p of Object.keys(modules)) {
      const base = p.split('/').pop() || p
      let core = base.replace(/\.[^/.]+$/, '')
      // remove any known prefixes (Base, Wrong810, Wrong1113) to get the core name
      if (stripPrefixes && stripPrefixes.length) {
        for (const pref of stripPrefixes) core = core.replace(new RegExp('^' + pref, 'i'), '')
      }
      core = core.toLowerCase()
      m[core] = modules[p]
    }
    return m
  }, [])

  const baseByCore = buildCoreMap(baseModules, ['Base'])
  const base1416ByCore = buildCoreMap(base1416Modules, ['Base'])
  const wrong810ByCore = buildCoreMap(wrong810Modules, ['Wrong810'])
  const wrong1113ByCore = buildCoreMap(wrong1113Modules, ['Wrong1113'])
  const wrong1416ByCore = buildCoreMap(wrong1416Modules, ['Wrong1416'])

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

  // Intro bullets that vary by age group. Keep messages simpler for 8-10.
  const introBullets: string[] = (() => {
    if (effectiveAge === '8-10') {
      return [
        'De gemene Bug heeft de printer gehackt en nu print hij alleen maar foute papieren!',
        'De baas mag dit NOOIT zien... Zoek heel snel alle fouten!'
      ]
    }
    // 11-13 and 14-16 use the same (more detailed) wording
    return [
      'De Bug heeft een virus in de printer gestopt.',
      'Hij spuugt honderden foutieve documenten uit en de baas is onderweg!',
      'Kijk elk blad na, klik op alles wat er niet thuishoort en ruim de boel op voor hij binnenkomt!'
    ]
  })()

  // Tutorial bullets (speluitleg) that vary by age group
  const tutorialBullets: string[] = (() => {
    if (effectiveAge === '8-10') {
      return [
        'Op elk blad staat één ding dat anders is (kleur of vorm)',
        'Klik Op het icoontje dat anders is om het weg te halen.',
        'Klik je fout? Dan krijg je extra tijd erbij!',
        'Vind zo snel mogelijk alle fouten en red het kantoor!'
      ]
    }
    return [
      'Elk blad bevat één afwijking die er niet in thuishoort.',
      'Klik op de afwijking om door te gaan naar het volgende blad.',
      'Klik je fout? Dan kost het jou extra tijd!',
      'Vind zo snel mogelijk alle afwijkingen en red het kantoor!'
    ]
  })()

  const nextRound = useCallback(() => {
    // reset visual state for previous round
    try { setCellStatuses({}) } catch { /* ignore */ }
    const grid = GRID_BY_AGE[effectiveAge]
    const total = grid * grid
    const nextItems: Item[] = []

    // choose base and wrong maps based on age group
    let baseMap: Record<string,string>
    let wrongMap: Record<string,string>
    if (effectiveAge === '8-10') {
      baseMap = baseByCore
      wrongMap = wrong810ByCore
    } else if (effectiveAge === '11-13') {
      baseMap = baseByCore
      wrongMap = wrong1113ByCore
    } else {
      // 14-16 -> use the new 14-16 base and wrong folders
      baseMap = Object.keys(base1416ByCore).length ? base1416ByCore : baseByCore
      wrongMap = Object.keys(wrong1416ByCore).length ? wrong1416ByCore : wrong1113ByCore
    }

    // Choose a core (matching base + wrong) per round and prefer unused cores.
    const cores = Object.keys(baseMap)
    const coresWithWrong = cores.filter(c => typeof wrongMap[c] === 'string')

    // Prefer cores that haven't been used yet
    const unusedCores = coresWithWrong.filter(c => !usedCoresRef.current.has(c))
    let coreChoice: string | undefined
    if (unusedCores.length > 0) coreChoice = unusedCores[Math.floor(Math.random() * unusedCores.length)]
    else if (coresWithWrong.length > 0) coreChoice = coresWithWrong[Math.floor(Math.random() * coresWithWrong.length)]
    else if (cores.length > 0) coreChoice = cores[Math.floor(Math.random() * cores.length)]

    let baseChoice: string | undefined
    let wrongChoice: string | undefined
    if (coreChoice) {
      baseChoice = baseMap[coreChoice]
      wrongChoice = wrongMap[coreChoice]
    }

    // Fallbacks if the chosen core doesn't provide assets
    if ((!baseChoice || !wrongChoice) && Object.keys(baseMap).length > 0) {
      const baseUrls = Object.values(baseMap).filter(Boolean) as string[]
      const wrongUrls = Object.values(wrongMap).filter(Boolean) as string[]
      if (!baseChoice && baseUrls.length > 0) baseChoice = baseUrls[Math.floor(Math.random() * baseUrls.length)]
      if (!wrongChoice && wrongUrls.length > 0) wrongChoice = wrongUrls[Math.floor(Math.random() * wrongUrls.length)]
    }

    // Build the grid: one random cell is the wrongChoice, rest are baseChoice
    const oddIndex = Math.floor(Math.random() * total)
    for (let i = 0; i < total; i++) {
      const isOdd = i === oddIndex
      const iconUrl = isOdd ? wrongChoice : baseChoice
      nextItems.push({ id: i + 1, icon: iconUrl, x: (i % grid), y: Math.floor(i / grid), isOdd })
    }

    // Mark the core as used for this playthrough
    try { if (coreChoice) usedCoresRef.current.add(coreChoice) } catch { /* ignore */ }

    setItems(nextItems)
    // trigger enter animation for the fresh sheet
    setIsEntering(true)
  }, [effectiveAge, baseByCore, base1416ByCore, wrong810ByCore, wrong1113ByCore, wrong1416ByCore])

  // grid size based on age group (used for layout)
  const grid = GRID_BY_AGE[effectiveAge] || 4

  // compute cell size so the entire grid fits within the available game content area
  useEffect(() => {
    function computeSize() {
      // determine layout parameters based on age group
      let gap: number
      let minCell: number
      let maxCell: number
      let reservedVertical: number

      if (effectiveAge === '11-13') {
        // slightly smaller and tighter layout for mid-group
        gap = 16
        // increase minimum cell so grid looks larger by default
        minCell = 96
        // increase maximum so large viewports allow visibly bigger cells
        maxCell = 420
        reservedVertical = 110
      } else if (effectiveAge === '8-10') {
        // make grid more spacious for younger group so figures are easier to see
        gap = 40
        // increase minimum cell so items appear noticeably larger for 8-10 year olds
        minCell = 140
        // allow larger max so on big viewports the icons can scale up more for younger kids
        maxCell = 520
        // reserve a bit more vertical space for UI chrome on small viewports
        reservedVertical = 160
      } else {
        // 14-16
        // make the oldest group's grid denser/smaller so a 5x5 fits comfortably
        gap = 12
        // increase minCell moderately so 5x5 remains usable but larger than before
        minCell = 72
        maxCell = 260
        reservedVertical = 82
      }

      const content = gameContentRef.current
      if (!content) return
      const rect = content.getBoundingClientRect()
      const availableWidth = Math.max(120, rect.width)
      const availableHeight = Math.max(120, rect.height - reservedVertical)
      const cellByWidth = Math.floor((availableWidth - gap * (grid - 1)) / grid)
      const cellByHeight = Math.floor((availableHeight - gap * (grid - 1)) / grid)
      let size = Math.max(minCell, Math.min(cellByWidth, cellByHeight))
      size = Math.min(maxCell, size)
      // persist chosen gap for rendering so inline styles match the measurement
      try { setCellGap(gap) } catch { /* ignore */ }
      setCellSize(size)
    }
    computeSize()
    window.addEventListener('resize', computeSize)
    const ro = new ResizeObserver(() => computeSize())
    if (gameContentRef.current) ro.observe(gameContentRef.current)
    return () => { window.removeEventListener('resize', computeSize); ro.disconnect() }
  }, [grid, effectiveAge])

  const startGame = useCallback(() => {
    setShowTutorial(false)
    setRunning(true)
    // start with round 0 so progress shows 0/10 until the player acts
    setRound(0)
    setMistakes(0)
    // clear any stopped flag when starting a fresh game
    try { setStoppedByUser(false) } catch { /* ignore */ }
    startRef.current = Date.now()
    // schedule next round to avoid impure work during render
    setTimeout(() => nextRound(), 0)
  }, [nextRound])

  const finish = useCallback(() => {
    setRunning(false)
    setShowEnd(true)
    try { setStoppedByUser(false) } catch { /* ignore */ }
    try {
      if (onEnd) {
        const finalTimeScore = computeTimeScore(elapsedMs)
        onEnd({ score: finalTimeScore, timeMs: elapsedMs, mistakes })
      }
    } catch { /* ignore */ }
  }, [onEnd, computeTimeScore, elapsedMs, mistakes])

  const resetGame = useCallback(() => {
    // reset counters and start over
    setShowEnd(false)
    setRound(0)
    setMistakes(0)
    setItems([])
    setRunning(true)
    setIsTransitioning(false)
    setShouldFinishAfterTransition(false)
    // clear stopped flag on reset
    try { setStoppedByUser(false) } catch { /* ignore */ }
    startRef.current = Date.now()
    setTimeout(() => nextRound(), 0)
  }, [nextRound])

  // Time-based scoring is computed from elapsedMs; no penalty schedule.

  const handleClick = useCallback((item: Item) => {
    if (!running || isTransitioning) return
    if (item.isOdd) {
      // increment round count and then determine if we've reached the last round
      const next = round + 1
      setRound(next)
      const TOTAL_ROUNDS = 20
      const willFinish = next >= TOTAL_ROUNDS
      setShouldFinishAfterTransition(willFinish)
      // trigger sheet fly-out animation; nextRound or finish will be called after animation ends
      setIsTransitioning(true)
      // Do not set a green background on correct items per user's request;
      // keep textual positive feedback only.
      setFeedback(randomFrom(GOOD_FEEDBACK_LIST))
      setFeedbackType('good')
      setTimeout(() => { try { setFeedback(null); setFeedbackType(null) } catch { /* ignore */ } }, 1200)
      // ensure we don't call nextRound here - animationend handler will do that
    } else {
      setMistakes(m => m + 1)
      // mark clicked cell as wrong (red) for this round and clear after the feedback timeout
      try { setCellStatuses(s => ({ ...(s || {}), [item.id]: 'bad' })) } catch { /* ignore */ }
      setFeedback(randomFrom(BAD_FEEDBACK_LIST))
      setFeedbackType('bad')
      // Penalty: add 10 seconds to the elapsed time when the player answers wrong.
      try {
        const TEN_SEC = 10 * 1000
        if (startRef.current != null) {
          // Move the start reference back by 10s so Date.now() - startRef increases
          startRef.current = (startRef.current || 0) - TEN_SEC
        } else {
          // Fallback: derive a startRef from current elapsedMs if available
          startRef.current = Date.now() - (elapsedMs || 0) - TEN_SEC
        }
        // Update elapsedMs immediately so UI reflects the added seconds without waiting for RAF
        try { setElapsedMs(Date.now() - (startRef.current || Date.now())) } catch { /* ignore */ }
        // Show time feedback under the timer (e.g. +10s)
        try { setTimeFeedback('+10 seconden'); setTimeFeedbackType('bad') } catch { /* ignore */ }
      } catch { /* ignore */ }
      setTimeout(() => { try { setFeedback(null); setFeedbackType(null) } catch { /* ignore */ } }, 1200)
      // clear the time feedback after the same duration
      setTimeout(() => { try { setTimeFeedback(null); setTimeFeedbackType(null) } catch { /* ignore */ } }, 1200)
      // remove red background together with the textual feedback so the cell returns to white
      setTimeout(() => {
        try {
          setCellStatuses(prev => {
            const copy = { ...(prev || {}) }
            try { delete copy[item.id] } catch { /* ignore */ }
            return copy
          })
        } catch { /* ignore */ }
      }, 1200)
    }
  }, [running, round, isTransitioning, randomFrom, elapsedMs])

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

  // Load persisted highscore for this minigame on mount
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const raw = localStorage.getItem('pz-highscore_printerslaatophol')
        if (raw !== null) {
          const n = Number(raw)
          if (!Number.isNaN(n)) setHighScore(n)
        }
      }
    } catch { /* ignore */ }
  }, [])

  // Persist player's highscore when the end screen is shown so the organiser
  // scoreboard can pick it up. Mirrors the behavior in PasswordZapper.
  useEffect(() => {
    if (!showEnd) return
    // If the player stopped the game manually, do not persist or overwrite highscores.
    if (stoppedByUser) return
    ;(async () => {
      try {
        const localKey = 'pz-highscore_printerslaatophol'
        // derive authoritative final score from elapsed time (0-100)
        const finalTimeScore = computeTimeScore(elapsedMs)
        // Update local stored highscore (keep max) and compute the authoritative
        // finalHigh value we will persist to the backend.
        let finalHigh = finalTimeScore
        try {
          const existingRaw = localStorage.getItem(localKey)
          const existingNum = existingRaw ? (Number(existingRaw) || 0) : 0
          finalHigh = Math.max(existingNum || 0, finalTimeScore)
          localStorage.setItem(localKey, String(finalHigh))
          try { setHighScore(finalHigh); setIsNewHigh(finalHigh > (existingNum || 0)); } catch { /* ignore */ }
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
                // `highscores` object. Only consider the explicit per-game
                // field when deciding whether to skip updating this game's
                // highscore. Do NOT use the legacy aggregated `score` to
                // prevent storing a missing per-game value.
                let existingGameScore: number | undefined = undefined
                try {
                  const rawTop = (found as Record<string, unknown>)['score_printerslaatophol']
                  if (typeof rawTop === 'number' && !Number.isNaN(rawTop)) existingGameScore = Number(rawTop)
                  else if (typeof rawTop === 'string' && rawTop.trim() !== '' && !Number.isNaN(Number(rawTop))) existingGameScore = Number(rawTop)
                } catch { /* ignore */ }
                try {
                  if (typeof existingGameScore !== 'number') {
                    const hs = (found as Record<string, unknown>)['highscores'] as Record<string, unknown> | undefined
                    if (hs && typeof hs['score_printerslaatophol'] !== 'undefined') {
                      const raw = hs['score_printerslaatophol']
                      const n = typeof raw === 'number' ? raw : (typeof raw === 'string' ? Number(raw) : NaN)
                      if (!Number.isNaN(n)) existingGameScore = Number(n)
                    }
                  }
                } catch { /* ignore */ }

                if (typeof existingGameScore === 'number' && !Number.isNaN(existingGameScore)) {
                  // Compare against the authoritative finalHigh and skip only
                  // when an explicit per-game highscore already exists and
                  // is >= the new value.
                  if (existingGameScore >= finalHigh) shouldUpdate = false
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
            // Use finalHigh (the same value we stored locally) for payload so
            // comparisons and stored values remain consistent.
            const finalScoreForPayload = finalHigh
            const aggregated = finalScoreForPayload + (Number.isNaN(otherGame as unknown as number) ? 0 : otherGame)
            // Send both legacy top-level keys and an explicit `highscores` object
            // so the backend will merge the per-game field into the stored
            // `highscores` document reliably.
            const payload: Record<string, unknown> = { score_printerslaatophol: finalScoreForPayload, score: aggregated, highscores: { score_printerslaatophol: finalScoreForPayload } }
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
              // Signal the authoritative persisted score (finalHigh) so
              // listeners receive a consistent value.
              const payload2 = JSON.stringify({ sessionId: sid, playerNumber: normalizedPlayerNumber, score: finalHigh, ts: Date.now() })
              localStorage.setItem(key, payload2)
              // dispatch storage event for other tabs
              try { window.dispatchEvent(new StorageEvent('storage', { key, newValue: payload2 })) } catch { /* ignore */ }
              // also dispatch a same-tab custom event so in-tab listeners react immediately
              try { window.dispatchEvent(new CustomEvent('pz_score_update', { detail: { sessionId: sid, playerNumber: normalizedPlayerNumber, score: finalHigh, ts: Date.now() } })) } catch { /* ignore */ }
            } catch { /* ignore */ }
          }
        } catch (err) {
          console.warn('PrinterSlaatOpHol: failed to persist score to server', err)
        }
      } catch (err) {
        console.warn('PrinterSlaatOpHol: persist highscore failed', err)
      }
    })()
  }, [showEnd, elapsedMs, round, mistakes, computeTimeScore, stoppedByUser])

  // When end screen is open, add a global body class so top-level controls (hint/pause/help)
  // are hidden by global CSS (PasswordZapper uses body.pz-end-open for this).
  useEffect(() => {
    try {
      if (showEnd) document.body.classList.add('pz-end-open')
      else document.body.classList.remove('pz-end-open')
    } catch { /* ignore */ }
    return () => { try { document.body.classList.remove('pz-end-open') } catch { /* ignore */ } }
  }, [showEnd])

  // When any modal/popup is open (intro/tutorial/hint/pause), add a body class
  // so top-level controls (hint, pause, spelregels) are hidden. This matches
  // the PasswordZapper convention which uses `body.pz-modal-open` to hide
  // those buttons while modals are shown.
  useEffect(() => {
    const cls = 'pz-modal-open'
    try {
      if (showIntro || showTutorial || showHint || showHelp || paused) document.body.classList.add(cls)
      else document.body.classList.remove(cls)
    } catch { /* ignore */ }
    return () => { try { document.body.classList.remove(cls) } catch { /* ignore */ } }
  }, [showIntro, showTutorial, showHint, showHelp, paused])

  // Listen for external hint requests (from top-level hint button)
  useEffect(() => {
    function onHintRequest() {
      try { setShowHint(true) } catch { /* ignore */ }
    }
    window.addEventListener('minigame:hint', onHintRequest)
    return () => window.removeEventListener('minigame:hint', onHintRequest)
  }, [])

  // Listen for top-level question/help button to show game rules (spelregels).
  // The help popup should not pause the game; when closed the player continues.
  useEffect(() => {
    function onQuestion() {
      try { setShowHelp(true) } catch { /* ignore */ }
    }
    window.addEventListener('minigame:question', onQuestion as EventListener)
    return () => window.removeEventListener('minigame:question', onQuestion as EventListener)
  }, [])

  // Pause / help / hint handling: listen for global pause/question/hint events
  // Consolidated like PasswordZapper so events are registered together.
  useEffect(() => {
    const onPause = () => { try { setPaused(true) } catch { /* ignore */ } }
    const onHelp = () => { try { setShowHelp(true) } catch { /* ignore */ } }
    const onHint = () => { try { setShowHint(true) } catch { /* ignore */ } }
    window.addEventListener('minigame:pause', onPause as EventListener)
    window.addEventListener('minigame:question', onHelp as EventListener)
    window.addEventListener('minigame:hint', onHint as EventListener)
    return () => {
      window.removeEventListener('minigame:pause', onPause as EventListener)
      window.removeEventListener('minigame:question', onHelp as EventListener)
      window.removeEventListener('minigame:hint', onHint as EventListener)
    }
  }, [])

  // Unlock and auto-show hint after 1 mistake (same for all ages)
  useEffect(() => {
    try {
      if (!hintAutoShownRef.current && mistakes >= 1) {
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

  // Toggle a body-level class while paused so CSS can freeze animations if desired
  useEffect(() => {
    const cls = 'pz-paused'
    try {
      if (paused) document.body.classList.add(cls)
      else document.body.classList.remove(cls)
    } catch { /* ignore */ }
    // when paused, also stop the running timer; when resuming, restore startRef
    try {
      if (paused) {
        setRunning(false)
      } else {
        // only resume if game not finished
        if (!showEnd) {
          // preserve elapsed time by setting startRef such that Date.now() - startRef = elapsedMs
          startRef.current = Date.now() - elapsedMs
          setRunning(true)
        }
      }
    } catch { /* ignore */ }
    return () => { try { document.body.classList.remove(cls) } catch { /* ignore */ } }
  }, [paused, showEnd, elapsedMs])

  // Show an intro popup first, then the PasswordZapper-style tutorial, then the game
  if (showIntro) {
    return (
      <div
        className="pz-layout printer-root"
        style={{ position: 'fixed', top: 'var(--nav-height)', left: 0, right: 0, bottom: 'var(--bottombar-height)', border: '10px solid #000', boxSizing: 'border-box', background: '#000', zIndex: 900 }}
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
              {introBullets.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
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
        style={{ position: 'fixed', top: 'var(--nav-height)', left: 0, right: 0, bottom: 'var(--bottombar-height)', border: '10px solid #000', boxSizing: 'border-box', background: '#000', zIndex: 900 }}
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
              {tutorialBullets.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
            <div style={{ marginTop: 18, textAlign: 'center' }}>
              <button className="pz-start-btn pz-start-btn--large" onClick={() => { startGame() }}>Volgende</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Help modal (triggered by question mark) - shows rules but does NOT pause the game
  if (showHelp) {
    return (
      <div className="pz-layout printer-root" style={{ position: 'fixed', top: 'var(--nav-height)', left: 0, right: 0, bottom: 'var(--bottombar-height)', border: '10px solid #000', boxSizing: 'border-box', background: '#000', zIndex: 900 }}>
        <div className="game-area printer-area">
          <div className={`bg-blur ${showTutorial ? 'is-blurred' : 'no-blur'}`} style={bgStyle} />
        </div>

        <div className="pz-start-overlay" onClick={() => setShowHelp(false)}>
          <div className="pz-start-modal" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ textAlign: 'left' }}>Speluitleg - Printer slaat op hol!</h2>
            <ul className="pz-start-bullets" style={{ marginTop: 12, textAlign: 'left' }}>
              {tutorialBullets.slice(0, 4).map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
            <div style={{ marginTop: 18, textAlign: 'center' }}>
              <button className="pz-start-btn pz-start-btn--large" onClick={() => setShowHelp(false)}>Verder spelen</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Hint modal (auto-open after 3 mistakes or from hint button)
  if (showHint) {
    return (
      <div className="pz-layout printer-root" style={{ position: 'fixed', top: 'var(--nav-height)', left: 0, right: 0, bottom: 'var(--bottombar-height)', border: '10px solid #000', boxSizing: 'border-box', background: '#000', zIndex: 900 }}>
        <div className="game-area printer-area">
          <div className={`bg-blur ${showTutorial ? 'is-blurred' : 'no-blur'}`} style={bgStyle} />
        </div>

        <div className="pz-start-overlay">
          <div className="pz-start-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Hint</h2>
            <ul className="pz-start-bullets">
              <li>Let op kleine verschillen(grootte,kleur,vorm,positie,letters)</li>
              <li>Klik niet te snel, fouten kosten tijd!</li>
            </ul>
            <div style={{ marginTop: 12, textAlign: 'center' }}>
              <button className="pz-start-btn pz-start-btn--large" onClick={() => setShowHint(false)}>Verder spelen</button>
            </div>
          </div>
        </div>
      </div>
    )
  }


  // Pause modal overlay (matches PasswordZapper behavior)
  if (paused) {
    return (
      <div className="pz-layout printer-root" style={{ position: 'fixed', top: 'var(--nav-height)', left: 0, right: 0, bottom: 'var(--bottombar-height)', border: '10px solid #000', boxSizing: 'border-box', background: '#000', zIndex: 900 }}>
        <div className="game-area printer-area">
          <div className={`bg-blur ${showTutorial ? 'is-blurred' : 'no-blur'}`} style={bgStyle} />
        </div>

        <div className="pz-pause-overlay">
          <div className="pz-pause-modal">
            <h2>Pauze</h2>
            <div className="pz-pause-actions">
              <button id="btnContinueGame" className="pz-pause-action pz-pause-action--primary" onClick={() => { setPaused(false); }}>Verder spelen</button>
              <button id="btnRestartGame" className="pz-pause-action pz-pause-action--primary" onClick={() => { try { window.location.reload() } catch { /* ignore */ } }}>Opnieuw beginnen</button>
              <button id="btnStopGame" className="pz-pause-action pz-pause-action--danger" onClick={() => {
                try {
                  setPaused(false)
                  setRunning(false)
                  setStoppedByUser(true)
                  setShowEnd(true)
                  // notify parent that game ended with 0 score
                  try { if (onEnd) onEnd({ score: 0, timeMs: elapsedMs, mistakes }) } catch { /* ignore */ }
                } catch { /* ignore */ }
              }}>Stoppen</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // End screen (shown after finish) - use PasswordZapper end layout with fireworks
    if (showEnd) {
    // compute simple stats: correct vs wrong
    const totalRounds = 20
    const totalCorrect = Math.min(Math.max(0, round), totalRounds)
    const totalWrong = mistakes
    // compute final score from elapsed time per user story (0-100)
    const finalScore = stoppedByUser ? 0 : computeTimeScore(elapsedMs)
    try { console.debug('[PrinterSlaatOpHol] endscreen', { timeMs: elapsedMs, round: totalCorrect, mistakes, finalScore }) } catch { /* ignore */ }
    const clampedScorePercent = Math.max(0, Math.min(100, finalScore))
    // stars: simple thresholds (100 -> 3, >=66 -> 2, >=33 -> 1)
    const starCount = clampedScorePercent === 100 ? 3 : clampedScorePercent >= 66 ? 2 : clampedScorePercent >= 33 ? 1 : 0
    const circleStyle = ({ ['--pz-score-pct' as unknown as string]: `${clampedScorePercent}%` } as unknown) as React.CSSProperties

    return (
      <div className="pz-end">
        <div className="pz-end-box">
          <canvas ref={fwCanvasRef} className="pz-fireworks-canvas" aria-hidden={true} />
          <div className="pz-highscore" style={{ marginBottom: 18, textAlign: 'center' }}>
            <span className="pz-highscore-label">Hoogste score:</span>
            <span id="highScore" className="pz-highscore-value">{highScore ?? '-'}</span>
            {isNewHigh && <span className="pz-new-record"> Nieuw record!</span>}
          </div>
          <div className="pz-end-content">
            <div className="pz-end-left">
              <div className="pz-score-circle" aria-hidden style={circleStyle}>
                <div className="pz-score-label">SCORE</div>
                <div className="pz-score-number" id="score">{finalScore}</div>
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
                    {
                      // Map finalScore to headline and subtitle per requested feedback
                    }
                    {
                      (() => {
                        const map: Record<number, { title: string; subtitle: string }> = {
                          100: { title: 'Perfect gespeeld!', subtitle: 'Snel én foutloos!' },
                          90: { title: 'Bijna perfect!', subtitle: 'Heel sterk gespeeld!' },
                          80: { title: 'Sterk gedaan!', subtitle: 'Je zit goed op tempo!' },
                          70: { title: 'Goed gespeeld!', subtitle: 'Nog iets sneller kan beter!' },
                          60: { title: 'Niet slecht!', subtitle: 'Let op je snelheid en fouten!' },
                          50: { title: 'Gemiddeld resultaat', subtitle: 'Probeer wat sneller te werken!' },
                          40: { title: 'Kan beter', subtitle: 'Fouten kosten je te veel tijd!' },
                          30: { title: 'Moeilijk gehad?', subtitle: 'Blijf oefenen en focus!' },
                          20: { title: 'Veel tijd verloren', subtitle: 'Probeer rustiger en gerichter te spelen!' },
                          10: { title: 'Bijna niet gelukt', subtitle: 'Let beter op en vermijd fouten!' },
                          0:  { title: 'Niet gelukt', subtitle: 'Probeer opnieuw en blijf gefocust!' }
                        }
                        if (stoppedByUser) {
                          return (
                            <>
                              <h3>Spel gestopt, geen score</h3>
                              <div className="pz-tips">
                                <p>Score: 0 — Tijd: {formatMs(elapsedMs)} — Fouten: {mistakes}</p>
                              </div>
                            </>
                          )
                        }
                        const key = Math.max(0, Math.min(100, Math.round(finalScore / 10) * 10))
                        const fb = map[key] || { title: 'Goed gedaan!', subtitle: '' }
                        return (
                          <>
                            <h3>{fb.title}</h3>
                            <div className="pz-tips">
                              {fb.subtitle && <p style={{ marginBottom: 8 }}>{fb.subtitle}</p>}
                              <p>Score: {finalScore} — Tijd: {formatMs(elapsedMs)} — Fouten: {mistakes}</p>
                            </div>
                          </>
                        )
                      })()
                    }
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
      style={{ position: 'fixed', top: 'var(--nav-height)', left: 0, right: 0, bottom: 'var(--bottombar-height)', border: '10px solid #000', boxSizing: 'border-box', background: '#000', zIndex: 900 }}
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
                  <div className="pz-score pz-timer">{running ? formatMs(elapsedMs) : '00:00'}</div>
                  {timeFeedback && (
                    <div
                      className={"pz-time-feedback " + (timeFeedbackType === 'good' ? 'pz-feedback--good' : timeFeedbackType === 'bad' ? 'pz-feedback--bad' : '')}
                      role="status"
                      aria-live="polite"
                    >
                      {timeFeedback}
                    </div>
                  )}
                </div>
                        {feedback && (
                          <div
                            id="feedback"
                            className={"pz-feedback " + (feedbackType === 'good' ? 'pz-feedback--good' : feedbackType === 'bad' ? 'pz-feedback--bad' : '')}
                            role="status"
                            aria-live="polite"
                          >
                            {feedback}
                          </div>
                        )}
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
                  gap: `${cellGap}px`,
                  justifyContent: 'center',
                  margin: '18px auto',
                  // set explicit width so the page always encloses the grid exactly
                  width: `${grid * cellSize + (Math.max(0, grid - 1) * cellGap)}px`,
                  maxWidth: '100%',
                  boxSizing: 'border-box'
                }}
              >
                {items.map(it=> (
                  <div
                    key={it.id}
                    className={`cell ${it.isOdd ? 'odd' : ''} ${cellStatuses && cellStatuses[it.id] === 'bad' ? 'pz-cell--bad' : ''}`}
                    onClick={()=>handleClick(it)}
                  >
                    {it.icon ? (
                      <img src={it.icon} alt={it.isOdd ? 'Fout' : 'Normaal'} style={{ width: (effectiveAge === '8-10' ? '98%' : '92%'), height: (effectiveAge === '8-10' ? '98%' : '92%'), objectFit: 'contain', display: 'block', margin: 'auto' }} />
                    ) : (
                      (it.text ?? '')
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

