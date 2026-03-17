import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import LineImg from '../../assets/Line.png';
import CurveImg from '../../assets/curve.png';
import ShapeImg from '../../assets/shape.png';
import StarImg from '../../assets/Star.png';
import RocketImg from '../../assets/Rocketship.png';
import { fetchPlayersForSession } from '../../api'
import type { ApiPlayer } from '../../api'

function HomePage() {
  const [playerNumber, setPlayerNumber] = useState('');
  const rawInputRef = useRef('');
  const [numberError, setNumberError] = useState('');
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // prevent submitting while there is a known input-format error
    if (numberError) {
      return;
    }

    // Use rawInputRef for format checks to avoid race conditions between change and submit
    const rawInput = rawInputRef.current;

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

    // check there is an active session
    const sessionId = localStorage.getItem('currentSessionId')
    if (!sessionId) {
      setNumberError('Geen actieve sessie gevonden. Probeer later opnieuw.')
      return
    }

    try {
      const res = await fetchPlayersForSession(sessionId)
      const found = (res.players || []).some((p: ApiPlayer) => p.playerNumber === playerNumber)
      if (!found) {
        setNumberError('Je bent niet toegevoegd aan deze sessie. Vraag de organisator om je toe te voegen.')
        return
      }

      // prevent multiple logins with same number in this browser
      try {
        const raw = localStorage.getItem('onlinePlayers')
        const online: string[] = raw ? (JSON.parse(raw) as string[]) : []
        if (online.includes(playerNumber)) {
          setNumberError('Dit spelersnummer is al ingelogd in deze browser')
          return
        }
        online.push(playerNumber)
        localStorage.setItem('onlinePlayers', JSON.stringify(online))
      } catch {
        // ignore localStorage errors
      }

      // store join info for waiting room
      try { sessionStorage.setItem('playerNumber', playerNumber); sessionStorage.setItem('playerSessionId', sessionId) } catch { /* ignore */ }
      navigate('/player/waiting')
    } catch (err) {
      console.error('error checking players', err)
      setNumberError('Er is een fout opgetreden bij het controleren van je spelersnummer')
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    rawInputRef.current = raw;

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
