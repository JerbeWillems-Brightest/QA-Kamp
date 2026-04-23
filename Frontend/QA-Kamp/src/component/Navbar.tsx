import type { MouseEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import QAKampLogo from '../assets/QAKamp.png'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const auth = useAuth()
  const navigate = useNavigate()

  function handleLogout(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault()
    // If a player is logged in via sessionStorage, clear player session
    const playerNumber = sessionStorage.getItem('playerNumber')
    if (playerNumber) {
      try {
        const sess = sessionStorage.getItem('playerSessionId') ?? localStorage.getItem('currentSessionId')
        if (sess) {
          try { void import('../api').then(m => m.setPlayerOffline(sess, playerNumber)).catch(() => {}) } catch { /* ignore */ }
        }
      } catch { /* ignore */ }
      try {
        const raw = localStorage.getItem('onlinePlayers')
        if (raw) {
          const arr = JSON.parse(raw) as string[]
          // remove both plain and padded forms
          const plain = String(playerNumber)
          const padded = plain.padStart(3, '0')
          const filtered = arr.filter(n => String(n) !== plain && String(n) !== padded)
          localStorage.setItem('onlinePlayers', JSON.stringify(filtered))
          try { window.dispatchEvent(new StorageEvent('storage', { key: 'onlinePlayers', newValue: JSON.stringify(filtered) })) } catch { /* ignore */ }
        }
      } catch {
        // ignore
      }
      try {
        sessionStorage.removeItem('playerNumber')
        sessionStorage.removeItem('playerSessionId')
        sessionStorage.removeItem('playerOnlineLocked')
      } catch {
          // ignore error
      }
      // Also remove the currentsessionid so a subsequent login will re-fetch the active session
      try { localStorage.removeItem('currentSessionId'); try { window.dispatchEvent(new StorageEvent('storage', { key: 'currentSessionId', newValue: null })) } catch { /* ignore */ } } catch { /* ignore */ }
      navigate('/')
      return
    }

    // Otherwise assume organizer logout -> send to organizer login page
    auth.logout()
    navigate('/organizer-login')
  }

  // Show logout button when organizer logged in or player session present
  const playerNumber = typeof window !== 'undefined' ? sessionStorage.getItem('playerNumber') : null

  return (
    <nav className="navbar" style={{ display: 'flex', alignItems: 'center', padding: '8px 16px' }}>
      <div className="logo-container">
        <Link to="/">
          <img src={QAKampLogo} alt="QA Kamp logo" style={{ height: 56, width: 'auto' }} />
        </Link>
      </div>

      <div style={{ marginLeft: 'auto', paddingRight: 16 }}>
        {auth.user || playerNumber ? (
          <button
            onClick={handleLogout}
            className="logout-button"
            aria-label="Uitloggen"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: '#ffffff',
              color: '#000000',
              border: '1px solid rgba(0,0,0,0.08)',
              borderRadius: 6,
              padding: '8px 12px',
              cursor: 'pointer',
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = '#f6f6f6')}
            onMouseOut={(e) => (e.currentTarget.style.background = '#ffffff')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M16 13v-2H7V8l-5 4 5 4v-3h9z" fill="currentColor" />
              <path d="M20 3h-8v2h8v14h-8v2h8c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" fill="currentColor" />
            </svg>
            <span style={{ fontWeight: 600 }}>Uitloggen</span>
          </button>
        ) : null}
      </div>
    </nav>
  )
}
