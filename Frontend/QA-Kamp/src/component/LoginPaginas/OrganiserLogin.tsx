import { useState } from 'react';
import { Link } from 'react-router-dom';
import LineImg from '../../assets/Line.png';
import CurveImg from '../../assets/curve.png';
import ShapeImg from '../../assets/shape.png';
import BallImg from '../../assets/ball.png';
// Use Vite env or fallback to localhost backend for development
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'

export default function OrganiserLogin() {

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (loading) return
        setLoading(true)
        try {
            const res = await fetch(`${API_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            })

            const data = await res.json().catch(() => ({}))
            if (res.ok) {
                // Backend returns message 'Succesvol ingelogd'
                alert(data.message ?? 'Succesvol ingelogd')
            } else {
                // Show backend error message or generic
                alert(data.error ?? data.message ?? 'Fout bij inloggen')
            }
        } catch (err) {
            console.error('Login network error', err)
            alert('Netwerkfout: kon niet verbinden met de server')
        } finally {
            setLoading(false)
        }
    }

    return (
        <main className="main">
            {/* Back link positioned under the navbar, top-left (not inside navbar) */}
            <Link to="/" className="back-link" aria-label="Terug naar home">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>Terug</span>
            </Link>

            {/* Single-row 3-column layout for this page */}
            <div className="body-grid single-row">

                {/* LEFT COLUMN: Line then Curve stacked */}
                <div className="col-left">
                    <img src={LineImg} alt="Line decoration" className="grid-img" />
                    <img src={CurveImg} alt="Curve decoration" className="grid-img" />
                </div>

                {/* CENTER COLUMN: Login content */}
                <div className="col-center">
                    <div className="hero-inner center-card">
                        <h1 style={{ padding: 8, marginTop: 8 }}>Organisator login</h1>
                        <h2 style={{ margin: '6px 0 18px 0', color: '#444' }}>Beheer het QA-Kamp vanuit je dashboard</h2>

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '12px', padding: '8px 12px', width: '100%' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <label htmlFor="email" style={{ fontSize: 13, fontWeight: 600, alignSelf: 'flex-start', textAlign: 'left' }}>Emailadres:</label>
                                <input
                                    id="email"
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    style={{ padding: '10px', width: '100%', borderRadius: '6px', border: '1px solid #ccc' }}
                                />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <label htmlFor="password" style={{ fontSize: 13, fontWeight: 600, alignSelf: 'flex-start', textAlign: 'left' }}>Wachtwoord:</label>
                                <input
                                    id="password"
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    style={{ padding: '10px', width: '100%', borderRadius: '6px', border: '1px solid #ccc' }}
                                />
                            </div>

                            <button
                                type="submit"
                                className="cta"
                                disabled={loading}
                                style={{ height: 42, padding: '8px 12px', backgroundColor: '#f4b400', border: 'none', borderRadius: '6px', color: 'white', fontWeight: 700, cursor: loading ? 'default' : 'pointer', fontSize: 16, opacity: loading ? 0.7 : 1 }}
                            >
                                {loading ? 'Bezig...' : 'Login'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* RIGHT COLUMN: Shape then Ball stacked */}
                <div className="col-right">
                    <img src={ShapeImg} alt="Shape decoration" className="grid-img" />
                    <img src={BallImg} alt="Ball decoration" className="grid-img" />
                </div>

            </div>
        </main>
    );
}
