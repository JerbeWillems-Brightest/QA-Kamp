import React, { useEffect, useMemo, useRef, useState } from 'react'
import './NietZoSlimmeThermostaat.css'
import '../PasswordZapper/PasswordZapperGame.css'
// background image for thermostat (correct assets path)
import bgThermostaat from '../../../assets/NietZoSlimmeThermostaatImages/BackgroundThermostat.png'

type AgeGroup = '8-10' | '11-13' | '14-16'
type EndResults = { score: number; timeMs: number; mistakes: number }

interface Props {
  ageGroup?: AgeGroup
  onEnd?: (results: EndResults) => void
}

type Block = {
  id: string
  label: string
  icon?: string // only for 8-10
}

type Scenario = {
  id: string
  // sentence parts
  leftKeyword: 'ALS' | 'IF'
  andKeyword: 'EN' | 'AND'
  thenKeyword: 'DAN' | 'THEN'
  elseKeyword?: 'ELSE'
  fixedLeft: string
  fixedAction: string
  fixedElse?: string
  // options and correct
  options: Block[]
  correctOptionId: string
}

function inferAgeGroup(value?: string | null): AgeGroup {
  const raw = String(value || '').toLowerCase()
  try {
    // explicit range patterns like "8-10", "11 - 13", "14/16"
    if (/8\D*10/.test(raw)) return '8-10'
    if (/11\D*13/.test(raw)) return '11-13'
    if (/14\D*16/.test(raw)) return '14-16'

    // if there are digits, use the first number to determine bucket
    const nums = (raw.match(/\d+/g) || []).map(n => parseInt(n, 10)).filter(n => !Number.isNaN(n))
    if (nums.length >= 1) {
      const n = nums[0]
      if (n <= 10) return '8-10'
      if (n <= 13) return '11-13'
      return '14-16'
    }

    // loose checks for textual mentions
    if (raw.includes('8')) return '8-10'
    if (raw.includes('11') || raw.includes('12') || raw.includes('13')) return '11-13'
    if (raw.includes('14') || raw.includes('15') || raw.includes('16')) return '14-16'
  } catch {
    /* fall through to default */
  }
  return '11-13'
}

const MISTAKES_HINT_THRESHOLD: Record<AgeGroup, number> = {
  '8-10': 1,
  '11-13': 2,
  '14-16': 3
}

const INTRO_BY_AGE: Record<AgeGroup, string[]> = {
  '8-10': [
    'Sleep de juiste plaatjes naar de lege vakjes.',
    'Maak een goede zin met ALS … EN … DAN …',
    'Kijk goed na of je zin klopt'
  ],
  '11-13': [
    'Sleep de juiste blokken naar de lege vakjes.',
    'Maak een goede zin met ALS … EN … DAN …',
    'Controleer of je logica klopt voor elke situatie.'
  ],
  '14-16': [
    'Je krijgt een stukje code dat niet volledig is.',
    'Maak een regel met IF … AND … THEN … ELSE …',
    'Controleer of je logica klopt voor elke situatie.'
  ]
}

const HINT_BY_AGE: Record<AgeGroup, string[]> = {
  '8-10': ['De lamp moet aan in de nacht.'],
  '11-13': ['De lamp moet aan in de nacht'],
  '14-16': ['De lamp moet aan in de nacht']
}

const END_TIP_BY_AGE: Record<AgeGroup, string> = {
  '8-10': 'Lees de zin hardop: klopt het nog steeds?',
  '11-13': 'Kijk goed naar ALS/EN/DAN en controleer de betekenis van je keuze.',
  '14-16': 'Controleer de logica: welke conditie hoort bij THEN en wat gebeurt er in ELSE?'
}

const POSITIVE_FEEDBACK = ['Goed!', 'Top!', 'Super!', 'Helemaal juist!', 'Nice!']
const NEGATIVE_FEEDBACK = ['Fout!', 'Helaas!', 'Probeer opnieuw.']

function randFrom(list: string[]) {
  return list[Math.floor(Math.random() * list.length)]
}

function computePercent(correct: number, wrong: number) {
  const total = correct + wrong
  if (total <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((correct / total) * 100)))
}

function computeStars(percent: number) {
  const pct = Math.max(0, Math.min(100, percent))
  if (pct === 100) return 3
  if (pct >= 66) return 2
  if (pct >= 33) return 1
  return 0
}

function buildScenarioPool(age: AgeGroup): Scenario[] {
  if (age === '8-10') {
    const options: Block[] = [
      { id: 'rain', label: 'het regent', icon: '☔' },
      { id: 'night', label: 'het nacht is', icon: '🌙' },
      { id: 'cold', label: 'het koud is', icon: '❄️' },
      { id: 'warm', label: 'het warm is', icon: '🔥' },
      { id: 'day', label: 'het dag is', icon: '☀️' }
    ]
    const mk = (id: string, fixedLeft: string, correct: Block['id'], action: string): Scenario => ({
      id,
      leftKeyword: 'ALS',
      andKeyword: 'EN',
      thenKeyword: 'DAN',
      fixedLeft,
      fixedAction: action,
      options,
      correctOptionId: correct
    })
    return [
      mk('s1', 'het donker is', 'night', 'zet de lamp aan'),
      mk('s2', 'het buiten licht is', 'day', 'zet de lamp uit'),
      mk('s3', 'je jas nodig hebt', 'cold', 'doe de verwarming aan'),
      mk('s4', 'je gaat zweten', 'warm', 'doe de verwarming uit'),
      mk('s5', 'je paraplu pakt', 'rain', 'ga binnen spelen')
    ]
  }

  if (age === '11-13') {
    const options: Block[] = [
      { id: 'rain', label: 'Het regent' },
      { id: 'night', label: 'Het is nacht' },
      { id: 'cold', label: 'Het is koud' },
      { id: 'warm', label: 'Het is warm' },
      { id: 'day', label: 'Het is dag' }
    ]
    const mk = (id: string, fixedLeft: string, correct: Block['id'], action: string): Scenario => ({
      id,
      leftKeyword: 'ALS',
      andKeyword: 'EN',
      thenKeyword: 'DAN',
      fixedLeft,
      fixedAction: action,
      options,
      correctOptionId: correct
    })
    return [
      mk('s1', 'het donker is', 'night', 'zet de lamp aan'),
      mk('s2', 'het licht is', 'day', 'zet de lamp uit'),
      mk('s3', 'je het koud hebt', 'cold', 'zet de verwarming hoger'),
      mk('s4', 'je het warm hebt', 'warm', 'zet de verwarming lager'),
      mk('s5', 'je naar buiten wil', 'rain', 'pak een paraplu')
    ]
  }

  // 14-16
  const options: Block[] = [
    { id: 'IsRaining', label: 'IsRaining' },
    { id: 'IsNight', label: 'IsNight' },
    { id: 'IsCold', label: 'IsCold' },
    { id: 'IsWarm', label: 'IsWarm' },
    { id: 'IsDay', label: 'IsDay' }
  ]
  const mk = (id: string, fixedLeft: string, correct: Block['id'], thenAction: string, elseAction: string): Scenario => ({
    id,
    leftKeyword: 'IF',
    andKeyword: 'AND',
    thenKeyword: 'THEN',
    elseKeyword: 'ELSE',
    fixedLeft,
    fixedAction: thenAction,
    fixedElse: elseAction,
    options,
    correctOptionId: correct
  })
  return [
    mk('s1', 'UserHome', 'IsNight', 'LampOn()', 'LampOff()'),
    mk('s2', 'NeedsHeating', 'IsCold', 'HeatUp()', 'KeepTemp()'),
    mk('s3', 'NeedsCooling', 'IsWarm', 'CoolDown()', 'KeepTemp()'),
    mk('s4', 'Outside', 'IsRaining', 'TakeUmbrella()', 'GoOutside()'),
    mk('s5', 'Daylight', 'IsDay', 'LampOff()', 'LampOn()')
  ]
}

function pickNextScenario(pool: Scenario[], lastId?: string) {
  if (pool.length <= 1) return pool[0]
  // try to avoid immediate repeats
  for (let i = 0; i < 6; i++) {
    const s = pool[Math.floor(Math.random() * pool.length)]
    if (s.id !== lastId) return s
  }
  return pool[Math.floor(Math.random() * pool.length)]
}

export default function NietZoSlimmeThermostaat({ ageGroup, onEnd }: Props) {
  const effectiveAge: AgeGroup = useMemo(() => {
    if (ageGroup) return ageGroup
    try {
      const qsAge = new URLSearchParams(window.location.search || '').get('age')
      if (qsAge) return inferAgeGroup(qsAge)
    } catch { /* ignore */ }
    try {
      const ss = sessionStorage.getItem('playerCategory') || sessionStorage.getItem('ageGroup') || sessionStorage.getItem('age') || ''
      if (ss) return inferAgeGroup(ss)
    } catch { /* ignore */ }
    return '11-13'
  }, [ageGroup])

  const introText = INTRO_BY_AGE[effectiveAge]

  const pool = useMemo(() => buildScenarioPool(effectiveAge), [effectiveAge])

  const [showIntro, setShowIntro] = useState(true)
  const [showPracticeStart, setShowPracticeStart] = useState(false)
  const [showPracticeEnd, setShowPracticeEnd] = useState(false)
  const [isPractice, setIsPractice] = useState(false)
  const [practiceCorrect, setPracticeCorrect] = useState(0)

  const [running, setRunning] = useState(false)
  const [paused, setPaused] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [showEnd, setShowEnd] = useState(false)
  const [stoppedByUser, setStoppedByUser] = useState(false)

  const [score, setScore] = useState(0)
  const [totalCorrect, setTotalCorrect] = useState(0)
  const [totalWrong, setTotalWrong] = useState(0)

  const scoreRef = useRef(0)
  const correctRef = useRef(0)
  const wrongRef = useRef(0)
  // lock to prevent multiple rapid submissions for the same scenario
  const checkingRef = useRef(false)
  const wrongInRoundRef = useRef(0)

  useEffect(() => { scoreRef.current = score }, [score])
  useEffect(() => { correctRef.current = totalCorrect }, [totalCorrect])
  useEffect(() => { wrongRef.current = totalWrong }, [totalWrong])

  const [feedback, setFeedback] = useState<string | null>(null)
  const [feedbackType, setFeedbackType] = useState<'good' | 'bad' | null>(null)
  const [answerState, setAnswerState] = useState<'idle' | 'correct' | 'wrong'>('idle')

  const [currentScenario, setCurrentScenario] = useState<Scenario>(() => pickNextScenario(pool))
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null)

  const hintAutoShownRef = useRef(false)
  const lastScenarioIdRef = useRef<string | undefined>(undefined)

  const percent = useMemo(() => computePercent(totalCorrect, totalWrong), [totalCorrect, totalWrong])
  const starCount = useMemo(() => computeStars(percent), [percent])
  const circleStyle = useMemo(
    () => ({ ['--pz-score-pct' as unknown as string]: `${percent}%` } as unknown as React.CSSProperties),
    [percent]
  )

  const localHighKey = useMemo(() => `pz-highscore_thermostaat_${effectiveAge}`, [effectiveAge])
  const [highScore, setHighScore] = useState<number | null>(() => {
    try {
      const raw = localStorage.getItem(localHighKey)
      return raw ? Number(raw) : null
    } catch {
      return null
    }
  })
  const [isNewHigh, setIsNewHigh] = useState(false)

  // compute hint text per round based on the current scenario and age group
  const computedHint = useMemo<string[]>(() => {
    try {
      const s = currentScenario
      if (!s) return HINT_BY_AGE[effectiveAge] || []

      // find the correct option label (if present)
      const correctOpt = s.options.find((o) => o.id === s.correctOptionId)
      const condLabel = (correctOpt && correctOpt.label) ? String(correctOpt.label).trim() : ''

      // helper map for extra contextual explanation (Dutch phrasing)
      const extraMap: Record<string, string> = {
        'het warm is': 'dan ga je zweten.',
        'het koud is': 'dan krijg je het koud.',
        'het regent': 'dan neem je een paraplu mee.',
        'het dag is': 'dan is het licht.',
        'het nacht is': 'dan is het donker.',
        'het is warm': 'dan ga je zweten.',
        'het is koud': 'dan krijg je het koud.',
        'het is dag': 'dan is het licht.',
        'het is nacht': 'dan is het donker.',
        'iswarm': 'dan ga je zweten.',
        'iscold': 'dan krijg je het koud.',
        'israining': 'dan neem je een paraplu mee.',
        'isday': 'dan is het licht.',
        'isnight': 'dan is het donker.'
      }

      if (effectiveAge === '14-16') {
        // for older kids show code-like hint with THEN/ELSE
        const lines: string[] = []
        const left = s.leftKeyword || 'IF'
        const cond = condLabel || s.correctOptionId || ''
        const thenAct = s.fixedAction || s.fixedAction === '' ? s.fixedAction : ''
        const elseAct = s.fixedElse || ''
        if (cond) lines.push(`${left} ${cond} ${s.andKeyword ? s.andKeyword : ''} ... ${s.thenKeyword} ${thenAct}`.replace(/\s+/g, ' ').trim())
        if (elseAct) lines.push(`${s.elseKeyword || 'ELSE'} ${elseAct}`)
        return lines.length ? lines : (HINT_BY_AGE[effectiveAge] || [])
      }

      // natural-language hint for younger ages
      const leftWord = s.leftKeyword === 'ALS' ? 'Als' : (s.leftKeyword || 'Als')
      const thenWord = s.thenKeyword === 'DAN' ? 'dan' : (s.thenKeyword || 'dan')
      const main = condLabel ? `${leftWord} ${condLabel}, ${thenWord} ${s.fixedAction}.` : `${leftWord} ..., ${thenWord} ${s.fixedAction}.`
      // try to find an extra explanation from map (case-insensitive)
      const key = condLabel ? condLabel.toLowerCase().replace(/\s+/g, ' ') : ''
      const extra = extraMap[key] || ''
      return extra ? [main, extra] : [main]
    } catch {
      return HINT_BY_AGE[effectiveAge] || []
    }
  }, [currentScenario, effectiveAge])

  // ensure hint button is locked at start until mistakes threshold is reached
  useEffect(() => {
    try {
      const w = window as unknown as Record<string, unknown>
      w['__pz_hint_unlocked'] = false
      window.dispatchEvent(new CustomEvent('minigame:hint-locked'))
    } catch { /* ignore */ }
  }, [effectiveAge])

  // body class while modals are open (matches other minigames)
  useEffect(() => {
    const clsModal = 'pz-modal-open'
    const clsEnd = 'pz-end-open'
    try {
      const modalOpen = showIntro || showPracticeStart || showPracticeEnd || showHelp || showHint || paused
      if (modalOpen) document.body.classList.add(clsModal)
      else document.body.classList.remove(clsModal)
      if (showEnd) document.body.classList.add(clsEnd)
      else document.body.classList.remove(clsEnd)
    } catch { /* ignore */ }
    return () => {
      try { document.body.classList.remove(clsModal) } catch { /* ignore */ }
      try { document.body.classList.remove(clsEnd) } catch { /* ignore */ }
    }
  }, [paused, showEnd, showHelp, showHint, showIntro, showPracticeStart, showPracticeEnd])

  // listen to global controls (pause/help/hint)
  // Handlers are defined as stable callbacks so the effect only registers
  // and unregisters listeners (no setState calls directly inside the effect).
  const onPause = React.useCallback(() => {
    if (showIntro || showPracticeStart || showPracticeEnd || showEnd) return
    setPaused(true)
  }, [showIntro, showPracticeStart, showPracticeEnd, showEnd])

  const onHelpEvt = React.useCallback(() => {
    if (showIntro || showPracticeStart || showPracticeEnd || showEnd) return
    setShowHelp(true)
    setPaused(true)
  }, [showIntro, showPracticeStart, showPracticeEnd, showEnd])

  const onHintEvt = React.useCallback(() => {
    if (showIntro || showPracticeStart || showPracticeEnd || showEnd) return
    // Only open hint if it has been unlocked by mistakes threshold
    try {
      const w = window as unknown as Record<string, unknown>
      if (!w['__pz_hint_unlocked']) return
    } catch {
      return
    }
    setShowHint(true)
    setPaused(true)
  }, [showIntro, showPracticeStart, showPracticeEnd, showEnd])

  useEffect(() => {
    window.addEventListener('minigame:pause', onPause as EventListener)
    window.addEventListener('minigame:question', onHelpEvt as EventListener)
    window.addEventListener('minigame:hint', onHintEvt as EventListener)
    return () => {
      window.removeEventListener('minigame:pause', onPause as EventListener)
      window.removeEventListener('minigame:question', onHelpEvt as EventListener)
      window.removeEventListener('minigame:hint', onHintEvt as EventListener)
    }
  }, [onPause, onHelpEvt, onHintEvt])

  // pause freezes gameplay: just flip running flag
  useEffect(() => {
    // The code intentionally updates the explicit running state when paused changes.
    // This triggers an extra render but is intentional for the game flow.
    if (paused) setRunning(false)
    else {
      if (!showEnd && !showIntro && !showPracticeStart && !showPracticeEnd) setRunning(true)
    }
  }, [paused, showEnd, showIntro, showPracticeStart, showPracticeEnd])

  // load local highscore
  // NOTE: high score is initialized via lazy useState above, so no effect is required.

  // Per-round hint unlock: handled inline when a wrong answer is recorded.
  // (We intentionally do not unlock based on cumulative totalWrong.)

  const openPracticeStart = () => {
    setShowIntro(false)
    setShowPracticeStart(true)
    setPaused(false)
    setRunning(false)
  }

  const startPractice = () => {
    setShowPracticeStart(false)
    setIsPractice(true)
    setPracticeCorrect(0)
    setSelectedOptionId(null)
    lastScenarioIdRef.current = undefined
    setCurrentScenario(pickNextScenario(pool))
    setPaused(false)
    setRunning(true)
  }

  const startRealGame = () => {
    setShowPracticeStart(false)
    setShowPracticeEnd(false)
    setIsPractice(false)
    setPracticeCorrect(0)
    setScore(0)
    setTotalCorrect(0)
    setTotalWrong(0)
    setFeedback(null)
    setFeedbackType(null)
    setAnswerState('idle')
    setSelectedOptionId(null)
    setStoppedByUser(false)
    setShowEnd(false)
    hintAutoShownRef.current = false
    lastScenarioIdRef.current = undefined
    setCurrentScenario(pickNextScenario(pool))
    try {
      const w = window as unknown as Record<string, unknown>
      w['__pz_hint_unlocked'] = false
      window.dispatchEvent(new CustomEvent('minigame:hint-locked'))
    } catch { /* ignore */ }
    setPaused(false)
    setRunning(true)
  }

  const restartGame = () => {
    setShowIntro(true)
    setShowPracticeStart(false)
    setShowPracticeEnd(false)
    setIsPractice(false)
    setPracticeCorrect(0)
    setPaused(false)
    setRunning(false)
    setShowHint(false)
    setShowHelp(false)
    setShowEnd(false)
    setStoppedByUser(false)
    setScore(0)
    setTotalCorrect(0)
    setTotalWrong(0)
    setFeedback(null)
    setFeedbackType(null)
    setAnswerState('idle')
    setSelectedOptionId(null)
    hintAutoShownRef.current = false
    lastScenarioIdRef.current = undefined
    setCurrentScenario(pickNextScenario(pool))
    try {
      const w = window as unknown as Record<string, unknown>
      w['__pz_hint_unlocked'] = false
      window.dispatchEvent(new CustomEvent('minigame:hint-locked'))
    } catch { /* ignore */ }
  }

  const finishGame = () => {
    setRunning(false)
    setPaused(false)
    setShowHint(false)
    setShowHelp(false)
    setShowEnd(true)
    const finalScore = scoreRef.current
    const finalWrong = wrongRef.current
    try { if (onEnd) onEnd({ score: finalScore, timeMs: 0, mistakes: finalWrong }) } catch { /* ignore */ }

    // update local highscore
    try {
      const existingRaw = localStorage.getItem(localHighKey)
      const existing = existingRaw ? Number(existingRaw) : null
      const newHigh = existing === null || Number.isNaN(existing) ? finalScore : Math.max(existing, finalScore)
      localStorage.setItem(localHighKey, String(newHigh))
      setHighScore(newHigh)
      setIsNewHigh(existing === null || Number.isNaN(existing) ? true : finalScore > existing)
    } catch {
      setIsNewHigh(false)
    }
  }

  const onDragStart = (ev: React.DragEvent, id: string) => {
    if (!running || paused || showEnd) return
    try { ev.dataTransfer.setData('text/plain', id) } catch { /* ignore */ }
    try { ev.dataTransfer.effectAllowed = 'move' } catch { /* ignore */ }
  }

  const onDropZoneDrop = (ev: React.DragEvent) => {
    if (!running || paused || showEnd) return
    ev.preventDefault()
    let id = ''
    try { id = ev.dataTransfer.getData('text/plain') } catch { /* ignore */ }
    if (!id) return
    setSelectedOptionId(id)
    setAnswerState('idle')
    setFeedback(null)
    setFeedbackType(null)
  }

  const onDropZoneDragOver = (ev: React.DragEvent) => {
    if (!running || paused || showEnd) return
    ev.preventDefault()
    try { ev.dataTransfer.dropEffect = 'move' } catch { /* ignore */ }
  }

  const selectedBlock = useMemo(
    () => currentScenario.options.find((o) => o.id === selectedOptionId) ?? null,
    [currentScenario.options, selectedOptionId]
  )

  const canCheck = running && !paused && !showEnd && Boolean(selectedOptionId) && answerState === 'idle'

  const goNextScenario = () => {
    const next = pickNextScenario(pool, currentScenario.id)
    lastScenarioIdRef.current = currentScenario.id
    // reset per-round wrong counter and lock hint for the new round
    wrongInRoundRef.current = 0
    try {
      const w = window as unknown as Record<string, unknown>
      w['__pz_hint_unlocked'] = false
      window.dispatchEvent(new CustomEvent('minigame:hint-locked'))
    } catch { /* ignore */ }
    setCurrentScenario(next)
    setSelectedOptionId(null)
    setAnswerState('idle')
  }

  const handleCheck = () => {
    if (!canCheck) return
    // prevent re-entrance for extremely fast clicks
    if (checkingRef.current) return
    checkingRef.current = true

    const correct = selectedOptionId === currentScenario.correctOptionId
    if (correct) {
      setAnswerState('correct')
      setFeedback(randFrom(POSITIVE_FEEDBACK))
      setFeedbackType('good')
      if (isPractice) {
        const nextPractice = practiceCorrect + 1
        setPracticeCorrect(nextPractice)
        window.setTimeout(() => {
          try {
            if (nextPractice >= 3) {
              setRunning(false)
              setPaused(false)
              setShowPracticeEnd(true)
              setSelectedOptionId(null)
              setAnswerState('idle')
              setFeedback(null)
              setFeedbackType(null)
            } else {
              goNextScenario()
              setFeedback(null)
              setFeedbackType(null)
            }
          } finally {
            checkingRef.current = false
          }
        }, 700)
      } else {
        const nextScore = scoreRef.current + 2
        const nextCorrectCount = correctRef.current + 1
        scoreRef.current = nextScore
        correctRef.current = nextCorrectCount
        setScore(nextScore)
        setTotalCorrect(nextCorrectCount)
        window.setTimeout(() => {
          try {
            setFeedback(null)
            setFeedbackType(null)
            if (nextCorrectCount >= 20) {
              // end game at 20 correct
              finishGame()
            } else {
              goNextScenario()
            }
          } finally {
            checkingRef.current = false
          }
        }, 700)
      }
    } else {
      setAnswerState('wrong')
      setFeedback(randFrom(NEGATIVE_FEEDBACK))
      setFeedbackType('bad')
      if (!isPractice) {
        const nextScore = Math.max(0, scoreRef.current - 1)
        const nextWrong = wrongRef.current + 1
        scoreRef.current = nextScore
        wrongRef.current = nextWrong
        setScore(nextScore)
        setTotalWrong(nextWrong)
        // increment per-round wrong counter and unlock hint for this round
        try {
          wrongInRoundRef.current = (wrongInRoundRef.current || 0) + 1
          const threshold = MISTAKES_HINT_THRESHOLD[effectiveAge]
          if (wrongInRoundRef.current >= threshold) {
            try {
              const w = window as unknown as Record<string, unknown>
              // only unlock for real game (not practice); do not auto-open
              w['__pz_hint_unlocked'] = true
              window.dispatchEvent(new CustomEvent('minigame:hint-unlocked'))
            } catch { /* ignore */ }
          }
        } catch { /* ignore */ }
      }
      // stay on same scenario; player can try again
      window.setTimeout(() => {
        try {
          setFeedback(null)
          setFeedbackType(null)
          setAnswerState('idle')
        } finally {
          checkingRef.current = false
        }
      }, 900)
    }
  }

  

  // keep scenario updated if pool changes (age group)
  useEffect(() => {
    setCurrentScenario(pickNextScenario(pool, lastScenarioIdRef.current))
    setSelectedOptionId(null)
  }, [pool])

  return (
    <div
      className="pz-layout thermostaat-root"
        style={{
        position: 'fixed',
        top: 'var(--nav-height)',
        left: 0,
        right: 0,
        bottom: 'var(--bottombar-height)',
        border: '10px solid #000',
        boxSizing: 'border-box',
        zIndex: 900,
          backgroundImage: `url(${bgThermostaat})`,
          backgroundRepeat: 'no-repeat',
          /* make the background slightly wider while preserving its height */
          backgroundSize: '100% 100%',
          backgroundPosition: 'center top'
      }}
    >
          {/* background image is applied via CSS background (contain) so it's behind the UI */}
      {!showEnd && (
        <>
          {/* Top-right score (matches PasswordZapper) */}
          <div className="pz-score">{isPractice ? 'Oefenronde' : `Score: ${score}`}</div>

          {/* Bottom-left progress bar (out of 20 for real game, 3 for practice) */}
          <div className="pz-progress" aria-label="Voortgang">
            <div
              className="pz-progress-fill"
              style={{ width: `${Math.max(0, Math.min(100, (isPractice ? (practiceCorrect / 3) : (totalCorrect / 20)) * 100))}%` }}
            />
            <div className="pz-progress-text">{isPractice ? `${practiceCorrect}/3` : `${totalCorrect}/20`}</div>
          </div>
        </>
      )}

      {!showEnd && feedback && (
        <div
          className={
            'pz-feedback ' +
            (feedbackType === 'good' ? 'pz-feedback--good' : 'pz-feedback--bad') +
            ' nzs-feedback ' +
            (feedbackType === 'good' ? 'nzs-feedback--good' : 'nzs-feedback--bad')
          }
        >
          {feedback}
        </div>
      )}

      {!showEnd && (
        <div className="nzs-stage">
          <div className="nzs-board">
            <div className="nzs-sentence" aria-label="Zin">
              <div className="nzs-token nzs-token--kw">{currentScenario.leftKeyword}</div>
              <div className="nzs-fixed">{currentScenario.fixedLeft}</div>
              <div className="nzs-token nzs-token--kw">{currentScenario.andKeyword}</div>

              <div
                className={`nzs-dropzone ${answerState === 'correct' ? 'nzs-dropzone--correct' : answerState === 'wrong' ? 'nzs-dropzone--wrong' : ''}`}
                onDrop={onDropZoneDrop}
                onDragOver={onDropZoneDragOver}
                aria-label="Lege plek"
              >
                {selectedBlock ? (
                  <div className={`nzs-block nzs-block--selected ${effectiveAge === '14-16' ? 'nzs-block--code' : ''}`}>
                    {selectedBlock.icon && <span className="nzs-block__icon" aria-hidden>{selectedBlock.icon}</span>}
                    <span className="nzs-block__label">{selectedBlock.label}</span>
                  </div>
                ) : (
                  <div className="nzs-dropzone__placeholder" />
                )}
              </div>

              <div className="nzs-token nzs-token--kw">{currentScenario.thenKeyword}</div>
              <div className={`nzs-action ${effectiveAge === '14-16' ? 'nzs-action--code' : ''}`}>{currentScenario.fixedAction}</div>
              {currentScenario.elseKeyword && (
                <>
                  <div className="nzs-token nzs-token--kw">{currentScenario.elseKeyword}</div>
                  <div className={`nzs-action ${effectiveAge === '14-16' ? 'nzs-action--code' : ''}`}>{currentScenario.fixedElse}</div>
                </>
              )}
            </div>

            <div className="nzs-options" aria-label="Blokken">
              {currentScenario.options.map((opt) => (
                <div
                  key={opt.id}
                  className={`nzs-block ${effectiveAge === '14-16' ? 'nzs-block--code' : ''}`}
                  draggable={running && !paused && !showEnd}
                  onDragStart={(ev) => onDragStart(ev, opt.id)}
                  role="button"
                  aria-label={opt.label}
                >
                  {opt.icon && <span className="nzs-block__icon" aria-hidden>{opt.icon}</span>}
                  <span className="nzs-block__label">{opt.label}</span>
                </div>
              ))}
            </div>

            <button style={{ marginTop: 30}} className="pz-start-btn pz-start-btn--large" onClick={handleCheck} disabled={!canCheck}>
              Nakijken
            </button>
          </div>
        </div>
      )}

      {showIntro && (
        <div className="pz-start-overlay">
          <div className="pz-start-modal">
            <h2>Speluitleg - (Niet zo) slimme thermostaat</h2>
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
            <p style={{ marginTop: 12, textAlign: 'left' }}>In de oefenronde tellen je punten nog niet mee.</p>
            {effectiveAge === '8-10' && (
              <p style={{ textAlign: 'left' }}>Sleep de blokken en maak een juiste zin (ALS ... EN ... DAN ...).</p>
            )}
            {effectiveAge === '11-13' && (
              <p style={{ textAlign: 'left' }}>Sleep de blokken en maak een juiste zin (ALS ... EN ... DAN ...).</p>
            )}
            {effectiveAge === '14-16' && (
              <p style={{ textAlign: 'left' }}>Sleep de blokken en maak een juiste regel (IF ... AND ... THEN ... ELSE ...).</p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', marginTop: 18, alignItems: 'center' }}>
              <button className="pz-start-btn pz-start-btn--large" onClick={startPractice}>Spelen</button>
              <button className="pz-start-btn pz-start-btn--large" style={{ marginTop: 12 }} onClick={startRealGame}>Oefenronde overslaan</button>
            </div>
          </div>
        </div>
      )}

      {showPracticeEnd && (
        <div className="pz-start-overlay">
          <div className="pz-start-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Het echte spel begint nu</h2>
            <p style={{ marginTop: 12, textAlign: 'left' }}>Punten tellen nu mee. Succes!</p>
            <div style={{ display: 'flex', flexDirection: 'column', marginTop: 18, alignItems: 'center' }}>
              <button className="pz-start-btn pz-start-btn--large" onClick={startRealGame}>Spelen</button>
              <button className="pz-start-btn pz-start-btn--large" style={{ marginTop: 12 }} onClick={() => { setShowPracticeEnd(false); setShowPracticeStart(true) }}>Opnieuw oefenen</button>
            </div>
          </div>
        </div>
      )}

      {showHelp && (
        <div className="pz-pause-overlay" onClick={() => { setShowHelp(false); setPaused(false) }}>
          <div className="pz-pause-modal pz-help-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Speluitleg - (Niet zo) slimme thermostaat</h2>
            <div className="pz-hint-container" style={{ marginTop: 12 }}>
              <ul className="pz-start-bullets pz-hint-bullets">
                {introText.map((line) => <li key={line} className="pz-hint-item">{line}</li>)}
              </ul>
              <div style={{ textAlign: 'center' }}>
                <button className="pz-start-btn pz-start-btn--large" onClick={() => { setShowHelp(false); setPaused(false) }}>Verder spelen</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showHint && (
        <div className="pz-pause-overlay" onClick={() => { setShowHint(false); setPaused(false) }}>
          <div className="pz-pause-modal pz-hint-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Hint</h2>
            <div className="pz-hint-container" style={{ marginTop: 12 }}>
              <ul className="pz-start-bullets pz-hint-bullets">
                {computedHint.map((line) => <li key={line} className="pz-hint-item">{line}</li>)}
              </ul>
              <div style={{ textAlign: 'center' }}>
                <button className="pz-start-btn pz-start-btn--large" onClick={() => { setShowHint(false); setPaused(false) }}>Verder spelen</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {paused && !showPracticeEnd && !showPracticeStart && !showIntro && !showHint && !showHelp && (
        <div className="pz-pause-overlay">
          <div className="pz-pause-modal">
            <h2>Pauze</h2>
            <div className="pz-pause-actions">
              <button id="btnContinueGame" className="pz-pause-action pz-pause-action--primary" onClick={() => setPaused(false)}>Verder spelen</button>
              <button id="btnRestartGame" className="pz-pause-action pz-pause-action--primary" onClick={restartGame}>Opnieuw beginnen</button>
              <button id="btnStopGame" className="pz-pause-action pz-pause-action--danger" onClick={() => {
                try { setPaused(false) } catch { /* ignore */ }
                try { setRunning(false) } catch { /* ignore */ }
                try { setStoppedByUser(true) } catch { /* ignore */ }
                try { setShowEnd(true) } catch { /* ignore */ }
                try { if (onEnd) onEnd({ score: 0, timeMs: 0, mistakes: totalWrong }) } catch { /* ignore */ }
              }}>Stoppen</button>
            </div>
          </div>
        </div>
      )}

      {showEnd && (
        <div className="pz-end">
          <div className="pz-end-box">
            <div className="pz-highscore" style={{ marginBottom: 18, textAlign: 'center' }}>
              <span className="pz-highscore-label">Hoogste score:</span>
              <span id="highScore" className="pz-highscore-value">{highScore ?? '-'}</span>
              {isNewHigh && <span className="pz-new-record"> Nieuw record!</span>}
            </div>

            <div className="pz-end-content">
              <div className="pz-end-left">
                <div className="pz-score-circle" aria-hidden style={circleStyle}>
                  <div className="pz-score-label">SCORE</div>
                  <div className="pz-score-number" id="score">{stoppedByUser ? 0 : score}</div>
                  <div className="pz-score-percent" id="percentage">{stoppedByUser ? 0 : percent}%</div>
                  <div className="pz-score-stars" aria-hidden>
                    {Array.from({ length: 3 }).map((_, i) => (
                      <span key={i} className={'pz-star ' + (i < (stoppedByUser ? 0 : starCount) ? 'pz-star--filled' : 'pz-star--empty')} aria-hidden>
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
                    <div className="score"><span className="plus">+</span>{stoppedByUser ? 0 : totalCorrect}</div>
                  </div>
                  <div className="pz-stats-wrong">
                    <div className="shine" aria-hidden></div>
                    <div className="label">Fout</div>
                    <div className="score"><span className="minus">-</span>{stoppedByUser ? 0 : totalWrong}</div>
                  </div>
                </div>
              </div>

              <div className="pz-end-right">
                <div className="pz-tips-card">
                  <h3>{stoppedByUser ? 'Spel gestopt, geen score' : 'Performantie tip'}</h3>
                  <ul>
                    <li>{stoppedByUser ? 'Je spel is gestopt en er is geen score opgeslagen.' : END_TIP_BY_AGE[effectiveAge]}</li>
                  </ul>
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

