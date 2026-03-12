import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { deleteSession } from '../../api'
import { useSession } from '../../context/SessionContext'

import MaandagImg from '../../assets/maandag.png'
import DinsdagImg from '../../assets/dinsdag.png'
import WoensdagImg from '../../assets/woensdag.png'
import DonderdagImg from '../../assets/donderdag.png'
import VrijdagImg from '../../assets/vrijdag.png'
import ManagePlayers from './ManagePlayers'

export default function DayOverview() {
  const [showManage, setShowManage] = useState(false)
  const modalRef = useRef<HTMLDivElement | null>(null)
  const auth = useAuth()
  const navigate = useNavigate()
  const { currentSession, setCurrentSessionId } = useSession()
  const [error, setError] = useState('')
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const [focusIdx, setFocusIdx] = useState<number | null>(null)
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)

  // responsive scale so tablet/laptop show the same visual layout as a large monitor
  const [scale, setScale] = useState<number>(1)
  const DESIGN_WIDTH = 1200 // the width we design for (monitor)

  // All days should be clickable at any time; no disabled logic.
  // (Removed previous allowedMaxIndex + auto-select rules.

  useEffect(() => {
    function updateScale() {
      const w = window.innerWidth
      const newScale = Math.min(1, w / DESIGN_WIDTH)
      setScale(newScale)
    }
    updateScale()
    window.addEventListener('resize', updateScale)
    return () => window.removeEventListener('resize', updateScale)
  }, [])

  const days = [
    { name: 'Maandag', img: MaandagImg },
    { name: 'Dinsdag', img: DinsdagImg },
    { name: 'Woensdag', img: WoensdagImg },
    { name: 'Donderdag', img: DonderdagImg },
    { name: 'Vrijdag', img: VrijdagImg },
  ]

  useEffect(() => {
    if (!auth.user) {
      navigate('/organizer-login')
    }
  }, [auth.user, navigate])

  // reflect whether a session is currently active via context
  const hasSession = Boolean(currentSession?.id)

  async function handleStop() {
    const sessionIdLocal = currentSession?.id
    if (!sessionIdLocal) return setError('Geen actieve sessie gevonden')

    try {
      await deleteSession(sessionIdLocal)
      // success
      setCurrentSessionId(null)
      navigate('/start-session')
      return
    } catch (err: unknown) {
      // If backend says session not found (404), treat it as success: clear local state and navigate
      const msg = err instanceof Error ? err.message : String(err)
      console.warn('Failed to delete session', msg)
      if (msg.toLowerCase().includes('session not found') || msg.includes('HTTP 404') || msg.toLowerCase().includes('not found')) {
        setCurrentSessionId(null)
        navigate('/start-session')
        return
      }
      setError(`Kon sessie niet stoppen: ${msg}`)
    }
  }

  function handleDayClick(dayName: string, idx: number) {
    setSelectedIdx(idx)
    // placeholder action for day click; replace with real navigation later
    alert(`${dayName} geselecteerd`)
  }

  // styles colocated
  const styles: Record<string, React.CSSProperties> = {
    container: {
      background: 'white',
      padding: '20px 0',
      fontFamily: 'Arial, Helvetica, sans-serif',
      minHeight: '100%',
      // allow horizontal scrolling if scaled content is wider than viewport
      overflowX: 'auto',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'stretch',
    },
    titleWrapper: {
      width: '100%',
      maxWidth: 2000,
      display: 'flex',
      justifyContent: 'flex-start',
      paddingLeft: 16,
      boxSizing: 'border-box',
      marginBottom: 8,
    },
    contentWrapper: {
      width: '100%',
      maxWidth: 2000,
      margin: '0 auto',
      padding: 40,
      paddingTop: 0,
        paddingBottom: 0,
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    },
    title: { fontSize: 32, marginBottom: 2 },
    qa: { color: '#f2c200', fontWeight: 'bold' },
    // spread buttons evenly in one row; allow them to shrink smoothly when screen gets smaller
    days: {
      display: 'flex',
      gap: 20,
      marginBottom: 24,
      flexWrap: 'nowrap',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
    },
    // use flex so cards shrink/grow responsively; minWidth prevents becoming too small
    dayCardButton: {
      // make cards longer and more prominent: larger flex-basis and min width
      flex: '1 1 360px',
      minWidth: 'clamp(180px, 16%, 320px)',
      maxWidth: 920,
      borderRadius: 14,
      overflow: 'hidden',
      background: 'transparent',
      padding: 0,
      border: 'none',
      cursor: 'pointer',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'stretch',
      boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
      position: 'relative',
      transition: 'transform .18s ease, box-shadow .18s ease',
    },
    dayDisabled: {
      opacity: 0.38,
      cursor: 'not-allowed',
      boxShadow: 'none',
    },
    // increase image height so the card looks taller and shows more of the image
    dayImage: { width: '100%', height: 'clamp(220px, 32vh, 560px)', objectFit: 'cover', display: 'block', transition: 'transform .18s ease' },
    dayLabel: {
      textAlign: 'center',
      color: 'white',
      fontWeight: 700,
      padding: '12px 16px',
      width: '100%',
      boxSizing: 'border-box',
      borderBottomLeftRadius: 14,
      borderBottomRightRadius: 14,
      background:
        'linear-gradient(180deg, rgba(0,0,0,0), rgba(0,0,0,0.06)), linear-gradient(180deg, rgba(242,194,0,0.98), rgba(231,184,0,0.98))',
      height: 'clamp(56px, 8vh, 110px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 'clamp(14px, 1.8vw, 20px)',
    },
    buttonsWrap: { display: 'flex', gap: 24, justifyContent: 'center', marginTop: 18, flexWrap: 'wrap' },
    btn: {
      padding: '14px 28px',
      borderRadius: 10,
      border: 'none',
      fontWeight: 800,
      cursor: 'pointer',
      minWidth: 160,
      fontSize: 'clamp(16px, 1.6vw, 20px)',
      boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
      transition: 'transform .12s ease, box-shadow .12s ease',
    },
    yellow: { background: '#f2c200', color: 'white' },
    red: { background: '#e53b3b', color: 'white' },
    error: { color: '#e74c3c', marginBottom: 12 },
  }

  // scale wrapper style computed at render time so it uses the latest `scale`
  const scaleWrapperStyle: React.CSSProperties = {
     width: DESIGN_WIDTH,
     transform: `scale(${scale})`,
     transformOrigin: 'top center',
     margin: '0 auto',
   }

  return (
    <main style={{ padding: 0 }}>
      <div style={styles.container}>
        <div style={styles.titleWrapper}>
          <h1 style={styles.title}>
            <span style={styles.qa}>QA</span> kalender
          </h1>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <div style={styles.contentWrapper}>
          <div style={{ ...scaleWrapperStyle, filter: showManage ? 'blur(6px)' : undefined, pointerEvents: showManage ? 'none' : undefined }}>
            <div style={styles.days}>
              {days.map((day, idx) => {
                // all days enabled
                const active = (hoverIdx === idx || focusIdx === idx) || selectedIdx === idx
                const buttonStyle: React.CSSProperties = {
                  ...styles.dayCardButton,
                  transform: active ? 'translateY(-6px)' : undefined,
                  boxShadow: active ? '0 10px 30px rgba(0,0,0,0.16)' : styles.dayCardButton.boxShadow,
                }
                const imgStyle: React.CSSProperties = {
                  ...styles.dayImage,
                  borderTopLeftRadius: 14,
                  borderTopRightRadius: 14,
                  transform: active ? 'scale(1.04)' : undefined,
                }

                return (
                  <button
                    key={day.name}
                    onClick={() => handleDayClick(day.name, idx)}
                    style={buttonStyle}
                    aria-label={day.name}
                    aria-pressed={selectedIdx === idx}
                    onMouseEnter={() => setHoverIdx(idx)}
                    onMouseLeave={() => setHoverIdx(null)}
                    onFocus={() => setFocusIdx(idx)}
                    onBlur={() => setFocusIdx(null)}
                  >
                    {/* image container - keep full image visible */}
                    <div style={{ width: '100%', overflow: 'hidden' }}>
                      {day.img ? <img src={day.img} alt={day.name} style={{ ...imgStyle, borderTopLeftRadius: 14, borderTopRightRadius: 14 }} /> : null}
                    </div>
                    {/* label below image so the image isn't covered */}
                    <div style={{ ...styles.dayLabel }}>{day.name}</div>
                  </button>
                )
              })}
            </div>

            <div style={styles.buttonsWrap}>
              <button id="ScoreboardBtn" onClick={() => hasSession ? navigate('/scoreboard') : setError('Geen actieve sessie')} style={{ ...styles.btn, ...styles.yellow, ...( !hasSession ? { opacity: 0.6, cursor: 'not-allowed' } : {}) }}>Scorebord</button>
              <button onClick={() => setShowManage(true)} style={{ ...styles.btn, ...styles.yellow }}>Spelers beheren</button>
              <button onClick={handleStop} disabled={!hasSession} title={!hasSession ? 'Geen actieve sessie om te stoppen' : 'Stop het huidige QA-kamp'} style={{ ...styles.btn, ...styles.red, ...( !hasSession ? { opacity: 0.5, cursor: 'not-allowed' } : {}) }}>QA-kamp stoppen</button>
             </div>
          </div>
        </div>
       </div>
      {/* Modal for ManagePlayers */}
      {showManage && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            /* overlay made transparent per request */
            backgroundColor: 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: 20,
          }}
          onClick={() => setShowManage(false)}
        >
          <div
             ref={modalRef}
             tabIndex={-1}
             onClick={(e) => e.stopPropagation()}
             style={{
                width: 'min(1000px, 96%)',
                maxHeight: '90vh',
                position: 'relative',
              }}
            >
            <ManagePlayers onClose={() => setShowManage(false)} />
           </div>
         </div>
       )}
     {/* Modal for ManagePlayers */}
    </main>
  )
}
