import { useEffect, useState } from 'react'
import { setActiveGameInfo } from '../../../api'

export type MinigamePopupProps = {
  isOpen: boolean
  title: string
  rules: string
  image?: string
  onStart?: () => void
  onStop?: () => void
  onClose: () => void
  running?: boolean
}

export default function MinigamePopup({
  isOpen,
  title,
  rules,
  image,
  onStart,
  onStop,
  onClose,
  running = false,
}: MinigamePopupProps) {
  useEffect(() => {
    if (typeof document === 'undefined') return
    if (document.getElementById('minigame-popup-styles')) return
    const styles = `
    .minigame-modal-overlay{ position:fixed; inset:0; background:rgba(0,0,0,0.45); display:flex; align-items:center; justify-content:center; z-index:1200 }
    .minigame-modal{ background:white; border-radius:12px; width:clamp(320px, 70%, 900px); max-height:90vh; overflow:auto; padding:18px; box-shadow:0 20px 60px rgba(0,0,0,0.3); position:relative }
    .minigame-modal-close{ position:absolute; right:12px; top:12px; background:rgba(0,0,0,0.35); color:#fff; border:none; font-size:20px; cursor:pointer; width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center }
    /* Make overlay non-blocking so navigation and other page controls remain clickable while modal is open.
          The modal itself remains interactive so close/start/stop work as expected. */
    .minigame-modal-overlay { pointer-events: none }
    .minigame-modal { pointer-events: auto }
    .minigame-modal-image{ width:100%; height:240px; object-fit:cover; border-radius:8px; margin-bottom:14px }
    .minigame-modal-title{ margin:6px 0 8px; font-size:28px; text-align:left }
    .minigame-modal-rules{ color:#444; margin-top:10px; line-height:1.6; text-align:left; font-size:16px }
    .minigame-modal-content{ text-align:left; padding: 0 6px }
    .minigame-modal-actions{ margin-top:22px; display:flex; justify-content:center; gap:12px }
    .minigame-modal-actions .cta{ background:var(--yellow, #22c55e); color:#fff; padding:12px 22px; border-radius:8px; border:none; font-weight:700; cursor:pointer }
    .minigame-modal-actions .danger{ background:#ef4444; color:#fff; padding:12px 22px; border-radius:8px; border:none; font-weight:700; cursor:pointer }
    .day-dashboard.modal-open .dashboard-inner{ filter: blur(6px); }
    .minigame-age-pills{ display:flex; gap:8px; margin-top:12px; justify-content:flex-start }
    .minigame-pill{ border:1px solid #ddd; padding:6px 10px; border-radius:999px; cursor:pointer; background:#fff }
    .minigame-pill.active{ background:var(--yellow, #f2c200); color:#111; border-color:transparent; font-weight:700 }
    `.trim()
    document.head.insertAdjacentHTML('beforeend', `<style id="minigame-popup-styles">${styles}</style>`)
  }, [])

  const [isRunning, setIsRunning] = useState<boolean>(!!running)

  useEffect(() => {
    const newRunning = !!running
    // eslint-disable-next-line react-hooks/exhaustive-deps
    setIsRunning(newRunning)
  }, [running])
  

  useEffect(() => {
    if (typeof document === 'undefined') return
    const root = document.querySelector('.day-dashboard')
    if (!root) return
    if (isOpen || isRunning) {
      root.classList.add('modal-open')
    } else {
      root.classList.remove('modal-open')
    }
    return () => {
      try {
        if (!(isOpen || isRunning)) root.classList.remove('modal-open')
      } catch {
        // ignore if DOM gone
      }
    }
  }, [isOpen, isRunning])


  function handleStart(){
    setIsRunning(true)
    if (onStart) onStart()
  }
  async function handleStop(){
    setIsRunning(false)

    if (onStop) {
      try {
        await onStop()
      } catch (err) {
        console.warn('MinigamePopup: onStop handler failed', err)
      }
    }

    try {
      let sid: string | null
      try { sid = localStorage.getItem('currentSessionId') } catch { sid = null }
      if (sid) {

        let hasActive: boolean
        try { hasActive = localStorage.getItem('activeGameInfo') !== null } catch { hasActive = false }
        if (hasActive) {
          try {
            await setActiveGameInfo(sid, null)
          } catch (e) {
            console.warn('MinigamePopup: failed to clear activeGameInfo on server', e)
            try {
              if (typeof window !== 'undefined' && typeof window.alert === 'function') {
                window.alert('Kon spel niet stoppen op server')
              }
            } catch { /* ignore */ }
          }
        }
      }
    } catch { /* ignore */ }

    try {
      try { localStorage.removeItem('activeGameInfo') } catch (e) { void e }
      try { window.dispatchEvent(new CustomEvent('activeGameInfoChanged', { detail: null })) } catch (e) { void e }
      try { window.dispatchEvent(new StorageEvent('storage', { key: 'activeGameInfo', newValue: null })) } catch (e) { void e }
    } catch (err) {
      console.warn('MinigamePopup: failed to notify other tabs of stop', err)
    }
  }

  if (!isOpen) return null

  const displayedRules = rules

  const overlayClick = () => { if (!isRunning) onClose() }

  return (
    <div className="minigame-modal-overlay" role="dialog" aria-modal="true" onClick={overlayClick}>
      <div className="minigame-modal" onClick={(e) => e.stopPropagation()}>
        {/* Close button is always clickable; closing the modal does not re-enable the UI while a game is running */}
        <button id="ExitPopUpbtn" className="minigame-modal-close" aria-label="Sluit" onClick={() => onClose()}>✕</button>

        {image && <img className="minigame-modal-image" src={image} alt={title} />}

        <div className="minigame-modal-content">
          <h2 className="minigame-modal-title">{title}</h2>

          {/* Age pills removed: popup shows one unified rules text for all ages */}

          <p className="minigame-modal-rules">{displayedRules}</p>

          <div className="minigame-modal-actions">
            {!isRunning ? (
              <button id="StartGameBtn" className="cta" onClick={handleStart}>Spel starten</button>
            ) : (
              <button id="StopGameBtn" className="danger" onClick={handleStop}>Spel stoppen</button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
