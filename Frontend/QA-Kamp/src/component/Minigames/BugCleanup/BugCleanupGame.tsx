import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './BugCleanupGame.css'
import '../PasswordZapper/PasswordZapperGame.css'
import redBugSvg from '../../../assets/BugCleanupImages/RedBug.svg'
import greenBugSvg from '../../../assets/BugCleanupImages/GreenBug.svg'
import purpleBugSvg from '../../../assets/BugCleanupImages/PurpleBug.svg'
import orangeBugSvg from '../../../assets/BugCleanupImages/OrangeBug.svg'
import bigRedOrangeBugSvg from '../../../assets/BugCleanupImages/BigRedOrangeBug.svg'
import bigPurpleGreenBugSvg from '../../../assets/BugCleanupImages/BigPurpleGreenBug.svg'
import wallpaperBugCleanup from '../../../assets/BugCleanupImages/WallpaperBugCleanup.png'

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
}

const AGE_SETTINGS: Record<AgeGroup, { totalBugs: number; visibleMax: number; baseSize: number; speedMin: number; speedMax: number; splitOnHit: boolean; startLag: number; lagGain: number; maxLag: number }> = {
  '8-10': { totalBugs: 15, visibleMax: 3, baseSize: 108, speedMin: 24, speedMax: 46, splitOnHit: false, startLag: 0.012, lagGain: 0.006, maxLag: 0.08 },
  '11-13': { totalBugs: 25, visibleMax: 4, baseSize: 86, speedMin: 36, speedMax: 64, splitOnHit: false, startLag: 0.015, lagGain: 0.005, maxLag: 0.09 },
  '14-16': { totalBugs: 30, visibleMax: 4, baseSize: 68, speedMin: 62, speedMax: 116, splitOnHit: true, startLag: 0.017, lagGain: 0.0045, maxLag: 0.1 }
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

function inferAgeGroup(value?: string | null): AgeGroup {
  const raw = String(value || '').toLowerCase()
  if (/8\D*10/.test(raw)) return '8-10'
  if (/11\D*13/.test(raw)) return '11-13'
  if (/14\D*16/.test(raw)) return '14-16'
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
  const [showEnd, setShowEnd] = useState(false)
  const [running, setRunning] = useState(false)
  const [score, setScore] = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [bugsRemoved, setBugsRemoved] = useState(0)
  const [bugs, setBugs] = useState<Bug[]>([])
  const [cursorPos, setCursorPos] = useState({ x: 100, y: 100 })
  const [feedback, setFeedback] = useState<string | null>(null)
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

  const introText = INTRO_BY_AGE[effectiveAge]
  const hintText = HINT_BY_AGE[effectiveAge]

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
    lastFrameRef.current = null
  }, [cfg.startLag, cfg.visibleMax, effectiveAge])

  const finishGame = useCallback(() => {
    // Ensure any modal/pause state is cleared so overlays don't remain visible
    setRunning(false)
    setPaused(false)
    setShowHelp(false)
    setShowHint(false)
    setShowIntro(false)
    setShowEnd(true)
    try {
      onEnd?.({ score, timeMs: elapsedMs, mistakes })
    } catch {
      void 0
    }
  }, [elapsedMs, mistakes, onEnd, score])

  const removeBugByHover = useCallback((bug: Bug) => {
    if (!running || paused || showIntro || showHelp || showHint || showEnd) return
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
        const childVariant: BugVariant = bug.variant === 'big-red-orange' ? 'orange' : 'purple'
        const childSize = Math.max(24, bug.size * 0.54)
        spawnedChildren.push(
          {
            id: nextBugIdRef.current++,
            x: Math.max(childSize / 2, Math.min(bounds.w - childSize / 2, bug.x - 10)),
            y: Math.max(childSize / 2, Math.min(bounds.h - childSize / 2, bug.y - 10)),
            vx: -Math.abs(bug.vx) * 1.2,
            vy: Math.abs(bug.vy) * 1.1,
            size: childSize,
            variant: childVariant,
            shape: 'triangle',
            isSplitChild: true
          },
          {
            id: nextBugIdRef.current++,
            x: Math.max(childSize / 2, Math.min(bounds.w - childSize / 2, bug.x + 10)),
            y: Math.max(childSize / 2, Math.min(bounds.h - childSize / 2, bug.y + 10)),
            vx: Math.abs(bug.vx) * 1.2,
            vy: -Math.abs(bug.vy) * 1.1,
            size: childSize,
            variant: childVariant,
            shape: 'square',
            isSplitChild: true
          }
        )
      }

      const nextBugs = [...kept, ...spawnedChildren]
      while (nextBugs.length < cfg.visibleMax && !shouldFinishRef.current) {
        nextBugs.push(createRandomBug(nextBugIdRef.current++, effectiveAge, bounds))
      }
      return nextBugs
    })

    setScore((s) => s + 2)
    setFeedback('Goed! +2')
    window.setTimeout(() => setFeedback(null), 600)
    lagFactorRef.current = Math.min(cfg.maxLag, lagFactorRef.current + cfg.lagGain)
    setBugsRemoved((n) => {
      const next = n + 1
      if (next >= totalBugsForProgress) shouldFinishRef.current = true
      return next
    })

    window.setTimeout(() => {
      removingIdsRef.current.delete(bug.id)
    }, 250)
  }, [cfg.lagGain, cfg.maxLag, cfg.splitOnHit, cfg.visibleMax, effectiveAge, paused, running, showEnd, showHelp, showHint, showIntro, totalBugsForProgress])

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

    // miss: increment mistakes, add 10 seconds and show feedback
    setMistakes((m) => m + 1)
    // miss: increment mistakes (no time/score penalty)
  }, [bugs, paused, running, showEnd, showHelp, showHint, showIntro])

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

      cursorRef.current.x += (mouseRef.current.x - cursorRef.current.x) * lagFactorRef.current
      cursorRef.current.y += (mouseRef.current.y - cursorRef.current.y) * lagFactorRef.current
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
    const onPause = () => setPaused(true)
    const onHelp = () => setShowHelp(true)
    const onHint = () => setShowHint(true)
    window.addEventListener('minigame:pause', onPause as EventListener)
    window.addEventListener('minigame:question', onHelp as EventListener)
    window.addEventListener('minigame:hint', onHint as EventListener)
    return () => {
      window.removeEventListener('minigame:pause', onPause as EventListener)
      window.removeEventListener('minigame:question', onHelp as EventListener)
      window.removeEventListener('minigame:hint', onHint as EventListener)
    }
  }, [])

  useEffect(() => {
    const modalOpen = showIntro || showHelp || showHint || paused
    const clsModal = 'pz-modal-open'
    const clsEnd = 'pz-end-open'
    if (modalOpen) document.body.classList.add(clsModal)
    else document.body.classList.remove(clsModal)
    if (showEnd) document.body.classList.add(clsEnd)
    else document.body.classList.remove(clsEnd)
    return () => {
      document.body.classList.remove(clsModal)
      document.body.classList.remove(clsEnd)
    }
  }, [paused, showEnd, showHelp, showHint, showIntro])

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

  const formatMs = (ms: number) => {
    const s = Math.floor(ms / 1000)
    return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`
  }

  const startGame = () => {
    resetGameState()
    setShowIntro(false)
    setShowEnd(false)
    setRunning(true)
    setPaused(false)
  }

  const restartGame = () => {
    resetGameState()
    setShowIntro(true)
    setShowEnd(false)
    setPaused(false)
    setShowHelp(false)
    setShowHint(false)
    setRunning(false)
  }

  const progressPercent = Math.max(0, Math.min(100, Math.round((bugsRemoved / totalBugsForProgress) * 100)))
  const finalScore = Math.max(0, score)
  const totalWrong = mistakes
  const maxPossibleScore = totalBugsForProgress * 2
  const rawPercent = maxPossibleScore > 0 ? Math.round((finalScore / maxPossibleScore) * 100) : 0
  const clampedScorePercent = Math.max(0, Math.min(100, rawPercent))
  const starCount = clampedScorePercent === 100 ? 3 : clampedScorePercent >= 66 ? 2 : clampedScorePercent >= 33 ? 1 : 0
  const circleStyle = ({ ['--pz-score-pct' as unknown as string]: `${clampedScorePercent}%` } as unknown) as React.CSSProperties

  const bugSpriteByVariant: Record<BugVariant, string> = {
    red: redBugSvg,
    green: greenBugSvg,
    purple: purpleBugSvg,
    orange: orangeBugSvg,
    'big-red-orange': bigRedOrangeBugSvg,
    'big-purple-green': bigPurpleGreenBugSvg
  }

  return (
    <div className="pz-layout bugcleanup-root" style={{ position: 'fixed', top: 'var(--nav-height)', left: 0, right: 0, bottom: 'var(--bottombar-height)', border: '10px solid #000', boxSizing: 'border-box', zIndex: 900 }}>
      {!showEnd && (
        <div className="bc-score-stack">
          <div className="bc-pill">{running ? formatMs(elapsedMs) : '00:00'}</div>
        </div>
      )}

      {!showEnd && feedback && <div className="pz-feedback pz-feedback--good">{feedback}</div>}

      {!showEnd && (
        <div className="bc-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPercent}>
          <div className="bc-progress-label">Bugs verwijderd</div>
          <div className="bc-progress-track">
            <div className="bc-progress-fill" style={{ width: `${progressPercent}%` }} />
            <div className="bc-progress-text">{bugsRemoved}/{totalBugsForProgress}</div>
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

        {!showEnd && <div className="bc-lag-cursor" style={{ left: `${cursorPos.x}px`, top: `${cursorPos.y}px` }} />}
      </div>

      {showIntro && (
        <div className="pz-start-overlay">
          <div className="pz-start-modal">
            <h2>Speluitleg - Bug Cleanup</h2>
            <ul className="pz-start-bullets">
              {introText.map((line) => <li key={line}>{line}</li>)}
            </ul>
            <div style={{ textAlign: 'center' }}>
              <button className="pz-start-btn pz-start-btn--large" onClick={startGame}>Volgende</button>
            </div>
          </div>
        </div>
      )}

      {showHelp && (
        <div className="pz-start-overlay" onClick={() => setShowHelp(false)}>
          <div className="pz-start-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Speluitleg - Bug Cleanup</h2>
            <ul className="pz-start-bullets">
              {introText.map((line) => <li key={line}>{line}</li>)}
            </ul>
            <div style={{ textAlign: 'center' }}>
              <button className="pz-start-btn" onClick={() => setShowHelp(false)}>Verder spelen</button>
            </div>
          </div>
        </div>
      )}

      {showHint && (
        <div className="pz-start-overlay">
          <div className="pz-start-modal pz-hint-container">
            <h2>Hint</h2>
            <ul className="pz-hint-bullets">
              {hintText.map((line) => <li key={line}>{line}</li>)}
            </ul>
            <div style={{ textAlign: 'center' }}>
              <button className="pz-start-btn" onClick={() => setShowHint(false)}>Verder spelen</button>
            </div>
          </div>
        </div>
      )}

      {paused && (
        <div className="pz-pause-overlay">
          <div className="pz-pause-modal">
            <h2>Pauze</h2>
            <div className="pz-pause-actions">
              <button className="pz-pause-action pz-pause-action--primary" onClick={() => setPaused(false)}>Verder spelen</button>
              <button className="pz-pause-action pz-pause-action--primary" onClick={restartGame}>Opnieuw beginnen</button>
              <button className="pz-pause-action pz-pause-action--danger" onClick={() => finishGame()}>Stoppen</button>
            </div>
          </div>
        </div>
      )}

      {showEnd && (
        <div className="pz-end">
          <div className="pz-end-box">
            <canvas ref={fwCanvasRef} className="pz-fireworks-canvas" aria-hidden={true} />
            <div className="pz-end-content">
              <div className="pz-end-left">
                <div className="pz-score-circle" aria-hidden style={circleStyle}>
                  <div className="pz-score-label">SCORE</div>
                  <div className="pz-score-number">{finalScore}</div>
                  <div className="pz-score-percent">{clampedScorePercent}%</div>
                  <div className="pz-score-stars" aria-hidden>
                    {Array.from({ length: 3 }).map((_, i) => (
                      <span key={i} className={`pz-star ${i < starCount ? 'pz-star--filled' : 'pz-star--empty'}`} aria-hidden>
                        <svg viewBox="0 0 24 24" role="img" aria-hidden="true" focusable="false">
                          <path d="M12 .587l3.668 7.431 8.2 1.193-5.934 5.788 1.402 8.168L12 18.896l-7.336 3.869 1.402-8.168L.132 9.211l8.2-1.193z" />
                        </svg>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pz-stats-row">
                  <div className="pz-stats-correct">
                    <div className="shine" aria-hidden />
                    <div className="label">Juist</div>
                    <div className="score"><span className="plus">+</span>{bugsRemoved}</div>
                  </div>
                  <div className="pz-stats-wrong">
                    <div className="shine" aria-hidden />
                    <div className="label">Fout</div>
                    <div className="score"><span className="minus">-</span>{totalWrong}</div>
                  </div>
                </div>
              </div>

              <div className="pz-end-right">
                <div className="pz-tips-card">
                  <h3>Goed gedaan!</h3>
                  <div className="pz-tips">
                    <p>{`Score: ${finalScore} — Tijd: ${formatMs(elapsedMs)} — Fouten: ${mistakes}`}</p>
                  </div>
                  <div className="pz-end-actions">
                    <button id="btnPlayAgain" className="pz-play-again" onClick={restartGame}>Opnieuw spelen</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

