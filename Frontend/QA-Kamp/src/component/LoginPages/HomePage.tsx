import { useRef, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import LineImg from '../../assets/Line.png';
import CurveImg from '../../assets/curve.png';
import ShapeImg from '../../assets/shape.png';
import StarImg from '../../assets/Star.png';
import RocketImg from '../../assets/Rocketship.png';
import * as api from '../../api'
import type { ApiPlayer } from '../../api'

function HomePage() {
  const [playerNumber, setPlayerNumber] = useState('');
  const [numberError, setNumberError] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null)
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // prevent submitting while there is a known input-format error
    if (numberError) {
      return;
    }

    // Read the live input value to avoid a race with the controlled state in tests
    const rawInput = (inputRef.current && inputRef.current.value) ? inputRef.current.value : playerNumber
    if (!rawInput) {
      setNumberError('Vul je spelersnummer in');
      return;
    }

    if (/\D/.test(rawInput)) {
      setNumberError('Geen letters of speciale tekens toegestaan');
      return;
    }

    if (rawInput.length > 3) {
      setNumberError('Maximaal 3 cijfers toegestaan');
      return;
    }

    // At this point, playerNumber should equal rawInput (or truncated form) and be numeric.
    if (playerNumber.length !== 3) {
      setNumberError('Spelersnummer moet uit precies 3 cijfers bestaan');
      return;
    }

    // Prefer existing client session id (fast path).
    // Before relying on localStorage.onlinePlayers, sync the authoritative server list.
    const existingSessionId = (() => { try { return localStorage.getItem('currentSessionId') } catch { return null } })()
    if (existingSessionId) {
      try {
        const resp = await api.fetchOnlinePlayers(existingSessionId, 15000)
        const serverOnline = (resp.onlinePlayers || []).map(p => String(p.playerNumber))
        localStorage.setItem('onlinePlayers', JSON.stringify(serverOnline))
      } catch {
        // If sync fails, fall back to localStorage uniqueness check below.
      }
    }

    // check uniqueness against localStorage key 'onlinePlayers' (assumed to be an array of used numbers)
    try {
      const raw = localStorage.getItem('onlinePlayers');
      const onlinePlayers: string[] = raw ? (JSON.parse(raw) as string[]) : [];
      if (Array.isArray(onlinePlayers) && onlinePlayers.includes(playerNumber)) {
        setNumberError('Dit spelersnummer is al in gebruik');
        return;
      }
    } catch {
      // if parsing fails, ignore and allow (or treat as empty)
    }

    setNumberError('')
    if (existingSessionId) {
      try {
        // Ask server to mark this player online first (server-authoritative)
        try {
          await api.setPlayerOnline(existingSessionId, playerNumber)
        } catch (srvErr: unknown) {
          const msg = srvErr instanceof Error ? srvErr.message : String(srvErr)
          if (/online/i.test(msg) || /al online/i.test(msg) || /already online/i.test(msg)) {
            setNumberError('Dit spelersnummer is al ingelogd op een ander apparaat')
            return
          }
          console.error('Failed to set player online for existingSessionId', srvErr)
          setNumberError('Er is een fout opgetreden bij het inloggen. Probeer het opnieuw.')
          return
        }

        // Persist session/player values only after server confirmed
        try {
          sessionStorage.setItem('playerNumber', playerNumber)
          sessionStorage.setItem('playerSessionId', existingSessionId)
          // Flag so WaitingRoom knows it already acquired the online lock.
          sessionStorage.setItem('playerOnlineLocked', 'true')
        } catch { /* ignore */ }
        try {
          const raw = localStorage.getItem('onlinePlayers')
          const online: string[] = raw ? (JSON.parse(raw) as string[]) : []
          if (online.includes(playerNumber)) {
            setNumberError('Dit spelersnummer is al ingelogd in deze browser')
            // revert server-side online set by calling offline
            try { await api.setPlayerOffline(existingSessionId, playerNumber) } catch { /* ignore */ }
            try {
              sessionStorage.removeItem('playerNumber')
              sessionStorage.removeItem('playerSessionId')
              sessionStorage.removeItem('playerOnlineLocked')
            } catch { /* ignore */ }
            return
          }
          online.push(playerNumber)
          localStorage.setItem('onlinePlayers', JSON.stringify(online))
        } catch {
          // ignore localStorage errors
        }

        // Now verify on the server that the player exists for this session. If verification fails, revert the optimistic writes.
        try {
              const res = await api.fetchPlayersForSession(existingSessionId)
              const found = (res.players || []).some((p: ApiPlayer) => p.playerNumber === playerNumber)
              if (!found) {
            try { sessionStorage.removeItem('playerNumber'); sessionStorage.removeItem('playerSessionId') } catch (err) { void err }
            try { sessionStorage.removeItem('playerOnlineLocked') } catch { /* ignore */ }
            // remove from onlinePlayers and notify server
            try {
              const raw2 = localStorage.getItem('onlinePlayers')
              const online2: string[] = raw2 ? (JSON.parse(raw2) as string[]) : []
              const idx = online2.indexOf(playerNumber)
              if (idx >= 0) { online2.splice(idx, 1); localStorage.setItem('onlinePlayers', JSON.stringify(online2)) }
            } catch (err) { void err }
            try { await api.setPlayerOffline(existingSessionId, playerNumber) } catch { /* ignore */ }
            setNumberError('Je bent niet toegevoegd aan deze sessie. Vraag de organisator om je toe te voegen.')
            return
          }
          // store player's category/ageGroup if available
          try {
            const player = (res.players || []).find((p: ApiPlayer) => p.playerNumber === playerNumber) as ApiPlayer | undefined
            if (player) {
                const cat = player.category ?? (!Number.isNaN(player.age) ? (player.age <= 10 ? '8-10' : player.age <= 13 ? '11-13' : '14-16') : undefined)
              if (cat) {
                try { sessionStorage.setItem('playerCategory', String(cat)) } catch { /* ignore */ }
              }
            }
          } catch { /* ignore */ }
          navigate('/player/waiting')
          return
        } catch (innerErr: unknown) {
          // verification network failure - revert optimistic writes and show error
          try {
            sessionStorage.removeItem('playerNumber')
            sessionStorage.removeItem('playerSessionId')
            sessionStorage.removeItem('playerOnlineLocked')
          } catch (err) { void err }
          try {
            const raw3 = localStorage.getItem('onlinePlayers')
            const online3: string[] = raw3 ? (JSON.parse(raw3) as string[]) : []
            const idx = online3.indexOf(playerNumber)
            if (idx >= 0) { online3.splice(idx, 1); localStorage.setItem('onlinePlayers', JSON.stringify(online3)) }
          } catch (err) { void err }
          // also tell server to go offline
          try { await api.setPlayerOffline(existingSessionId, playerNumber) } catch { /* ignore */ }
          console.error('error checking players with existingSessionId', innerErr)
          setNumberError('Er is een fout opgetreden bij het controleren van je spelersnummer')
          return
        }
      } catch (err) {
        console.error('unexpected error in existingSessionId branch', err)
        setNumberError('Er is een fout opgetreden bij het controleren van je spelersnummer')
        return
      }
    }

    // No local session id — use server-authoritative join which finds the active session and the player by number
    try {
      const resp = await api.joinActiveSession(playerNumber)
      if (!resp || !resp.session || !resp.player) {
        // server returned 404 or no player found — show friendly message
        setNumberError('Je bent niet toegevoegd aan deze sessie. Vraag de organisator om je toe te voegen.')
        return
      }

      const serverSessionId = String((resp.session as Record<string, unknown>).id ?? (resp.session as Record<string, unknown>)._id ?? '')

      // update onlinePlayers list in localStorage (prevent multiple logins in same browser)
      try {
        const raw = localStorage.getItem('onlinePlayers')
        const online: string[] = raw ? (JSON.parse(raw) as string[]) : []
        if (online.includes(playerNumber)) {
          setNumberError('Dit spelersnummer is al ingelogd in deze browser')
          // revert server-side online set
          try { await api.setPlayerOffline(serverSessionId, playerNumber) } catch { /* ignore */ }
          return
        }
        online.push(playerNumber)
        localStorage.setItem('onlinePlayers', JSON.stringify(online))
      } catch {
        // ignore localStorage errors
      }

      // persist authoritative session/player info
      try {
        localStorage.setItem('currentSessionId', serverSessionId)
        sessionStorage.setItem('playerNumber', playerNumber)
        sessionStorage.setItem('playerSessionId', serverSessionId)
        // Flag so WaitingRoom won't call setPlayerOnline again (prevents 409).
        sessionStorage.setItem('playerOnlineLocked', 'true')
        // persist player's category if backend returned it as part of player
        try {
          const playerObj = (resp.player as ApiPlayer | undefined)
          if (playerObj && (playerObj.category || !Number.isNaN(playerObj.age))) {
            const cat = playerObj.category ?? (!Number.isNaN(playerObj.age) ? (playerObj.age <= 10 ? '8-10' : playerObj.age <= 13 ? '11-13' : '14-16') : undefined)
            if (cat) sessionStorage.setItem('playerCategory', String(cat))
          }
        } catch { /* ignore */ }
      } catch {
        // ignore
      }

      navigate('/player/waiting')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('joinActiveSession failed', msg, err)

      // If the server indicated the player is already online elsewhere, revert optimistic local writes
      if (/online/i.test(msg) || /al online/i.test(msg) || /already online/i.test(msg)) {
        try {
          sessionStorage.removeItem('playerNumber')
          sessionStorage.removeItem('playerSessionId')
          sessionStorage.removeItem('playerOnlineLocked')
        } catch (e) { void e }
        try {
          const raw = localStorage.getItem('onlinePlayers')
          const online: string[] = raw ? (JSON.parse(raw) as string[]) : []
          const idx = online.indexOf(playerNumber)
          if (idx >= 0) { online.splice(idx, 1); localStorage.setItem('onlinePlayers', JSON.stringify(online)) }
        } catch (e) { void e }
        setNumberError('Dit spelersnummer is al ingelogd op een ander apparaat')
        return
      }

      // show friendly message for network/server issues
      setNumberError(msg.includes('Player not found') || /not found/i.test(msg) ? 'Je bent niet toegevoegd aan deze sessie. Vraag de organisator om je toe te voegen.' : 'Er is een fout opgetreden bij het controleren van je spelersnummer')
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;

    // remove any non-digit characters so letters/specials are not allowed
    const cleaned = raw.replace(/\D/g, '');
    // limit to maximum 3 digits
    const truncated = cleaned.slice(0, 3);

    // set appropriate error messages for invalid input as the user types
    if (cleaned !== raw) {
      setNumberError('Geen letters of speciale tekens toegestaan');
    } else if (cleaned.length > 3) {
      setNumberError('Maximaal 3 cijfers toegestaan');
    } else {
      // clear only the input-format related errors; keep uniqueness/emptiness handled on submit
      setNumberError('');
    }

    setPlayerNumber(truncated);
  }

  // Ensure localStorage keys exist when page is opened directly (so other parts of the app can rely on them)
  useEffect(() => {
    ;(async () => {
      try {
        // create onlinePlayers array if missing
        try {
          if (!localStorage.getItem('onlinePlayers')) localStorage.setItem('onlinePlayers', JSON.stringify([]))
        } catch { /* ignore */ }

        // IMPORTANT: do NOT set `currentSessionId` here on page load. We want the player to only receive
        // a `currentSessionId` when they explicitly join (press "Speel mee"). Setting it on load causes
        // other users to see a wrong session id when they first open the app.
        // If you need an authoritative active-session lookup for other UI, do it on-demand from components
        // that require it (e.g. when the player tries to join or when organizer actions need it).

      } finally {
        // no state to set; effect just ensures storage keys
      }
    })()
    return () => { /* cleanup not needed */ }
  }, [])

  return (
    <main className="main">
      <div className="body-grid three-col">
        <div className="grid-top-left">
          <img src={LineImg} alt="Line decoration" className="grid-img" />
        </div>

        <div className="grid-top-center">
          <img src={RocketImg} alt="Rocket" className="grid-rocket" />
        </div>

        <div className="grid-top-right">
          <img src={ShapeImg} alt="Shape decoration" className="grid-img" />
        </div>

        <div className="grid-bottom-left">
          <img src={CurveImg} alt="Curve decoration" className="grid-img" />
        </div>

        <div className="grid-bottom-center">
          <div className="hero-inner">
            <h1 style={{ padding: 25 }}>Voer je spelersnummer in</h1>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: 15}}>
               <input
                 ref={inputRef}
                 type="text"
                 inputMode="numeric"
                 pattern="\d*"
                 placeholder="Voer spelersnummer in"
                 required
                 value={playerNumber}
                 onChange={handleChange}
                 maxLength={3}
                 style={{ padding: '10px', width: '220px', borderRadius: '6px', border: numberError ? '1px solid #e74c3c' : '1px solid #ccc' }}
               />

               {numberError && (
                 <div style={{ color: '#e74c3c', fontSize: 13 }}>{numberError}</div>
               )}

               <button
                 type="submit"
                 className="cta"
                 style={{height: 40 , width: '220px' , padding: '6px 12px', backgroundColor: '#f4b400', border: 'none', borderRadius: '6px', color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '18px' }}
               >
                 Speel mee
               </button>

               <Link to="/organizer-login" style={{ padding: 10, fontSize: '12px', color: '#3a78d0'}}>
                 Log hier in als organisator
               </Link>
             </form>
           </div>
         </div>

        <div className="grid-bottom-right">
          <img src={StarImg} alt="Star decoration" className="grid-img" />
        </div>
      </div>
    </main>
  );
}

export default HomePage;
