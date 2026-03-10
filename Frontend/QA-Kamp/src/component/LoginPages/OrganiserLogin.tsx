import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import LineImg from '../../assets/Line.png';
import CurveImg from '../../assets/curve.png';
import ShapeImg from '../../assets/shape.png';
import BallImg from '../../assets/ball.png';
import { loginOrganizer } from '../../api'
import { useAuth } from '../../context/AuthContext'

export default function OrganiserLogin() {

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false)
    const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
    const [generalError, setGeneralError] = useState('');
    const navigate = useNavigate()
    const auth = useAuth()

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (loading) return
        setLoading(true)
        setFieldErrors({})
        setGeneralError('')

        // simple client validation
        const nextFieldErrors: { email?: string; password?: string } = {}
        if (!email) nextFieldErrors.email = 'Vul je emailadres in'
        // basic email format
        else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) nextFieldErrors.email = 'Ongeldig emailadres'
        if (!password) nextFieldErrors.password = 'Vul je wachtwoord in'

        if (Object.keys(nextFieldErrors).length) {
            setFieldErrors(nextFieldErrors)
            setLoading(false)
            return
        }

        try {
            const data = await loginOrganizer(email, password)
            // on success, persist login and navigate
            if (data.user) {
                auth.login(data.user)
                navigate('/start-session')
                return
            }
            // fallback: if backend returns message but no user
            setGeneralError(data.message || 'Onbekende fout bij inloggen')
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err)
            console.error('Login error', err)

            const isInvalidCredentials = (s?: string) => {
                if (!s) return false
                const v = s.toLowerCase().trim()
                return v === 'invalid credentials' || v === 'invalid credential' || v === 'invalid_credentials' || v === 'invalid'
            }

            // direct message mapping
            if (isInvalidCredentials(msg)) {
                setGeneralError('Foute Inloggegevens')
            } else {
                // try to parse structured backend response
                try {
                    const parsed = JSON.parse(msg)
                    const parsedMsg = parsed?.error || parsed?.message || undefined
                    if (parsed?.field && parsed?.error) {
                        setFieldErrors({ [parsed.field]: parsed.error })
                    } else if (isInvalidCredentials(parsedMsg)) {
                        setGeneralError('Foute Inloggegevens')
                    } else {
                        setGeneralError(parsedMsg || msg || 'Fout bij inloggen')
                    }
                } catch (parseErr) {
                    // couldn't parse, fallback to raw msg
                    console.warn('Could not parse backend error message', parseErr)
                    setGeneralError(msg || 'Fout bij inloggen')
                }
            }
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

                        {generalError && (
                            <div style={{ color: '#e74c3c', marginBottom: 8 }}>{generalError}</div>
                        )}

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '12px', padding: '8px 12px', width: '100%' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <label htmlFor="email" style={{ fontSize: 13, fontWeight: 600, alignSelf: 'flex-start', textAlign: 'left' }}>Emailadres:</label>
                                <input
                                    id="email"
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    style={{ padding: '10px', width: '100%', borderRadius: '6px', border: fieldErrors.email ? '1px solid #e74c3c' : '1px solid #ccc' }}
                                />
                                {fieldErrors.email && <div style={{ color: '#e74c3c', fontSize: 13 }}>{fieldErrors.email}</div>}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <label htmlFor="password" style={{ fontSize: 13, fontWeight: 600, alignSelf: 'flex-start', textAlign: 'left' }}>Wachtwoord:</label>
                                <input
                                    id="password"
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    style={{ padding: '10px', width: '100%', borderRadius: '6px', border: fieldErrors.password ? '1px solid #e74c3c' : '1px solid #ccc' }}
                                />
                                {fieldErrors.password && <div style={{ color: '#e74c3c', fontSize: 13 }}>{fieldErrors.password}</div>}
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
