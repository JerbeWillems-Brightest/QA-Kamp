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

    if (numberError) {
      return;
    }

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

    if (playerNumber.length !== 3) {
      setNumberError('Spelersnummer moet uit precies 3 cijfers bestaan');
      return;
    }

    const existingSessionId = (() => { try { return localStorage.getItem('currentSessionId') } catch { return null } })()
    if (existingSessionId) {
      try {
        const resp = await api.fetchOnlinePlayers(existingSessionId)
        const serverOnline = (resp.onlinePlayers || []).map(p => String(p.playerNumber))
        localStorage.setItem('onlinePlayers', JSON.stringify(serverOnline))
      } catch {
        // If sync fails, fall back to localStorage uniqueness check below.
      }
    }

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

        try {
          sessionStorage.setItem('playerNumber', playerNumber)
          sessionStorage.setItem('playerSessionId', existingSessionId)
          sessionStorage.setItem('playerOnlineLocked', 'true')
        } catch { /* ignore */ }
        try {
          const raw = localStorage.getItem('onlinePlayers')
          const online: string[] = raw ? (JSON.parse(raw) as string[]) : []
          if (online.includes(playerNumber)) {
            setNumberError('Dit spelersnummer is al ingelogd in deze browser')
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

        try {
              const res = await api.fetchPlayersForSession(existingSessionId)
              const found = (res.players || []).some((p: ApiPlayer) => p.playerNumber === playerNumber)
              if (!found) {
            try { sessionStorage.removeItem('playerNumber'); sessionStorage.removeItem('playerSessionId') } catch (err) { void err }
            try { sessionStorage.removeItem('playerOnlineLocked') } catch { /* ignore */ }
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

    try {
      const resp = await api.joinActiveSession(playerNumber)
      if (!resp || !resp.session || !resp.player) {
        setNumberError('Je bent niet toegevoegd aan deze sessie. Vraag de organisator om je toe te voegen.')
        return
      }

      const serverSessionId = String((resp.session as Record<string, unknown>).id ?? (resp.session as Record<string, unknown>)._id ?? '')

      try {
        const raw = localStorage.getItem('onlinePlayers')
        const online: string[] = raw ? (JSON.parse(raw) as string[]) : []
        if (online.includes(playerNumber)) {
          setNumberError('Dit spelersnummer is al ingelogd in deze browser')
          try { await api.setPlayerOffline(serverSessionId, playerNumber) } catch { /* ignore */ }
          return
        }
        online.push(playerNumber)
        localStorage.setItem('onlinePlayers', JSON.stringify(online))
      } catch {
        // ignore localStorage errors
      }

      try {
        localStorage.setItem('currentSessionId', serverSessionId)
        sessionStorage.setItem('playerNumber', playerNumber)
        sessionStorage.setItem('playerSessionId', serverSessionId)
        sessionStorage.setItem('playerOnlineLocked', 'true')
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

      setNumberError(msg.includes('Player not found') || /not found/i.test(msg) ? 'Je bent niet toegevoegd aan deze sessie. Vraag de organisator om je toe te voegen.' : 'Er is een fout opgetreden bij het controleren van je spelersnummer')
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;

    const cleaned = raw.replace(/\D/g, '');
    const truncated = cleaned.slice(0, 3);

    if (cleaned !== raw) {
      setNumberError('Geen letters of speciale tekens toegestaan');
    } else if (cleaned.length > 3) {
      setNumberError('Maximaal 3 cijfers toegestaan');
    } else {
      setNumberError('');
    }

    setPlayerNumber(truncated);
  }

  useEffect(() => {
    ;(async () => {
      try {
        try {
          if (!localStorage.getItem('onlinePlayers')) localStorage.setItem('onlinePlayers', JSON.stringify([]))
        } catch { /* ignore */ }
      } finally {
        // no state to set; effect just ensures storage keys
      }
    })()
    return () => { }
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
