import { useState } from 'react';
import { Link } from 'react-router-dom';
import LineImg from '../../assets/Line.png';
import CurveImg from '../../assets/curve.png';
import ShapeImg from '../../assets/shape.png';
import StarImg from '../../assets/Star.png';
import RocketImg from '../../assets/Rocketship.png';

function HomePage() {
  const [playerNumber, setPlayerNumber] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    alert(`Spelersnummer: ${playerNumber}`);
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
                placeholder="Voer spelersnummer in"
                required
                value={playerNumber}
                onChange={(e) => setPlayerNumber(e.target.value)}
                style={{ padding: '10px', width: '220px', borderRadius: '6px', border: '1px solid #ccc' }}
              />

              <button
                type="submit"
                className="cta"
                style={{height: 40 , width: '220px' , padding: '6px 12px', backgroundColor: '#f4b400', border: 'none', borderRadius: '6px', color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '18px' }}
              >
                Speel mee
              </button>

              <Link to="/organiser-login" style={{ padding: 10, fontSize: '12px', color: '#3a78d0'}}>
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
