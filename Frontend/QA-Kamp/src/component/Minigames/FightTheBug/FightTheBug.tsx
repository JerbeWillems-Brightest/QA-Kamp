import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './FightTheBug.css'
import '../PasswordZapper/PasswordZapperGame.css'

type AgeGroup = '8-10' | '11-13' | '14-16'
type EndResults = { score: number; timeMs: number; mistakes: number }

interface Props {
  ageGroup?: AgeGroup
  onEnd?: (results: EndResults) => void
}

type Question = {
  id: string
  prompt: string
  options: { id: string; label: string; icon?: string }[]
  correctOptionId: string
  hintLinesByAge?: Partial<Record<AgeGroup, string[]>>
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

const MISTAKES_HINT_THRESHOLD: Record<AgeGroup, number> = {
  '8-10': 1,
  '11-13': 2,
  '14-16': 3
}

const INTRO_BY_AGE: Record<AgeGroup, string[]> = {
  '8-10': [
    'De Bug valt je aan met vragen en opdrachten.',
    'Kies het juiste antwoord of voer de juiste actie uit.',
    'Bij een juist antwoord verliest de Bug energie.',
    'Maak je een fout? Dan verlies jij energie.',
    'Versla de Bug door zoveel mogelijk juiste antwoorden te geven!'
  ],
  '11-13': [
    'De Bug valt je aan met vragen en opdrachten.',
    'Kies het juiste antwoord of voer de juiste actie uit.',
    'Bij een juist antwoord verliest de Bug energie.',
    'Maak je een fout? Dan verlies jij energie.',
    'Versla de Bug door 10 correcte antwoorden te geven.'
  ],
  '14-16': [
    'De Bug valt je aan met vragen en opdrachten.',
    'Kies het juiste antwoord (soms met pseudocode).',
    'Juist = Bug -10 energie, fout = Jij -10 energie.',
    'Versla de Bug door 10 correcte antwoorden te geven.'
  ]
}

const PRACTICE_RULES: Record<AgeGroup, string[]> = {
  '8-10': ['Even oefenen!', 'Kies bij elke vraag één antwoord.', 'Haal 3 juiste antwoorden om te starten.'],
  '11-13': ['Even oefenen!', 'Kies bij elke vraag één antwoord.', 'Haal 3 juiste antwoorden om te starten.'],
  '14-16': ['Even oefenen!', 'Soms krijg je ook een stukje (pseudo)code.', 'Haal 3 juiste antwoorden om te starten.']
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

function randFrom(list: string[]) {
  return list[Math.floor(Math.random() * list.length)]
}

const POSITIVE_FEEDBACK = ['Goed zo!', 'Top!', 'Correct!', 'Sterk!', 'Mooi zo!']
const NEGATIVE_FEEDBACK = ['Fout! Dit antwoord was zwak.', 'Fout!', 'Helaas, probeer opnieuw.']

function pickNext<T extends { id: string }>(pool: T[], lastId?: string) {
  if (pool.length <= 1) return pool[0]
  for (let i = 0; i < 8; i++) {
    const q = pool[Math.floor(Math.random() * pool.length)]
    if (q.id !== lastId) return q
  }
  return pool[Math.floor(Math.random() * pool.length)]
}

function buildQuestionPool(age: AgeGroup): Question[] {
  if (age === '8-10') {
    return [
      {
        id: 'q1',
        prompt: 'Welk wachtwoord is sterk?',
        options: [
          { id: 'a', label: 'blauwfiets', icon: '🚲' },
          { id: 'b', label: 'Blauw7', icon: '🔢' },
          { id: 'c', label: 'Bl@uw#Fiets7', icon: '🔒' },
          { id: 'd', label: 'Fiets?', icon: '❓' }
        ],
        correctOptionId: 'c',
        hintLinesByAge: { '8-10': ['Een sterk wachtwoord heeft letters, cijfers én tekens.', 'En het is niet te kort.'] }
      },
      {
        id: 'q2',
        prompt: 'Wat doe je bij een onbekende link?',
        options: [
          { id: 'a', label: 'Klikken', icon: '🖱️' },
          { id: 'b', label: 'Niet klikken', icon: '⛔' },
          { id: 'c', label: 'Doorsturen', icon: '📤' },
          { id: 'd', label: 'Downloaden', icon: '⬇️' }
        ],
        correctOptionId: 'b',
        hintLinesByAge: { '8-10': ['Klik niet op links die je niet vertrouwt.', 'Vraag hulp aan een volwassene.'] }
      },
      {
        id: 'q3',
        prompt: 'Welke is veilig?',
        options: [
          { id: 'a', label: 'Wachtwoord delen', icon: '🗣️' },
          { id: 'b', label: 'Wachtwoord geheim', icon: '🤫' },
          { id: 'c', label: 'Overal hetzelfde', icon: '🔁' },
          { id: 'd', label: 'Op papier op je tafel', icon: '📝' }
        ],
        correctOptionId: 'b',
        hintLinesByAge: { '8-10': ['Deel je wachtwoord niet.', 'Bewaar het veilig (bijv. met je ouders).'] }
      },
      {
        id: 'q4',
        prompt: 'Wat is een goede actie?',
        options: [
          { id: 'a', label: 'Updates doen', icon: '⬆️' },
          { id: 'b', label: 'Alles wegklikken', icon: '🙈' },
          { id: 'c', label: 'Nooit uitloggen', icon: '🔓' },
          { id: 'd', label: 'Vreemde apps installeren', icon: '🧩' }
        ],
        correctOptionId: 'a',
        hintLinesByAge: { '8-10': ['Updates maken je toestel veiliger.', 'Doe ze wanneer het kan.'] }
      },
      {
        id: 'q5',
        prompt: 'Welke is het beste?',
        options: [
          { id: 'a', label: '123456', icon: '1️⃣' },
          { id: 'b', label: 'wachtwoord', icon: '🔑' },
          { id: 'c', label: 'Kat', icon: '🐱' },
          { id: 'd', label: 'Zon!Maan9', icon: '🌙' }
        ],
        correctOptionId: 'd',
        hintLinesByAge: { '8-10': ['Gebruik een mix van tekens en cijfers.', 'Maak het langer dan 8 tekens.'] }
      }
    ]
  }

  if (age === '11-13') {
    return [
      {
        id: 'q1',
        prompt: 'Welk wachtwoord is sterk?',
        options: [
          { id: 'a', label: 'blauwfiets' },
          { id: 'b', label: 'Blauw7' },
          { id: 'c', label: 'Bl@uw#Fiets7' },
          { id: 'd', label: 'Fiets?' }
        ],
        correctOptionId: 'c',
        hintLinesByAge: { '11-13': ['Sterk = lang + mix (letters, cijfers, tekens).', 'Vermijd woorden uit het woordenboek.'] }
      },
      {
        id: 'q2',
        prompt: 'Wat is de beste reactie op phishing?',
        options: [
          { id: 'a', label: 'Link openen om te checken' },
          { id: 'b', label: 'Afzender controleren en niet klikken' },
          { id: 'c', label: 'Gegevens invullen om te bevestigen' },
          { id: 'd', label: 'Doorsturen naar iedereen' }
        ],
        correctOptionId: 'b',
        hintLinesByAge: { '11-13': ['Phishing probeert je te misleiden.', 'Controleer afzender en klik niet zomaar.'] }
      },
      {
        id: 'q3',
        prompt: 'Welke uitspraak klopt?',
        options: [
          { id: 'a', label: 'Eén wachtwoord voor alles is handig' },
          { id: 'b', label: 'Uniek wachtwoord per account is veiliger' },
          { id: 'c', label: 'Wachtwoorden delen is oké met vrienden' },
          { id: 'd', label: 'Korter is beter te onthouden dus veiliger' }
        ],
        correctOptionId: 'b',
        hintLinesByAge: { '11-13': ['Uniek per account voorkomt “domino-effect”.', 'Een manager kan helpen onthouden.'] }
      },
      {
        id: 'q4',
        prompt: 'Wat doet een update meestal?',
        options: [
          { id: 'a', label: 'Maakt je toestel altijd trager' },
          { id: 'b', label: 'Lost bugs en beveiligingslekken op' },
          { id: 'c', label: 'Verwijdert je apps' },
          { id: 'd', label: 'Zet je internet uit' }
        ],
        correctOptionId: 'b',
        hintLinesByAge: { '11-13': ['Updates patchen beveiligingslekken.', 'Doe ze regelmatig.'] }
      },
      {
        id: 'q5',
        prompt: 'Welke login is het veiligst?',
        options: [
          { id: 'a', label: 'Wachtwoord + 2FA (code/app)' },
          { id: 'b', label: 'Alleen wachtwoord' },
          { id: 'c', label: 'Wachtwoord op post-it' },
          { id: 'd', label: 'Wachtwoord delen met iemand' }
        ],
        correctOptionId: 'a',
        hintLinesByAge: { '11-13': ['2FA voegt een extra slot toe.', 'Zelfs bij lek is je account beter beschermd.'] }
      },
      {
        id: 'q6',
        prompt: 'Wat is een goede gewoonte?',
        options: [
          { id: 'a', label: 'Altijd “Onthoud mij” op openbare pc' },
          { id: 'b', label: 'Uitloggen op gedeelde toestellen' },
          { id: 'c', label: 'Op “Akkoord” klikken zonder te lezen' },
          { id: 'd', label: 'Apps installeren van onbekende sites' }
        ],
        correctOptionId: 'b',
        hintLinesByAge: { '11-13': ['Log uit op gedeelde toestellen.', 'Zo kan niemand in jouw account.'] }
      }
    ]
  }

  return [
    {
      id: 'q1',
      prompt: 'Welke password policy is het best?',
      options: [
        { id: 'a', label: 'Min. 6 tekens, geen vereisten' },
        { id: 'b', label: 'Min. 12 tekens + passphrase toegestaan' },
        { id: 'c', label: 'Min. 8 tekens, verplicht elk teken-type' },
        { id: 'd', label: 'Wachtwoord wisselen elke week' }
      ],
      correctOptionId: 'b',
      hintLinesByAge: { '14-16': ['Lange passphrases zijn vaak sterker en beter te onthouden.', 'Forced complexity kan voorspelbaar worden.'] }
    },
    {
      id: 'q2',
      prompt: 'Kies de veiligste aanpak voor wachtwoorden.',
      options: [
        { id: 'a', label: 'Zelf bedenken en hergebruiken' },
        { id: 'b', label: 'Password manager + unieke wachtwoorden' },
        { id: 'c', label: 'In een notitie-app zonder lock' },
        { id: 'd', label: 'In je browser, zonder master password' }
      ],
      correctOptionId: 'b',
      hintLinesByAge: { '14-16': ['Uniek per service + manager reduceert risico bij leaks.'] }
    },
    {
      id: 'q3',
      prompt: 'Phishing: wat is het juiste gedrag?',
      options: [
        { id: 'a', label: 'Link openen en dan beslissen' },
        { id: 'b', label: 'URL/afzender verifiëren, desnoods via aparte kanaal' },
        { id: 'c', label: 'Credentials invullen om snel klaar te zijn' },
        { id: 'd', label: 'Bijlage downloaden om te checken' }
      ],
      correctOptionId: 'b',
      hintLinesByAge: { '14-16': ['Verifieer via een onafhankelijke bron.', 'Nooit credentials via mailforms.'] }
    },
    {
      id: 'q4',
      prompt: 'Pseudocode: wanneer lock je een account?',
      options: [
        { id: 'a', label: 'IF tries > 3 THEN lockAccount()' },
        { id: 'b', label: 'IF password == "admin" THEN ok()' },
        { id: 'c', label: 'IF userIsAdmin THEN allow()' },
        { id: 'd', label: 'IF input != null THEN allow()' }
      ],
      correctOptionId: 'a',
      hintLinesByAge: { '14-16': ['Rate limiting / lockouts mitigeren brute force.', 'De andere opties zijn zwak of irrelevant.'] }
    },
    {
      id: 'q5',
      prompt: 'Wat is het doel van 2FA?',
      options: [
        { id: 'a', label: 'Sneller inloggen' },
        { id: 'b', label: 'Extra factor naast wachtwoord' },
        { id: 'c', label: 'Wachtwoorden overbodig maken' },
        { id: 'd', label: 'E-mails blokkeren' }
      ],
      correctOptionId: 'b',
      hintLinesByAge: { '14-16': ['2FA = iets dat je hebt/ bent naast iets dat je weet.'] }
    }
  ]
}

export default function FightTheBug({ ageGroup, onEnd }: Props) {
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

  const pool = useMemo(() => buildQuestionPool(effectiveAge), [effectiveAge])
  const isTestEnv = typeof process !== 'undefined' && (process as unknown as { env?: Record<string, string> }).env?.NODE_ENV === 'test'

  const [showIntro, setShowIntro] = useState(true)
  const [showPracticeStart, setShowPracticeStart] = useState(false)
  const [showPracticeEnd, setShowPracticeEnd] = useState(false)
  const [isPractice, setIsPractice] = useState(false)
  const [practiceCorrect, setPracticeCorrect] = useState(0)

  const [showHelp, setShowHelp] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [paused, setPaused] = useState(false)
  const [running, setRunning] = useState(false)
  const [showEnd, setShowEnd] = useState(false)
  const [stoppedByUser, setStoppedByUser] = useState(false)

  const [playerEnergy, setPlayerEnergy] = useState(100)
  const [bugEnergy, setBugEnergy] = useState(100)
  const [totalCorrect, setTotalCorrect] = useState(0)
  const [totalWrong, setTotalWrong] = useState(0)

  const [question, setQuestion] = useState<Question>(() => pickNext(pool))
  const lastQuestionIdRef = useRef<string | undefined>(undefined)
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null)
  const [answerState, setAnswerState] = useState<'idle' | 'correct' | 'wrong'>('idle')

  const [feedback, setFeedback] = useState<string | null>(null)
  const [feedbackType, setFeedbackType] = useState<'good' | 'bad' | null>(null)
  const [floatingDelta, setFloatingDelta] = useState<{ target: 'player' | 'bug'; value: number } | null>(null)

  const checkingRef = useRef(false)
  const hintAutoShownRef = useRef(false)

  const percent = useMemo(() => computePercent(totalCorrect, totalWrong), [totalCorrect, totalWrong])
  const starCount = useMemo(() => computeStars(percent), [percent])
  const circleStyle = useMemo(
    () => ({ ['--pz-score-pct' as unknown as string]: `${percent}%` } as unknown as React.CSSProperties),
    [percent]
  )

  const localHighKey = useMemo(() => `pz-highscore_fightthebug_${effectiveAge}`, [effectiveAge])
  const [highScore, setHighScore] = useState<number | null>(() => {
    try {
      const raw = localStorage.getItem(localHighKey)
      return raw ? Number(raw) : null
    } catch {
      return null
    }
  })
  const [isNewHigh, setIsNewHigh] = useState(false)

  const hintLines = useMemo(() => {
    const custom = question.hintLinesByAge?.[effectiveAge]
    if (custom && custom.length) return custom
    if (effectiveAge === '8-10') return ['Kies het antwoord met letters + cijfers + tekens.', 'Neem je tijd en lees goed.']
    if (effectiveAge === '11-13') return ['Kies het antwoord dat het meest veilig is.', 'Denk aan: mix, lengte, 2FA, updates.']
    return ['Kies het antwoord dat risico vermindert (unique, 2FA, verifiëren).', 'Denk aan: phishing, brute force, leaks.']
  }, [effectiveAge, question])

  useEffect(() => {
    try {
      const w = window as unknown as Record<string, unknown>
      w['__pz_hint_unlocked'] = false
      window.dispatchEvent(new CustomEvent('minigame:hint-locked'))
    } catch { /* ignore */ }
  }, [effectiveAge])

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

  const onPauseEvt = useCallback(() => {
    if (showIntro || showPracticeStart || showPracticeEnd || showEnd) return
    setPaused(true)
  }, [showEnd, showIntro, showPracticeEnd, showPracticeStart])

  const onHelpEvt = useCallback(() => {
    if (showIntro || showPracticeStart || showPracticeEnd || showEnd) return
    setShowHelp(true)
    setPaused(true)
  }, [showEnd, showIntro, showPracticeEnd, showPracticeStart])

  const onHintEvt = useCallback(() => {
    if (showIntro || showPracticeStart || showPracticeEnd || showEnd) return
    try {
      const w = window as unknown as Record<string, unknown>
      if (!w['__pz_hint_unlocked']) return
    } catch { /* ignore */ }
    setShowHint(true)
    setPaused(true)
  }, [showEnd, showIntro, showPracticeEnd, showPracticeStart])

  useEffect(() => {
    window.addEventListener('minigame:pause', onPauseEvt as EventListener)
    window.addEventListener('minigame:question', onHelpEvt as EventListener)
    window.addEventListener('minigame:hint', onHintEvt as EventListener)
    return () => {
      window.removeEventListener('minigame:pause', onPauseEvt as EventListener)
      window.removeEventListener('minigame:question', onHelpEvt as EventListener)
      window.removeEventListener('minigame:hint', onHintEvt as EventListener)
    }
  }, [onHelpEvt, onHintEvt, onPauseEvt])

  useEffect(() => {
    // Avoid calling setState synchronously inside the effect to prevent
    // cascading renders (react-hooks/set-state-in-effect). Defer updates.
    const timer = window.setTimeout(() => {
      if (paused) setRunning(false)
      else {
        if (!showEnd && !showIntro && !showPracticeStart && !showPracticeEnd) setRunning(true)
      }
    }, 0)
    return () => { clearTimeout(timer) }
  }, [paused, showEnd, showIntro, showPracticeStart, showPracticeEnd])

  useEffect(() => {
    // Defer test env state changes to avoid synchronous state updates in effect
    if (isTestEnv) {
      const t = window.setTimeout(() => {
        setShowIntro(false)
        setShowPracticeStart(true)
      }, 0)
      return () => { clearTimeout(t) }
    }
  }, [isTestEnv])

  useEffect(() => {
    // Defer initial question setup to avoid synchronous setState calls
    const q = pickNext(pool)
    const t = window.setTimeout(() => {
      setQuestion(q)
      lastQuestionIdRef.current = q?.id
      setSelectedOptionId(null)
      setAnswerState('idle')
      setFeedback(null)
      setFeedbackType(null)
    }, 0)
    return () => { clearTimeout(t) }
  }, [pool])

  const resetRun = useCallback((opts?: { practice?: boolean }) => {
    const practice = !!opts?.practice
    setStoppedByUser(false)
    setShowEnd(false)
    setPaused(false)
    setShowHelp(false)
    setShowHint(false)
    hintAutoShownRef.current = false
    try {
      const w = window as unknown as Record<string, unknown>
      w['__pz_hint_unlocked'] = false
      window.dispatchEvent(new CustomEvent('minigame:hint-locked'))
    } catch { /* ignore */ }

    setPlayerEnergy(100)
    setBugEnergy(100)
    setTotalCorrect(0)
    setTotalWrong(0)
    setSelectedOptionId(null)
    setAnswerState('idle')
    setFeedback(null)
    setFeedbackType(null)
    setFloatingDelta(null)
    checkingRef.current = false

    setIsPractice(practice)
    setPracticeCorrect(0)

    const q = pickNext(pool)
    setQuestion(q)
    lastQuestionIdRef.current = q?.id
    setRunning(!practice)
  }, [pool])

  const restartGame = useCallback(() => {
    // Perform a full page reload so the player truly restarts from the very
    // beginning (clears transient in-memory state). This ensures behaviour
    // matches the user's expectation: a fresh start like a new load.
    try {
      // Use location.reload() to reload current page. Wrap in try/catch to be safe in tests.
      window.location.reload()
    } catch {
      // Fallback: try assign href to force reload
      try { window.location.assign(window.location.href) } catch { /* ignore */ }
    }
  }, [])

  const startPractice = useCallback(() => {
    setShowIntro(false)
    setShowPracticeStart(false)
    setShowPracticeEnd(false)
    setIsPractice(true)
    setPracticeCorrect(0)
    setPlayerEnergy(100)
    setBugEnergy(100)
    setTotalCorrect(0)
    setTotalWrong(0)
    setPaused(false)
    setRunning(true)
    setStoppedByUser(false)
    setShowEnd(false)
    setSelectedOptionId(null)
    setAnswerState('idle')
    setFeedback(null)
    setFeedbackType(null)
    setFloatingDelta(null)
    checkingRef.current = false
  }, [])

  const startRealGame = useCallback(() => {
    setShowPracticeEnd(false)
    setShowPracticeStart(false)
    setShowIntro(false)
    setIsPractice(false)
    setPracticeCorrect(0)
    setPlayerEnergy(100)
    setBugEnergy(100)
    setTotalCorrect(0)
    setTotalWrong(0)
    setPaused(false)
    setRunning(true)
    setStoppedByUser(false)
    setShowEnd(false)
    setSelectedOptionId(null)
    setAnswerState('idle')
    setFeedback(null)
    setFeedbackType(null)
    setFloatingDelta(null)
    checkingRef.current = false
    hintAutoShownRef.current = false
    try {
      const w = window as unknown as Record<string, unknown>
      w['__pz_hint_unlocked'] = false
      window.dispatchEvent(new CustomEvent('minigame:hint-locked'))
    } catch { /* ignore */ }
  }, [])

  const endGame = useCallback((reason: 'win' | 'lose' | 'stop') => {
    setRunning(false)
    setPaused(false)
    setShowHelp(false)
    setShowHint(false)
    setShowPracticeStart(false)
    setShowPracticeEnd(false)
    setShowIntro(false)

    if (reason === 'stop') setStoppedByUser(true)

    // Use the player's remaining energy (0-100) as the final score/percentage.
    // The score should reflect how much HP the player has left out of 100.
    const finalScore = Math.max(0, Math.min(100, Math.round(playerEnergy)))
    try {
      const prev = highScore ?? 0
      const next = Math.max(prev, finalScore)
      localStorage.setItem(localHighKey, String(next))
      setHighScore(next)
      setIsNewHigh(next > prev)
    } catch { /* ignore */ }

    setShowEnd(true)
    try { if (onEnd) onEnd({ score: finalScore, timeMs: 0, mistakes: totalWrong }) } catch { /* ignore */ }
  }, [highScore, localHighKey, onEnd, totalWrong, playerEnergy])

  useEffect(() => {
    if (showEnd) return
    if (isPractice) return
    // Call endGame asynchronously to avoid setState-in-effect lint errors
    if (bugEnergy <= 0 || totalCorrect >= 10) {
      const t = window.setTimeout(() => endGame('win'), 0)
      return () => { clearTimeout(t) }
    }
    if (playerEnergy <= 0) {
      const t = window.setTimeout(() => endGame('lose'), 0)
      return () => { clearTimeout(t) }
    }
  }, [bugEnergy, endGame, isPractice, playerEnergy, showEnd, totalCorrect])

  const unlockHintIfNeeded = useCallback((nextWrongTotal: number) => {
    const threshold = MISTAKES_HINT_THRESHOLD[effectiveAge]
    if (nextWrongTotal < threshold) return
    try {
      const w = window as unknown as Record<string, unknown>
      if (!w['__pz_hint_unlocked']) {
        w['__pz_hint_unlocked'] = true
        window.dispatchEvent(new CustomEvent('minigame:hint-unlocked'))
      }
    } catch { /* ignore */ }
    // Do NOT automatically open the hint popup. We only unlock the hint button
    // so the top-level hint control can open it when the player requests it.
    // This matches the behavior in NietZoSlimmeThermostaat.
    hintAutoShownRef.current = false
  }, [effectiveAge])

  const nextQuestion = useCallback(() => {
    const next = pickNext(pool, lastQuestionIdRef.current)
    setQuestion(next)
    lastQuestionIdRef.current = next?.id
    setSelectedOptionId(null)
    setAnswerState('idle')
    setFeedback(null)
    setFeedbackType(null)
    setFloatingDelta(null)
    checkingRef.current = false
    // After moving to the next question, lock the hint button again so the
    // player must earn the hint for the new round. Also reset the auto-show flag.
    try {
      const w = window as unknown as Record<string, unknown>
      w['__pz_hint_unlocked'] = false
      window.dispatchEvent(new CustomEvent('minigame:hint-locked'))
    } catch { /* ignore */ }
    hintAutoShownRef.current = false
  }, [pool])

  const onSelect = useCallback((optionId: string) => {
    if (!running || paused || showIntro || showPracticeStart || showPracticeEnd || showHelp || showHint || showEnd) return
    if (checkingRef.current) return
    if (answerState === 'correct') return
    setSelectedOptionId(optionId)
  }, [answerState, paused, running, showEnd, showHelp, showHint, showIntro, showPracticeEnd, showPracticeStart])

  const checkAnswer = useCallback(() => {
    if (!running || paused || showIntro || showPracticeStart || showPracticeEnd || showHelp || showHint || showEnd) return
    if (!selectedOptionId) return
    if (checkingRef.current) return
    checkingRef.current = true

    const isCorrect = selectedOptionId === question.correctOptionId
    if (isCorrect) {
      setAnswerState('correct')
      setFeedback(randFrom(POSITIVE_FEEDBACK))
      setFeedbackType('good')
      setFloatingDelta({ target: 'bug', value: -10 })

      setBugEnergy((prev) => Math.max(0, prev - 10))
      setTotalCorrect((prev) => prev + 1)

      if (isPractice) {
        setPracticeCorrect((prev) => {
          const next = prev + 1
          if (next >= 3) {
            setRunning(false)
            setShowPracticeEnd(true)
          }
          return next
        })
      }

      window.setTimeout(() => nextQuestion(), 650)
      return
    }

    setAnswerState('wrong')
    setFeedback(randFrom(NEGATIVE_FEEDBACK))
    setFeedbackType('bad')
    setFloatingDelta({ target: 'player', value: -10 })
    setPlayerEnergy((prev) => Math.max(0, prev - 10))
    setTotalWrong((prev) => {
      const next = prev + 1
      if (!isPractice) unlockHintIfNeeded(next)
      return next
    })

    window.setTimeout(() => {
      setAnswerState('idle')
      setSelectedOptionId(null) // clear selection so effect won't re-run checkAnswer
      setFeedback(null)
      setFeedbackType(null)
      setFloatingDelta(null)
      checkingRef.current = false
    }, 650)
  }, [isPractice, nextQuestion, paused, question.correctOptionId, running, selectedOptionId, showEnd, showHelp, showHint, showIntro, showPracticeEnd, showPracticeStart, unlockHintIfNeeded])

  useEffect(() => {
    if (!selectedOptionId) return
    if (answerState !== 'idle') return
    // Defer checkAnswer to avoid synchronous state updates inside effect
    const t = window.setTimeout(() => checkAnswer(), 0)
    return () => { clearTimeout(t) }
  }, [answerState, checkAnswer, selectedOptionId])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Enter') return
      if (!selectedOptionId) return
      checkAnswer()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [checkAnswer, selectedOptionId])

  useEffect(() => {
    const cls = 'pz-practice-open'
    try {
      const open = showPracticeStart || showPracticeEnd
      if (open) document.body.classList.add(cls)
      else document.body.classList.remove(cls)
    } catch { /* ignore */ }
    return () => { try { document.body.classList.remove(cls) } catch { /* ignore */ } }
  }, [showPracticeEnd, showPracticeStart])

  const progressTotal = isPractice ? 3 : 10
  const progressValue = isPractice ? practiceCorrect : Math.min(10, totalCorrect)
  const progressPercent = useMemo(() => {
    const total = progressTotal
    if (!total) return 0
    return Math.max(0, Math.min(100, Math.round((progressValue / total) * 100)))
  }, [progressTotal, progressValue])

  return (
    <div className="ftb-root">
      <div className="ftb-game-area">
      {!showEnd && (
        <div>
          {isPractice && (
            <div className="ftb-top-left">
              <div className="ftb-pill">Oefenronde</div>
            </div>
          )}

          {/* HUD: only show the Bug energy in the top-left HUD when NOT in practice */}
          {!isPractice && (
            <div className="ftb-hud">
              <div className="ftb-energy ftb-energy--bug" aria-label="Energie Bug">
                <div className="ftb-energy__title">Energie Bug</div>
                <div className="ftb-energy__bar">
                  <div className="ftb-energy__fill ftb-energy__fill--bug" style={{ width: `${Math.max(0, Math.min(100, bugEnergy))}%` }} />
                  <div className="ftb-energy__value">{bugEnergy}</div>
                </div>
                {floatingDelta?.target === 'bug' && <div className="ftb-delta ftb-delta--good">{floatingDelta.value} energie</div>}
              </div>
            </div>
          )}

          <div className={`ftb-bug ${feedbackType ? (feedbackType === 'good' ? 'ftb-bug--good' : 'ftb-bug--bad') : ''}`} aria-hidden>
            <div className="ftb-bug__face" />
            {feedback && <div className={`ftb-banner ${feedbackType === 'good' ? 'ftb-banner--good' : 'ftb-banner--bad'}`}>{feedback}</div>}
          </div>

          <div className="ftb-question">
            <div className="ftb-question__box">
              <div className="ftb-question__title">{question.prompt}</div>
              <div className="ftb-options" role="list">
                {question.options.slice(0, 4).map((opt) => {
                  const isSelected = selectedOptionId === opt.id
                  const isCorrect = answerState === 'correct' && isSelected
                  const isWrong = answerState === 'wrong' && isSelected
                  return (
                    <button
                      key={opt.id}
                      className={[
                        'ftb-option',
                        isSelected ? 'ftb-option--selected' : '',
                        isCorrect ? 'ftb-option--correct' : '',
                        isWrong ? 'ftb-option--wrong' : ''
                      ].filter(Boolean).join(' ')}
                      onClick={() => onSelect(opt.id)}
                      disabled={!running || paused || showHelp || showHint || showPracticeStart || showPracticeEnd || showIntro}
                      aria-label={opt.label}
                      type="button"
                    >
                      {opt.icon && <span className="ftb-option__icon" aria-hidden>{opt.icon}</span>}
                      <span className="ftb-option__label">{opt.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {isPractice ? (
            <div className="ftb-progress" aria-label="Progress">
            <div className="ftb-progress__label">Juiste antwoorden</div>
            <div className="ftb-progress__track" role="progressbar" aria-valuemin={0} aria-valuemax={progressTotal} aria-valuenow={progressValue}>
              <div className="ftb-progress__fill" style={{ width: `${progressPercent}%` }} />
              <div className="ftb-progress__text">{progressValue}/{progressTotal}</div>
            </div>
            </div>
          ) : (
            /* During the real game show the player energy in the bottom-left progress area */
            <div className="ftb-progress" aria-label="Energie Speler">
              <div className="ftb-energy ftb-energy--player">
                <div className="ftb-energy__title">Energie Speler</div>
                <div className="ftb-energy__bar">
                  <div className="ftb-energy__fill ftb-energy__fill--player" style={{ width: `${Math.max(0, Math.min(100, playerEnergy))}%` }} />
                  <div className="ftb-energy__value">{playerEnergy}</div>
                </div>
                {floatingDelta?.target === 'player' && <div className="ftb-delta ftb-delta--bad">{floatingDelta.value} energie</div>}
              </div>
            </div>
          )}
        </div>
      )}

      {showIntro && (
        <div className="pz-start-overlay">
          <div className="pz-start-modal">
            <h2>Speluitleg - Fight the bug</h2>
            <div className="pz-start-container">
              <ul className="pz-start-bullets">
                {INTRO_BY_AGE[effectiveAge].map((line) => <li key={line}>{line}</li>)}
              </ul>
              <div style={{ textAlign: 'center' }}>
                <button className="pz-start-btn pz-start-btn--large" onClick={() => { setShowIntro(false); setShowPracticeStart(true) }} type="button">
                  Volgende
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPracticeStart && (
        <div className="pz-start-overlay">
          <div className="pz-start-modal">
            <h2>Even oefenen!</h2>
            <div className="pz-start-container">
              <p style={{ marginTop: 4, marginBottom: 10 }}>De Bug stelt vragen. Kies het juiste antwoord of voer de juiste actie uit.</p>
              <ul className="pz-start-bullets">
                {PRACTICE_RULES[effectiveAge].slice(1).map((line) => <li key={line}>{line}</li>)}
              </ul>
              <div style={{ textAlign: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <button className="pz-start-btn pz-start-btn--large" onClick={() => { resetRun({ practice: true }); startPractice() }} type="button">
                    Spelen
                  </button>
                  <button className="pz-start-btn pz-start-btn--large" style={{ marginTop: 12 }} onClick={() => { resetRun({ practice: false }); startRealGame() }} type="button">
                    Oefenronde overslaan
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPracticeEnd && (
        <div className="pz-start-overlay">
          <div className="pz-start-modal">
            <h2>Het echte spel begint nu</h2>
            <div className="pz-start-container">
              <p style={{ marginTop: 6, marginBottom: 10 }}>Je weet nu hoe het spel werkt. Succes!</p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button className="pz-start-btn pz-start-btn--large" onClick={() => { resetRun({ practice: false }); startRealGame() }} type="button">
                  Spelen
                </button>
                <button className="pz-start-btn pz-start-btn--large" onClick={() => { setShowPracticeEnd(false); setShowPracticeStart(true) }} type="button">
                  Opnieuw oefenen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showHelp && (
        <div className="pz-pause-overlay">
          <div className="pz-pause-modal pz-hint-modal">
            <h2>Speluitleg - Fight the bug</h2>
            <div className="pz-hint-container" style={{ marginTop: 12 }}>
              <ul className="pz-start-bullets pz-hint-bullets">
                {INTRO_BY_AGE[effectiveAge].map((line) => <li key={line} className="pz-hint-item">{line}</li>)}
              </ul>
              <div style={{ textAlign: 'center' }}>
                <button className="pz-start-btn pz-start-btn--large" onClick={() => { setShowHelp(false); setPaused(false) }} type="button">
                  Verder spelen
                </button>
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
                {hintLines.map((line) => <li key={line} className="pz-hint-item">{line}</li>)}
              </ul>
              <div style={{ textAlign: 'center' }}>
                <button className="pz-start-btn pz-start-btn--large" onClick={() => { setShowHint(false); setPaused(false) }} type="button">
                  Verder spelen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {paused && !showPracticeEnd && !showPracticeStart && !showIntro && !showHelp && !showHint && (
        <div className="pz-pause-overlay">
          <div className="pz-pause-modal">
            <h2>Pauze</h2>
            <div className="pz-pause-actions">
              <button id="btnContinueGame" className="pz-pause-action pz-pause-action--primary" onClick={() => setPaused(false)} type="button">Verder spelen</button>
              <button id="btnRestartGame" className="pz-pause-action pz-pause-action--primary" onClick={restartGame} type="button">Opnieuw beginnen</button>
              <button id="btnStopGame" className="pz-pause-action pz-pause-action--danger" onClick={() => endGame('stop')} type="button">Stoppen</button>
            </div>
          </div>
        </div>
      )}

      {showEnd && (
        <div className="pz-end">
          <div className="pz-best-top">
            <div className="pz-best-top__label">
              Hoogste score: <span className="pz-best-top__time">{highScore ?? Math.max(0, Math.round(playerEnergy))}</span>
              {isNewHigh && <span style={{ marginLeft: 10, fontWeight: 700, color: '#166534' }}>Nieuw!</span>}
            </div>
          </div>
          <div className="pz-end-box">
            <div className="pz-end-content">
              <div className="pz-end-left">
                  <div className="pz-score-circle" aria-hidden style={circleStyle}>
                    <div className="pz-score-label">SCORE</div>
                    <div className="pz-score-number">{Math.max(0, Math.round(playerEnergy))}</div>
                    <div className="pz-score-percent">{Math.max(0, Math.round(playerEnergy))}%</div>
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

                  {/* Show number of correct and wrong answers like other games */}
                  <div className="pz-stats-row">
                    <div className="pz-stats-correct">
                      <div className="shine" aria-hidden />
                      <div className="label">Juiste</div>
                      <div className="score">{totalCorrect}</div>
                    </div>
                    <div className="pz-stats-wrong">
                      <div className="shine" aria-hidden />
                      <div className="label">Foute</div>
                      <div className="score">{totalWrong}</div>
                    </div>
                  </div>

                </div>

                <div className="pz-end-right">
                  <div className="pz-tips-card">
                    <h3>{stoppedByUser ? 'Spel gestopt' : (playerEnergy <= 0 ? 'Je verloor…' : 'Je versloeg de Bug!')}</h3>
                    <div className="pz-tips">
                      <ul>
                        <li>{stoppedByUser ? 'Je spel is gestopt en je kan opnieuw proberen.' : 'Blijf veilig: gebruik sterke wachtwoorden en denk na voor je klikt.'}</li>
                      </ul>
                    </div>
                    <div className="pz-end-actions" style={{ textAlign: 'center' }}>
                      <button id="btnPlayAgain" className="pz-play-again" onClick={restartGame} type="button">Opnieuw spelen</button>
                    </div>
                  </div>
                </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
