import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { ApiPlayer } from '../../../api'
import './BugCleanupGame.css'
import '../PasswordZapper/PasswordZapperGame.css'
import redBugSvg from '../../../assets/BugCleanupImages/RedBug.svg'
import greenBugSvg from '../../../assets/BugCleanupImages/GreenBug.svg'
import purpleBugSvg from '../../../assets/BugCleanupImages/PurpleBug.svg'
import orangeBugSvg from '../../../assets/BugCleanupImages/OrangeBug.svg'
import bigRedOrangeBugSvg from '../../../assets/BugCleanupImages/BigRedOrangeBug.svg'
import bigPurpleGreenBugSvg from '../../../assets/BugCleanupImages/BigPurpleGreenBug.svg'
import wallpaperBugCleanup from '../../../assets/BugCleanupImages/WallpaperBugCleanup.png'
import cursorSvg from '../../../assets/BugCleanupImages/Cursor.svg'

type AgeGroup = '8-10' | '11-13' | '14-16'
type BugVariant = 'red' | 'green' | 'purple' | 'orange' | 'big-red-orange' | 'big-purple-green'
type ShapeType = 'circle' | 'triangle' | 'square'
type EndResults = { score: number; timeMs: number; mistakes: number }

interface Props {
  ageGroup?: AgeGroup
  onEnd?: (results: EndResults) => void
}

interface Bug {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  size: number
  variant: BugVariant
  shape: ShapeType
  isSplitChild?: boolean
  invulnerableUntilMs?: number
}

const AGE_SETTINGS: Record<AgeGroup, { totalBugs: number; visibleMax: number; baseSize: number; speedMin: number; speedMax: number; splitOnHit: boolean; startLag: number; lagGain: number; maxLag: number }> = {
  // Increased totalBugs to make the game longer for each age group
  // 8-10: require 30 bugs removed for completion
  // 11-13: require 50 bugs removed for completion
  // 14-16: require 60 bugs removed for completion
  '8-10': { totalBugs: 30, visibleMax: 3, baseSize: 108, speedMin: 24, speedMax: 46, splitOnHit: false, startLag: 0.001, lagGain: 0.005, maxLag: 0.1 },
  '11-13': { totalBugs: 50, visibleMax: 4, baseSize: 86, speedMin: 36, speedMax: 64, splitOnHit: false, startLag: 0.001, lagGain: 0.005, maxLag: 0.1 },
  // Make the 14-16 bugs a bit larger so they are more prominent
  '14-16': { totalBugs: 60, visibleMax: 4, baseSize: 86, speedMin: 62, speedMax: 116, splitOnHit: true, startLag: 0.001, lagGain: 0.005, maxLag: 0.1 }
}

const INTRO_BY_AGE: Record<AgeGroup, string[]> = {
  '8-10': [
    'Je computermuis is traag... je computer zit vol bugs!',
    'Beweeg je muis of vinger en probeer met de computermuis om de bugs te raken.',
    'Elke bug die je verwijdert maakt je muis sneller.',
    'Verwijder alle bugs en herstel je computer.'
  ],
  '11-13': [
    'Je muis is traag... je computer zit vol bugs!',
    'Beweeg je muis of vinger en probeer met de cursor om de bugs te raken.',
    'Elke bug die je verwijdert maakt je sneller',
    'Verwijder alle bugs en herstel je computer!'
  ],
  '14-16': [
    'Je muis is traag... je computer zit vol bugs!',
    'Beweeg je muis of vinger en probeer met de cursor om de bugs te raken.',
    'Elke bug die je verwijdert maakt je sneller',
    'Verwijder alle bugs en herstel je computer!'
  ]
}

const HINT_BY_AGE: Record<AgeGroup, string[]> = {
  '8-10': [
    'Beweeg je muis of vinger over het scherm — de cursor volgt je beweging met een vertraging.',
    'Beweeg rustig en probeer de bugs te raken met de cursor die je volgt.'
  ],
  '11-13': [
    'Beweeg je muis of vinger over het scherm — de cursor volgt je beweging met vertraging.',
    'Beweeg rustig en probeer de bugs te raken met de cursor die je volgt.'
  ],
  '14-16': [
    'Beweeg je muis of vinger over het scherm — de cursor volgt je beweging met vertraging.',
    'Beweeg rustig en probeer de bugs te raken met de cursor die je volgt.'
  ]
}

// How many mistakes before showing the hint popup for each age group
const MISTAKES_HINT_THRESHOLD: Record<AgeGroup, number> = {
  '8-10': 1,
  '11-13': 2,
  '14-16': 3
}

// Nieuwe lijst met positieve feedbackberichten. We kiezen er bij elke score één willekeurig uit.
const POSITIVE_FEEDBACK = [
  'Goed!',
  'Top gedaan!',
  'Fantastisch!',
  'Perfect geraakt!',
  'Mooi zo!',
  'Dat gaat lekker!',
  'Helemaal goed!',
  'Knap gedaan!',
  'Super!',
]

function randomFeedback() {
  return POSITIVE_FEEDBACK[Math.floor(Math.random() * POSITIVE_FEEDBACK.length)]
}

function inferAgeGroup(value?: string | null): AgeGroup {
  const raw = String(value || '').toLowerCase()
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
    /* fall through */
  }
  return '11-13'
}

function createRandomBug(id: number, age: AgeGroup, bounds: { w: number; h: number }): Bug {
  const cfg = AGE_SETTINGS[age]
  const spread = age === '14-16' ? 0.24 : 0.16
  const shapeRoll = Math.random()
  const shape: ShapeType = shapeRoll < 0.34 ? 'circle' : shapeRoll < 0.67 ? 'triangle' : 'square'
  let variant: BugVariant
  if (age === '14-16') {
    variant = Math.random() < 0.5 ? 'big-red-orange' : 'big-purple-green'
  } else {
    const random = Math.random()
    variant = random < 0.25 ? 'red' : random < 0.5 ? 'green' : random < 0.75 ? 'purple' : 'orange'
  }
  const size = Math.max(28, cfg.baseSize + (Math.random() * 2 - 1) * cfg.baseSize * spread)
  const speed = cfg.speedMin + Math.random() * (cfg.speedMax - cfg.speedMin)
  const angle = Math.random() * Math.PI * 2
  const radius = size / 2
  return {
    id,
    size,
    variant,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    x: radius + Math.random() * Math.max(40, bounds.w - radius * 2),
    y: radius + Math.random() * Math.max(40, bounds.h - radius * 2),
    shape
  }
}

export default function BugCleanupGame({ ageGroup, onEnd }: Props) {
  const sessionCat = typeof window !== 'undefined' ? sessionStorage.getItem('playerCategory') : null
  const urlAge = typeof window !== 'undefined' ? new URLSearchParams(window.location.search || '').get('age') : null
  const effectiveAge = inferAgeGroup(sessionCat || ageGroup || urlAge)
  const cfg = AGE_SETTINGS[effectiveAge]

  const [showIntro, setShowIntro] = useState(true)
  const [showHelp, setShowHelp] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [paused, setPaused] = useState(false)
  const [stoppedByUser, setStoppedByUser] = useState(false)
  const [showEnd, setShowEnd] = useState(false)
  const [running, setRunning] = useState(false)
  const [, setScore] = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [bugsRemoved, setBugsRemoved] = useState(0)
  const [bugs, setBugs] = useState<Bug[]>([])
  const [cursorPos, setCursorPos] = useState({ x: 100, y: 100 })
  const [feedback, setFeedback] = useState<string | null>(null)
  const [bestTimeMs, setBestTimeMs] = useState<number | null>(null)
  const fwCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const removingIdsRef = useRef<Set<number>>(new Set())

  const gameAreaRef = useRef<HTMLDivElement | null>(null)
  const mouseRef = useRef({ x: 100, y: 100 })
  const cursorRef = useRef({ x: 100, y: 100 })
  const lagFactorRef = useRef(0.08)
  const elapsedRef = useRef(0)
  const rafRef = useRef<number | null>(null)
  const lastFrameRef = useRef<number | null>(null)
  const nextBugIdRef = useRef(1)
  // ...existing code...
  const shouldFinishRef = useRef(false)
  const SPLIT_INVULNERABLE_MS = 600

    // Ensure we only open the hint popup once per game run
    const hintShownRef = useRef(false)

    // Practice / oefenronde state
    const [inPractice, setInPractice] = useState(false)
    // expose the practiceRemoved count so the UI can show progress out of 3 during practice
    const [practiceRemoved, setPracticeRemoved] = useState(0)
    const [showPracticeStart, setShowPracticeStart] = useState(false) // "Even oefenen!" modal
    const [showPracticeEnd, setShowPracticeEnd] = useState(false) // "Het echte spel begint nu" modal

  const introText = INTRO_BY_AGE[effectiveAge]
  const hintText = HINT_BY_AGE[effectiveAge]

  const END_TIP_BY_AGE: Record<AgeGroup, string> = {
    '8-10': 'Ruim je computer af en toe op en verwijder dingen die je niet meer nodig hebt. Zo blijft hij snel.',
    '11-13': 'Houd je computer schoon door regelmatig onnodige bestanden en programma\'s te verwijderen — zo blijft alles snel werken.',
    '14-16': 'Verwijder regelmatig ongebruikte bestanden en programma\'s en houd je besturingssysteem up-to-date om je computer snel te houden.'
  }

  // penalty schedule removed — no time/score penalties applied

  const totalBugsForProgress = useMemo(() => cfg.totalBugs, [cfg.totalBugs])

  const resetGameState = useCallback(() => {
    const rect = gameAreaRef.current?.getBoundingClientRect()
    const bounds = { w: Math.max(320, rect?.width ?? 1000), h: Math.max(220, rect?.height ?? 560) }
    const visible: Bug[] = []
    for (let i = 0; i < cfg.visibleMax; i += 1) {
      visible.push(createRandomBug(nextBugIdRef.current++, effectiveAge, bounds))
    }
    setBugs(visible)
    setScore(0)
    setMistakes(0)
    setElapsedMs(0)
    setBugsRemoved(0)
    setFeedback(null)
    // penalties removed
    lagFactorRef.current = cfg.startLag
    elapsedRef.current = 0
    shouldFinishRef.current = false
    hintShownRef.current = false
    lastFrameRef.current = null
  }, [cfg.startLag, cfg.visibleMax, effectiveAge])

  // Initialize the visible bugs when the component mounts so tests that
  // synchronously click through the intro see bugs rendered immediately.
  useEffect(() => {
    try { resetGameState() } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openPracticeStart = useCallback(() => {
    // close intro and open the practice-start modal
    setShowIntro(false)
    setShowPracticeStart(true)
  }, [])

  const startPractice = useCallback(() => {
    // prepare practice round: no scoring / progress counts, but allow bug removal
    resetGameState()
    setPracticeRemoved(0)
    setInPractice(true)
    setShowPracticeStart(false)
    setShowPracticeEnd(false)
    setStoppedByUser(false)
    setRunning(true)
    setPaused(false)
  }, [resetGameState])

  const startRealGame = useCallback(() => {
    // start the actual game (reset any practice state)
    resetGameState()
    setInPractice(false)
    setPracticeRemoved(0)
    setShowPracticeStart(false)
    setShowPracticeEnd(false)
    setStoppedByUser(false)
    setRunning(true)
    setPaused(false)
  }, [resetGameState])

  const finishGame = useCallback(() => {
    // Ensure any modal/pause state is cleared so overlays don't remain visible
    setRunning(false)
    setPaused(false)
    setShowHelp(false)
    setShowHint(false)
    setShowIntro(false)
    setShowEnd(true)
    try {
      // report score as the time-based percent (0-100) so 100% = 100 points, 90% = 90 points
      const reportedScore = mapTimeToScore(elapsedMs)
      onEnd?.({ score: reportedScore, timeMs: elapsedMs, mistakes })
    } catch {
      void 0
    }
    // persist best (fastest) time per age group
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined' && elapsedMs > 0) {
        const key = `bugcleanup_best_time_${effectiveAge}`
        const cur = localStorage.getItem(key)
        const curVal = cur ? Number(cur) : null
        if (curVal === null || elapsedMs < curVal) {
          localStorage.setItem(key, String(elapsedMs))
          setBestTimeMs(elapsedMs)
        }
      }
    } catch {
      void 0
    }
  }, [elapsedMs, mistakes, onEnd, effectiveAge])

  const removeBugByHover = useCallback((bug: Bug) => {
    if (!running || paused || showIntro || showHelp || showHint || showEnd) return
    if (bug.invulnerableUntilMs && Date.now() < bug.invulnerableUntilMs) return
    if (removingIdsRef.current.has(bug.id)) return
    removingIdsRef.current.add(bug.id)

    const rect = gameAreaRef.current?.getBoundingClientRect()
    const bounds = { w: Math.max(320, rect?.width ?? 1000), h: Math.max(220, rect?.height ?? 560) }

    setBugs((prevBugs) => {
      const exists = prevBugs.some((b) => b.id === bug.id)
      if (!exists) return prevBugs
      const kept = prevBugs.filter((b) => b.id !== bug.id)
      const spawnedChildren: Bug[] = []

      if (cfg.splitOnHit && !bug.isSplitChild && (bug.variant === 'big-red-orange' || bug.variant === 'big-purple-green')) {
        const [firstChildVariant, secondChildVariant]: [BugVariant, BugVariant] =
          bug.variant === 'big-red-orange' ? ['red', 'orange'] : ['purple', 'green']
        const childSize = Math.max(24, bug.size * 0.54)
        const invulnerableUntilMs = Date.now() + SPLIT_INVULNERABLE_MS
        spawnedChildren.push(
          {
            id: nextBugIdRef.current++,
            x: Math.max(childSize / 2, Math.min(bounds.w - childSize / 2, bug.x - 10)),
            y: Math.max(childSize / 2, Math.min(bounds.h - childSize / 2, bug.y - 10)),
            vx: -Math.abs(bug.vx) * 1.2,
            vy: Math.abs(bug.vy) * 1.1,
            size: childSize,
            variant: firstChildVariant,
            shape: 'triangle',
            isSplitChild: true,
            invulnerableUntilMs
          },
          {
            id: nextBugIdRef.current++,
            x: Math.max(childSize / 2, Math.min(bounds.w - childSize / 2, bug.x + 10)),
            y: Math.max(childSize / 2, Math.min(bounds.h - childSize / 2, bug.y + 10)),
            vx: Math.abs(bug.vx) * 1.2,
            vy: -Math.abs(bug.vy) * 1.1,
            size: childSize,
            variant: secondChildVariant,
            shape: 'square',
            isSplitChild: true,
            invulnerableUntilMs
          }
        )
      }

      const nextBugs = [...kept, ...spawnedChildren]
      while (nextBugs.length < cfg.visibleMax && !shouldFinishRef.current) {
        nextBugs.push(createRandomBug(nextBugIdRef.current++, effectiveAge, bounds))
      }
      return nextBugs
    })

    // If we're in a practice run, count removals but do not award points, lag or progress.
    if (inPractice) {
      setFeedback(randomFeedback())
      window.setTimeout(() => setFeedback(null), 600)
      setPracticeRemoved((n) => {
        const next = n + 1
        if (next >= 3) {
          // Stop the practice and show the modal that the real game starts now.
          // Do NOT set paused=true here because that causes the generic pause
          // popup to appear underneath the practice-end modal. Ensure paused is
          // false so only the practice-end modal is visible.
          try { setPaused(false) } catch { /* ignore */ }
          try { setShowPracticeEnd(true) } catch { /* ignore */ }
          try { setRunning(false) } catch { /* ignore */ }
        }
        return next
      })
    } else {
      // Only award points when the removed bug is either a split child or not a "big-" variant.
      const isBigVariant = bug.variant === 'big-red-orange' || bug.variant === 'big-purple-green'
      const awardPoints = !isBigVariant || !!bug.isSplitChild

      if (awardPoints) {
        setScore((s) => s + 2)
        setFeedback(randomFeedback())
        window.setTimeout(() => setFeedback(null), 600)
        lagFactorRef.current = Math.min(cfg.maxLag, lagFactorRef.current + cfg.lagGain)
        setBugsRemoved((n) => {
          const next = n + 1
          if (next >= totalBugsForProgress) shouldFinishRef.current = true
          return next
        })
      } else {
        // Provide feedback for splitting, but do not award points or progress.
        // For big bugs that split: do not award points or progress; keep no special splitting text.
        // Show the same positive feedback as non-big removals to avoid confusing the player.
        setFeedback(randomFeedback())
        window.setTimeout(() => setFeedback(null), 600)
      }
    }

    window.setTimeout(() => {
      removingIdsRef.current.delete(bug.id)
    }, 250)
  }, [cfg.lagGain, cfg.maxLag, cfg.splitOnHit, cfg.visibleMax, effectiveAge, paused, running, showEnd, showHelp, showHint, showIntro, totalBugsForProgress, inPractice])

  // handle clicks inside the game area — if the user clicks and it's not on a bug
  const handleAreaClick = useCallback((ev: React.MouseEvent<HTMLDivElement>) => {
    if (!running || paused || showIntro || showHelp || showHint || showEnd) return
    const rect = gameAreaRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = ev.clientX - rect.left
    const y = ev.clientY - rect.top

    // check if click hits any bug (use similar hit radius as the hover removal)
    const hit = bugs.some((bug) => {
      const dx = x - bug.x
      const dy = y - bug.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      const hitRadius = bug.size * 0.47
      return dist <= hitRadius
    })

    if (hit) {
      // clicking on a bug — don't count as mistake here (hover removal will handle it)
      return
    }

    // miss: increment mistakes (no time/score penalty)
    setMistakes((m) => {
      const next = m + 1
      // show hint once per run when reaching the per-age threshold
      try {
        const threshold = MISTAKES_HINT_THRESHOLD[effectiveAge]
        if (!hintShownRef.current && next >= threshold) {
          hintShownRef.current = true
          setPaused(true)
          setShowHint(true)
        }
      } catch {
        void 0
      }
      return next
    })
  }, [bugs, paused, running, showEnd, showHelp, showHint, showIntro, effectiveAge])

  // penalties/minpunten logic removed

  useEffect(() => {
    if (!running || paused || showEnd) return
    const frame = (ts: number) => {
      const rect = gameAreaRef.current?.getBoundingClientRect()
      if (!rect) {
        rafRef.current = requestAnimationFrame(frame)
        return
      }
      const prev = lastFrameRef.current ?? ts
      const dt = Math.min(0.05, (ts - prev) / 1000)
      lastFrameRef.current = ts

      elapsedRef.current += dt * 1000
      const elapsed = Math.floor(elapsedRef.current)
      setElapsedMs(elapsed)
      // no penalty logic

      const dxToMouse = mouseRef.current.x - cursorRef.current.x
      const dyToMouse = mouseRef.current.y - cursorRef.current.y
      const distToMouse = Math.sqrt(dxToMouse * dxToMouse + dyToMouse * dyToMouse)
      // Move with capped speed so larger distance does not create instant acceleration.
      // lagFactor increases whenever a bug is removed, so cursor speed increases per hit.
      const followSpeedPxPerSec = 90 + lagFactorRef.current * 2200
      const maxStep = followSpeedPxPerSec * dt
      if (distToMouse > 0.0001) {
        const step = Math.min(distToMouse, maxStep)
        cursorRef.current.x += (dxToMouse / distToMouse) * step
        cursorRef.current.y += (dyToMouse / distToMouse) * step
      }
      setCursorPos({ x: cursorRef.current.x, y: cursorRef.current.y })

      setBugs((prevBugs) => {
        const moved = prevBugs.map((bug) => {
          let nx = bug.x + bug.vx * dt
          let ny = bug.y + bug.vy * dt
          let nvx = bug.vx
          let nvy = bug.vy
          const radius = bug.size / 2
          if (nx <= radius || nx >= rect.width - radius) {
            nvx = -nvx
            nx = Math.min(rect.width - radius, Math.max(radius, nx))
          }
          if (ny <= radius || ny >= rect.height - radius) {
            nvy = -nvy
            ny = Math.min(rect.height - radius, Math.max(radius, ny))
          }
          return { ...bug, x: nx, y: ny, vx: nvx, vy: nvy }
        })
        // Remove bugs when the laggy in-game cursor overlaps them
        for (const bug of moved) {
          const dx = cursorRef.current.x - bug.x
          const dy = cursorRef.current.y - bug.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          const hitRadius = bug.size * 0.47
          if (dist <= hitRadius) {
            try { queueMicrotask(() => removeBugByHover(bug)) } catch { void 0 }
          }
        }
        return moved
      })

      if (shouldFinishRef.current) {
        finishGame()
        return
      }

      rafRef.current = requestAnimationFrame(frame)
    }
    rafRef.current = requestAnimationFrame(frame)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [finishGame, paused, removeBugByHover, running, showEnd])

  useEffect(() => {
    const onMove = (ev: MouseEvent) => {
      const rect = gameAreaRef.current?.getBoundingClientRect()
      if (!rect) return
      mouseRef.current.x = ev.clientX - rect.left
      mouseRef.current.y = ev.clientY - rect.top
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  useEffect(() => {
    try {
      const w = window as unknown as Record<string, unknown>
      w.__pz_hint_unlocked = true
      window.dispatchEvent(new CustomEvent('minigame:hint-unlocked'))
    } catch {
      void 0
    }
  }, [])

  useEffect(() => {
    // Ignore pause/help/hint events while practice modals are visible so the
    // global controls cannot open underlying overlays during the practice flow.
    const onPause = () => {
      if (showPracticeStart || showPracticeEnd) return
      setPaused(true)
    }
    const onHelp = () => {
      if (showPracticeStart || showPracticeEnd) return
      setShowHelp(true)
    }
    const onHint = () => {
      if (showPracticeStart || showPracticeEnd) return
      setShowHint(true)
    }
    window.addEventListener('minigame:pause', onPause as EventListener)
    window.addEventListener('minigame:question', onHelp as EventListener)
    window.addEventListener('minigame:hint', onHint as EventListener)
    return () => {
      window.removeEventListener('minigame:pause', onPause as EventListener)
      window.removeEventListener('minigame:question', onHelp as EventListener)
      window.removeEventListener('minigame:hint', onHint as EventListener)
    }
  }, [showPracticeStart, showPracticeEnd])

  useEffect(() => {
    const modalOpen = showIntro || showHelp || showHint || paused
    const clsModal = 'pz-modal-open'
    const clsEnd = 'pz-end-open'
    const clsPractice = 'pz-practice-open'

    // toggle regular modal class
    if (modalOpen) document.body.classList.add(clsModal)
    else document.body.classList.remove(clsModal)

    // toggle end class
    if (showEnd) document.body.classList.add(clsEnd)
    else document.body.classList.remove(clsEnd)

    // toggle practice-specific class used to hide global controls
    if (showPracticeStart || showPracticeEnd) document.body.classList.add(clsPractice)
    else document.body.classList.remove(clsPractice)

    return () => {
      document.body.classList.remove(clsModal)
      document.body.classList.remove(clsEnd)
      document.body.classList.remove(clsPractice)
    }
  }, [paused, showEnd, showHelp, showHint, showIntro, showPracticeStart, showPracticeEnd])

  useEffect(() => {
    if (!showEnd) return
    let cleanup: (() => void) | null = null
    ;(async () => {
      try {
        const mod = await import('../PasswordZapper/passwordZapperFireworks')
        if (fwCanvasRef.current && typeof (mod as { default?: unknown }).default === 'function') {
          cleanup = ((mod as { default: (c: HTMLCanvasElement) => (() => void) }).default)(fwCanvasRef.current)
        }
      } catch {
        void 0
      }
    })()
    return () => {
      try { if (cleanup) cleanup() } catch { void 0 }
    }
  }, [showEnd])

  useEffect(() => {
    // load best time for this age group
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        const key = `bugcleanup_best_time_${effectiveAge}`
        const raw = localStorage.getItem(key)
        if (raw) setBestTimeMs(Number(raw))
        else setBestTimeMs(null)
      }
    } catch {
      void 0
    }
  }, [effectiveAge])

  // Persist best time only when the game ends normally (not when user stopped the game)
  useEffect(() => {
    if (!showEnd) return
    if (stoppedByUser) return
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined' && elapsedMs > 0) {
        const key = `bugcleanup_best_time_${effectiveAge}`
        const cur = localStorage.getItem(key)
        const curVal = cur ? Number(cur) : null
        if (curVal === null || elapsedMs < curVal) {
          localStorage.setItem(key, String(elapsedMs))
          setBestTimeMs(elapsedMs)
        }
      }
    } catch {
      void 0
    }
  }, [showEnd, stoppedByUser, elapsedMs, effectiveAge])

  // Persist highscore to backend so organiser's leaderboard updates automatically.
  // NOTE: moved below so finalScore is declared before the effect (see later in file).

  const formatMs = (ms: number) => {
    const s = Math.floor(ms / 1000)
    return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`
  }

  const bestFormatted = bestTimeMs ? formatMs(bestTimeMs) : '--:--'

  // startGame is replaced by startPractice/startRealGame flow

  const restartGame = () => {
    resetGameState()
    setShowIntro(true)
    setShowEnd(false)
    setPaused(false)
    setShowHelp(false)
    setShowHint(false)
    try { setStoppedByUser(false) } catch { /* ignore */ }
    setRunning(false)
  }

  // If we're in a practice run, the progress is out of 3 removals. Otherwise use the normal total.
  const uiTotalBugs = inPractice ? 3 : totalBugsForProgress
  const uiRemoved = inPractice ? practiceRemoved : bugsRemoved
  const progressPercent = Math.max(0, Math.min(100, Math.round((uiRemoved / uiTotalBugs) * 100)))
  // mistakes is available as needed
  // Map elapsed time to a 0-100 score (time-based scoring)
  const mapTimeToScore = (ms: number) => {
    // 0:00 - 2:00 => 100
    if (ms <= 120_000) return 100
    // 2:00 - 2:30 => 90
    if (ms <= 150_000) return 90
    // after 2:30 decrease by 10 points every 30s
    const extra = Math.floor((ms - 150_000) / 30_000)
    const score = 90 - extra * 10
    return Math.max(0, Math.min(100, score))
  }

  const clampedScorePercent = mapTimeToScore(elapsedMs)
  // finalScore should reflect the percent points (so 100% => 100 points)
  const finalScore = Math.max(0, Math.min(100, Math.round(clampedScorePercent)))
  // compute stars based on elapsed time (faster = more stars)
  const elapsedSec = Math.floor(elapsedMs / 1000)
  const STAR_THRESHOLDS: Record<AgeGroup, [number, number, number]> = {
    '8-10': [90, 150, 210],
    '11-13': [80, 130, 200],
    '14-16': [60, 110, 170]
  }
  const [t1, t2, t3] = STAR_THRESHOLDS[effectiveAge]
  // If the player reached full progress (100% or removed required bugs), always show 3 stars.
  // Otherwise fall back to the existing time-based thresholds.
  const starCount = (bugsRemoved >= totalBugsForProgress || progressPercent >= 100)
    ? 3
    : (elapsedMs > 0 ? (elapsedSec <= t1 ? 3 : elapsedSec <= t2 ? 2 : elapsedSec <= t3 ? 1 : 0) : 0)

  // When the user stopped the game via the pause->Stoppen action, we must
  // display the same end-screen markup but show zeros for everything and
  // prevent persistence. Compute display values that the JSX will use so the
  // structure (HTML/CSS) remains identical while numbers become 0.
  const displayFinalScore = stoppedByUser ? 0 : finalScore
  const displayClampedPercent = stoppedByUser ? 0 : clampedScorePercent
  const displayElapsedMs = stoppedByUser ? 0 : elapsedMs
  const displayStarCount = stoppedByUser ? 0 : starCount
  const circleStyle = ({ ['--pz-score-pct' as unknown as string]: `${displayClampedPercent}%` } as unknown) as CSSProperties

  // bestTimeMs kept for persistence, formatted string not needed here

  const bugSpriteByVariant: Record<BugVariant, string> = {
    red: redBugSvg,
    green: greenBugSvg,
    purple: purpleBugSvg,
    orange: orangeBugSvg,
    'big-red-orange': bigRedOrangeBugSvg,
    'big-purple-green': bigPurpleGreenBugSvg
  }

  // Persist highscore to backend so organiser's leaderboard updates automatically.
  // Mirrors the robust logic used by PrinterSlaatOpHol: keep a local best, avoid
  // overwriting a higher per-game score on the server and notify other tabs.
  useEffect(() => {
    if (!showEnd) return
    if (stoppedByUser) return
    // Do not persist when the player was only in a practice run
    if (inPractice) return

    (async () => {
      try {
        const localKey = 'pz-highscore_bugcleanup'
        // Compute authoritative final score (0-100) using existing mapping
        const finalScoreVal = finalScore

        // Update local stored highscore (keep max) and compute the authoritative
        // finalHigh value we will persist to the backend.
        let finalHigh = finalScoreVal
        try {
          const existingRaw = localStorage.getItem(localKey)
          const existingNum = existingRaw ? (Number(existingRaw) || 0) : 0
          finalHigh = Math.max(existingNum || 0, finalScoreVal)
          localStorage.setItem(localKey, String(finalHigh))
        } catch { /* ignore localStorage errors */ }

        // Resolve session/player identifiers
        const playerNumberRaw = typeof window !== 'undefined' ? sessionStorage.getItem('playerNumber') || '' : ''
        const sessionStorageId = typeof window !== 'undefined' ? sessionStorage.getItem('playerSessionId') : null
        const localStorageId = typeof window !== 'undefined' ? localStorage.getItem('currentSessionId') : null
        const sid = (sessionStorageId && sessionStorageId !== 'null') ? sessionStorageId : (localStorageId ?? '')
        if (!sid || !playerNumberRaw) return

        const normalizedPlayerNumber = String((playerNumberRaw || '').toString().replace(/\D/g, '')).padStart(3, '0')

        try {
          const api = await import('../../../api')
          // Read existing player entry to avoid overwriting a higher per-game score
          let shouldUpdate = true
          let foundCategory: string | undefined = undefined
          let found: Record<string, unknown> | undefined = undefined

          try {
            const pResp = await api.fetchPlayersRawForSession(sid)
            const respTyped = pResp as { players?: unknown[] } | null
            const list = Array.isArray(respTyped?.players) ? (respTyped!.players as Record<string, unknown>[]) : []
            found = list.find((p) => {
              const pn = String(p['playerNumber'] ?? p['nummer'] ?? '')
              return pn.padStart(3, '0') === normalizedPlayerNumber || pn === normalizedPlayerNumber
            })

            if (found) {
              // Try to find an explicit per-game score for bugcleanup on the server
              let existingGameScore: number | undefined = undefined
              try {
                const rawTop = (found as Record<string, unknown>)['score_bugcleanup']
                if (typeof rawTop === 'number' && !Number.isNaN(rawTop)) existingGameScore = Number(rawTop)
                else if (typeof rawTop === 'string' && rawTop.trim() !== '' && !Number.isNaN(Number(rawTop))) existingGameScore = Number(rawTop)
              } catch { /* ignore */ }

              try {
                if (typeof existingGameScore !== 'number') {
                  const hs = (found as Record<string, unknown>)['highscores'] as Record<string, unknown> | undefined
                  if (hs && typeof hs['score_bugcleanup'] !== 'undefined') {
                    const raw = hs['score_bugcleanup']
                    const n = typeof raw === 'number' ? raw : (typeof raw === 'string' ? Number(raw) : NaN)
                    if (!Number.isNaN(n)) existingGameScore = Number(n)
                  }
                }
              } catch { /* ignore */ }

              if (typeof existingGameScore === 'number' && !Number.isNaN(existingGameScore)) {
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
            // Aggregate other per-game scores so legacy `score` remains meaningful
            let otherGame = 0
            try {
              for (const k of Object.keys(found || {})) {
                try {
                  const lk = k.toLowerCase()
                  if (lk.includes('score') || lk.includes('highscore')) {
                    if (lk.includes('bugcleanup')) continue
                    const raw = (found as Record<string, unknown>)[k]
                    const n = typeof raw === 'number' ? raw : (typeof raw === 'string' ? Number(raw) : NaN)
                    if (!Number.isNaN(n)) otherGame += Number(n)
                  }
                } catch { /* ignore per-key */ }
              }
              try {
                const hs = (found as Record<string, unknown>)['highscores'] as Record<string, unknown> | undefined
                if (hs && typeof hs === 'object') {
                  for (const k of Object.keys(hs)) {
                    try {
                      if (String(k).toLowerCase().includes('bugcleanup')) continue
                      const raw = hs[k]
                      const n = typeof raw === 'number' ? raw : (typeof raw === 'string' ? Number(raw) : NaN)
                      if (!Number.isNaN(n)) otherGame += Number(n)
                    } catch { /* ignore per-key */ }
                  }
                }
              } catch { /* ignore highscores */ }
            } catch { /* ignore */ }

            const finalScoreForPayload = finalHigh
            const aggregated = finalScoreForPayload + (Number.isNaN(otherGame as unknown as number) ? 0 : otherGame)
            const payload: Record<string, unknown> = { score_bugcleanup: finalScoreForPayload, score: aggregated, highscores: { score_bugcleanup: finalScoreForPayload } }
            if (foundCategory) (payload as Record<string, unknown>)['category'] = foundCategory

            try {
              await api.updatePlayerInSession(sid, normalizedPlayerNumber, payload as unknown as ApiPlayer)
            } catch (err) {
              void err
              await new Promise((r) => setTimeout(r, 250))
              try { await api.updatePlayerInSession(sid, normalizedPlayerNumber, payload as unknown as ApiPlayer) } catch { /* ignore */ }
            }

            // Notify other tabs/organiser UI quickly via localStorage key
            try {
              const key = 'pz_score_update'
              const payload2 = JSON.stringify({ sessionId: sid, playerNumber: normalizedPlayerNumber, score: finalHigh, ts: Date.now() })
              localStorage.setItem(key, payload2)
              try { window.dispatchEvent(new StorageEvent('storage', { key, newValue: payload2 })) } catch { /* ignore */ }
              try { window.dispatchEvent(new CustomEvent('pz_score_update', { detail: { sessionId: sid, playerNumber: normalizedPlayerNumber, score: finalHigh, ts: Date.now() } })) } catch { /* ignore */ }
            } catch { /* ignore */ }
          }
        } catch (err) {
          console.warn('BugCleanup: failed to persist score to server', err)
        }
      } catch (err) {
        console.warn('BugCleanup: persist highscore failed', err)
      }
    })()
  }, [showEnd, stoppedByUser, inPractice, finalScore])

  return (
    <div className="pz-layout bugcleanup-root" style={{ position: 'fixed', top: 'var(--nav-height)', left: 0, right: 0, bottom: 'var(--bottombar-height)', border: '10px solid #000', boxSizing: 'border-box', zIndex: 900 }}>
      {!showEnd && (
        // include the legacy `bc-pill` class so tests that query for it succeed
        <div className="pz-score-stack bc-pill" style={inPractice ? { position: 'absolute', top: '8px', left: '8px' } : undefined}>
          <div className={inPractice ? 'pz-score' : 'pz-score pz-timer'}>{inPractice ? 'Oefenronde' : (running ? formatMs(elapsedMs) : '00:00')}</div>
        </div>
      )}

      {!showEnd && feedback && <div className="pz-feedback pz-feedback--good">{feedback}</div>}

      {!showEnd && (
        <div
          className="bc-progress"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={uiTotalBugs}
          aria-valuenow={uiRemoved}
          // When in practice mode place the progress bar near the bottom-left and make it compact
          style={inPractice ? { position: 'absolute', bottom: '8px', left: '8px', width: '160px' } : undefined}
        >
          <div className="bc-progress-label">Bugs verwijderd</div>
          <div className="bc-progress-track">
            <div className="bc-progress-fill" style={{ width: `${progressPercent}%` }} />
            <div className="bc-progress-text">{uiRemoved}/{uiTotalBugs}</div>
          </div>
        </div>
      )}

      <div
        className="game-area bc-area"
        ref={gameAreaRef}
        onClick={handleAreaClick}
        // use a CSS background so we can reliably apply `background-size: contain` and align to bottom
        style={{ backgroundImage: `url(${wallpaperBugCleanup})` }}
      >

        {bugs.map((bug) => (
          <div
            key={bug.id}
            className="bc-bug"
            style={{ left: `${bug.x - bug.size / 2}px`, top: `${bug.y - bug.size / 2}px`, width: `${bug.size}px`, height: `${bug.size}px` }}
          >
            <img src={bugSpriteByVariant[bug.variant]} className="bc-bug-img" alt="" aria-hidden />
          </div>
        ))}

        {!showEnd && (
          <img src={cursorSvg} alt="" aria-hidden className="bc-lag-cursor" style={{ left: `${cursorPos.x}px`, top: `${cursorPos.y}px` }} />
        )}
      </div>

      {showIntro && (
        <div className="pz-start-overlay">
          <div className="pz-start-modal">
            <h2>Speluitleg - Bug Cleanup</h2>
            <ul className="pz-start-bullets">
              {introText.map((line) => <li key={line}>{line}</li>)}
            </ul>
            <div style={{ textAlign: 'center' }}>
              <button className="pz-start-btn pz-start-btn--large" onClick={openPracticeStart}>Volgende</button>
            </div>
          </div>
        </div>
      )}

      {showPracticeStart && (
        <div className="pz-start-overlay">
          <div className="pz-start-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Even oefenen!</h2>
            <p style={{ marginTop: 12, textAlign: 'left' }}>Beweeg je muis of vinger en raak de bugs.</p>
            <p style={{ textAlign: 'left' }}>Elke bug die je verwijdert maakt je cursor sneller</p>
            <div style={{ display: 'flex', flexDirection: 'column', marginTop: 18, alignItems: 'center' }}>
              <button className="pz-start-btn pz-start-btn--large" onClick={startPractice}>Spelen</button>
              <button className="pz-start-btn pz-start-btn--large" style={{ marginTop: 12 }} onClick={startRealGame}>Oefenronde Overslaan</button>
            </div>
          </div>
        </div>
      )}

      {showPracticeEnd && (
        <div className="pz-start-overlay">
          <div className="pz-start-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Het echte spel begint nu</h2>
            <p style={{ marginTop: 12, textAlign: 'left' }}>Punten tellen mee. Succes!</p>
            <div style={{ display: 'flex', flexDirection: 'column', marginTop: 18, alignItems: 'center' }}>
              <button className="pz-start-btn pz-start-btn--large" onClick={() => { setShowPracticeEnd(false); startRealGame(); }}>Spelen</button>
              <button className="pz-start-btn pz-start-btn--large" style={{ marginTop: 12 }} onClick={() => { setShowPracticeEnd(false); setShowPracticeStart(true); }}>Opnieuw oefenen</button>
            </div>
          </div>
        </div>
      )}

      {showHelp && (
        <div className="pz-pause-overlay" onClick={() => setShowHelp(false)}>
          <div className="pz-pause-modal pz-help-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Speluitleg - Bug Cleanup</h2>
            <div className="pz-hint-container" style={{ marginTop: 12 }}>
              <ul className="pz-start-bullets pz-hint-bullets">
                {introText.map((line) => <li key={line} className="pz-hint-item">{line}</li>)}
              </ul>
              <div style={{ textAlign: 'center' }}>
                <button className="pz-start-btn pz-start-btn--large" onClick={() => { setShowHelp(false); setPaused(false); }}>Verder spelen</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showHint && (
        <div className="pz-pause-overlay">
          <div className="pz-pause-modal pz-hint-modal">
            <h2>Hint</h2>
            <div className="pz-hint-container" style={{ marginTop: 12 }}>
              <ul className="pz-start-bullets pz-hint-bullets">
                {hintText.map((line) => <li key={line} className="pz-hint-item">{line}</li>)}
              </ul>
              <div style={{ textAlign: 'center' }}>
                <button className="pz-start-btn pz-start-btn--large" onClick={() => { setShowHint(false); setPaused(false); }}>Verder spelen</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {paused && !showPracticeEnd && (
        <div className="pz-pause-overlay">
          <div className="pz-pause-modal">
            <h2>Pauze</h2>
            <div className="pz-pause-actions">
              <button id="btnContinueGame" className="pz-pause-action pz-pause-action--primary" onClick={() => setPaused(false)}>Verder spelen</button>
              <button id="btnRestartGame" className="pz-pause-action pz-pause-action--primary" onClick={restartGame}>Opnieuw beginnen</button>
              <button id="btnStopGame" className="pz-pause-action pz-pause-action--danger" onClick={() => {
                // Mark as stopped by user and show end screen without persisting time/score
                try { setPaused(false) } catch { /* ignore */ }
                try { setRunning(false) } catch { /* ignore */ }
                try { setStoppedByUser(true) } catch { /* ignore */ }
                try { setShowEnd(true) } catch { /* ignore */ }
                // notify parent that game ended with 0 score
                try { if (onEnd) onEnd({ score: 0, timeMs: elapsedMs, mistakes }) } catch { /* ignore */ }
              }}>Stoppen</button>
            </div>
          </div>
        </div>
      )}

      {showEnd && (
        <div className="pz-end">
          <div className="pz-best-top">
            <div className="pz-best-top__label">Snelste tijd: <span className="pz-best-top__time">{bestFormatted}</span></div>
          </div>
          <div className="pz-end-box">
            <canvas ref={fwCanvasRef} className="pz-fireworks-canvas" aria-hidden={true} />
            <div className="pz-end-content">
              <>
                <div className="pz-end-left">
                  <div className="pz-score-circle" aria-hidden style={circleStyle}>
                    <div className="pz-score-label">SCORE</div>
                    <div className="pz-score-number">{displayFinalScore}</div>
                    <div className="pz-score-percent">{displayClampedPercent}%</div>
                    <div className="pz-score-stars" aria-hidden>
                      {Array.from({ length: 3 }).map((_, i) => (
                        <span key={i} className={`pz-star ${i < displayStarCount ? 'pz-star--filled' : 'pz-star--empty'}`} aria-hidden>
                          <svg viewBox="0 0 24 24" role="img" aria-hidden="true" focusable="false">
                            <path d="M12 .587l3.668 7.431 8.2 1.193-5.934 5.788 1.402 8.168L12 18.896l-7.336 3.869 1.402-8.168L.132 9.211l8.2-1.193z" />
                          </svg>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pz-stats-row">
                    <div className="pz-time-card">
                      <div className="pz-time-card__header">Behaalde tijd</div>
                      <div className="pz-time-card__body">{formatMs(displayElapsedMs)}</div>
                    </div>
                  </div>
                </div>

                <div className="pz-end-right">
                  <div className="pz-tips-card">
                    <h3>{stoppedByUser ? 'Spel gestopt, geen score' : 'Tip voor een snelle computer'}</h3>
                    <div className="pz-tips">
                      <ul>
                        <li>{stoppedByUser ? 'Je spel is gestopt en er is geen score opgeslagen.' : END_TIP_BY_AGE[effectiveAge]}</li>
                      </ul>
                    </div>
                    <div className="pz-end-actions" style={{ textAlign: 'center' }}>
                      <button id="btnPlayAgain" className="pz-play-again" onClick={restartGame}>Opnieuw spelen</button>
                    </div>
                  </div>
                </div>
              </>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

