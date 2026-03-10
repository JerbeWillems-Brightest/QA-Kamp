import { useState } from 'react';
import { Link } from 'react-router-dom';
import LineImg from '../../assets/Line.png';
import CurveImg from '../../assets/curve.png';
import ShapeImg from '../../assets/shape.png';
import StarImg from '../../assets/Star.png';
import RocketImg from '../../assets/Rocketship.png';

function HomePage() {
  const [playerNumber, setPlayerNumber] = useState('');
  const [numberError, setNumberError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // validate: must be non-empty and numeric
    if (!playerNumber) {
      setNumberError('Vul je spelersnummer in');
      return;
    }
    if (!/^\d+$/.test(playerNumber)) {
      setNumberError('Alleen cijfers zijn toegestaan');
      return;
    }
    setNumberError('');
    alert(`Spelersnummer: ${playerNumber}`);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    // remove any non-digit characters so letters are not allowed
    const cleaned = raw.replace(/\D/g, '');
    if (cleaned !== raw) {
      setNumberError('Alleen cijfers zijn toegestaan');
    } else {
      setNumberError('');
    }
    setPlayerNumber(cleaned);
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
