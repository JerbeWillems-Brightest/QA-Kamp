import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import './BugCleanupGame.css';

type AgeGroup = '8-10' | '11-13' | '14-16'

interface Props {
  ageGroup?: AgeGroup
  onEnd?: (results: { score: number; timeMs: number; mistakes: number }) => void
}

type Bug = { id: number; x: number; y: number; size: number }

const AGE_CONFIG: Record<AgeGroup, { bugs: number }> = {
  '8-10': { bugs: 15 },
  '11-13': { bugs: 25 },
  '14-16': { bugs: 30 }
}

export default function BugCleanupGame({ ageGroup = '11-13', onEnd }: Props) {
  // Game state
  const [running, setRunning] = useState(false)
  const [paused, setPaused] = useState(false)
  const [showTutorial, setShowTutorial] = useState(true)
  const [score, setScore] = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const [bugs, setBugs] = useState<Bug[]>([])

  // Timer
  const startTimeRef = useRef<number | null>(null)
  const [elapsedMs, setElapsedMs] = useState(0)
  const rafRef = useRef<number | null>(null)

  // Cursor lag simulation
  const mouseRef = useRef({ x: 0, y: 0 })
  const cursorRef = useRef({ x: 0, y: 0 })
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 })
  const speedRef = useRef(0.12) // interpolation speed, increases when bugs removed
  const containerRef = useRef<HTMLDivElement | null>(null)

  // Penalty thresholds (ms) depending on age group (stable with useMemo)
  const penaltyThresholds = useMemo(() => (ageGroup === '8-10' ? [120_000, 180_000] : [90_000, 120_000, 150_000, 180_000, 210_000]), [ageGroup])
  const appliedPenaltiesRef = useRef<Record<number, boolean>>({})

  // helper: spawn bugs (stable callback)
  const spawnBugs = useCallback((count: number) => {
    const list: Bug[] = []
    for (let i = 0; i < count; i++) {
      list.push({ id: i + 1, x: 40 + Math.random() * 520, y: 40 + Math.random() * 320, size: (ageGroup === '8-10' ? 36 : ageGroup === '11-13' ? 28 : 20) })
    }
    return list
  }, [ageGroup])

  // helper: check and apply time-based penalties (stable callback)
  const checkPenalties = useCallback(() => {
    const elapsed = Date.now() - (startTimeRef.current || Date.now())
    penaltyThresholds.forEach((t, idx) => {
      if (elapsed >= t && !appliedPenaltiesRef.current[idx]) {
        appliedPenaltiesRef.current[idx] = true
        setScore(s => Math.max(0, s - 2))
      }
    })
  }, [penaltyThresholds])

  useEffect(() => {
    // Initial spawn
    const cfg = AGE_CONFIG[ageGroup]
    // schedule setState to avoid cascading synchronous state updates in effects
    const t = window.setTimeout(() => setBugs(spawnBugs(cfg.bugs)), 0)
    // focus for mouse events
    const onMove = (e: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      mouseRef.current.x = e.clientX - rect.left
      mouseRef.current.y = e.clientY - rect.top
    }
    window.addEventListener('mousemove', onMove)
    return () => { window.removeEventListener('mousemove', onMove); clearTimeout(t) }
  }, [ageGroup, spawnBugs])

  useEffect(() => {
    if (running && !paused) {
      if (startTimeRef.current == null) startTimeRef.current = Date.now()
      const loop = () => {
        // update interpolation cursor
        cursorRef.current.x += (mouseRef.current.x - cursorRef.current.x) * speedRef.current
        cursorRef.current.y += (mouseRef.current.y - cursorRef.current.y) * speedRef.current
        setElapsedMs(Date.now() - (startTimeRef.current || Date.now()))
        checkPenalties()
        // update render-friendly cursor position (avoid accessing refs during render)
        setCursorPos({ x: cursorRef.current.x, y: cursorRef.current.y })
        rafRef.current = requestAnimationFrame(loop)
      }
      rafRef.current = requestAnimationFrame(loop)
      return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); rafRef.current = null }
    }
  }, [running, paused, checkPenalties])

  // helpers already declared above

  function startGame() {
    setShowTutorial(false)
    setRunning(true)
    setPaused(false)
    startTimeRef.current = Date.now()
    setScore(0)
    setMistakes(0)
    appliedPenaltiesRef.current = {}
  }

  function handlePause() {
    setPaused(p => !p)
  }

  function handleBugClick(bugId: number) {
    // require that cursor overlap to count as hit - compute distance between interpolated cursor and bug
    const b = bugs.find(x => x.id === bugId)
    if (!b) return
    const dx = cursorRef.current.x - b.x
    const dy = cursorRef.current.y - b.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const hitRadius = b.size
    if (dist <= hitRadius + 8) {
      // correct
      setBugs(prev => prev.filter(x => x.id !== bugId))
      setScore(s => s + 2)
      // increase interpolation speed slightly (cursor becomes more responsive)
      speedRef.current = Math.min(0.5, speedRef.current + 0.02)
      // if no bugs left -> end
      setTimeout(() => {
        if (bugs.length - 1 <= 0) {
          endGame()
        }
      }, 0)
    } else {
      // miss
      setMistakes(m => m + 1)
      // no score change on miss
    }
  }

  function endGame() {
    setRunning(false)
    if (onEnd) onEnd({ score, timeMs: elapsedMs, mistakes })
  }

  // simple mm:ss formatter
  function formatMs(ms: number) {
    const s = Math.floor(ms / 1000)
    const mm = Math.floor(s / 60).toString().padStart(2, '0')
    const ss = (s % 60).toString().padStart(2, '0')
    return `${mm}:${ss}`
  }

  return (
    <div className="pz-layout bugcleanup-root">
      <div className="topbar">
        <div className="left">Bug Cleanup</div>
        <div className="center">{running ? formatMs(elapsedMs) : '00:00'}</div>
        <div className="right">
          <button className="hint">Hint</button>
          <button className="pause" onClick={handlePause}>{paused ? 'Resume' : 'Pause'}</button>
        </div>
      </div>

      <div className="game-area" ref={containerRef}>
        {/* background / office visual could go here */}
        <div className="info overlay">Score: {score} &nbsp; Bugs: {bugs.length} &nbsp; Mistakes: {mistakes}</div>

        {/* render bugs */}
        {bugs.map(b => (
          <div
            key={b.id}
            className="bug"
            style={{ left: b.x - b.size / 2, top: b.y - b.size / 2, width: b.size, height: b.size }}
            onClick={() => handleBugClick(b.id)}
            role="button"
            aria-label={`bug-${b.id}`}
          />
        ))}

        {/* laggy cursor visual */}
        <div
          className="lag-cursor"
          style={{ transform: `translate(${cursorPos.x}px, ${cursorPos.y}px)` }}
        />

        {/* pause overlay */}
        {paused && (
          <div className="modal">
            <div className="modal-card">
              <h3>Gepauzeerd</h3>
              <div className="modal-actions">
                <button onClick={() => setPaused(false)}>Verder spelen</button>
                <button onClick={() => { setRunning(false); setPaused(false); }}>Stoppen</button>
              </div>
            </div>
          </div>
        )}

        {/* tutorial */}
        {showTutorial && (
          <div className="modal">
            <div className="modal-card">
              <h3>Even oefenen - Bug Cleanup</h3>
              <p>De muis reageert traag. Klik op bugs om ze te verwijderen. Elke bug maakt de muis iets sneller.</p>
              <div className="modal-actions">
                <button onClick={startGame}>Start spel</button>
                <button onClick={() => { setShowTutorial(false); setRunning(true); }}>Sla over</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

