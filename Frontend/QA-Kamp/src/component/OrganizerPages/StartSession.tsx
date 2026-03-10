import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { createSession, getSessions } from '../../api'
import LineImg from "../../assets/Line.png";
import CurveImg from "../../assets/curve.png";
import StarImg from "../../assets/Star.png";
import ShapeImg from "../../assets/shape.png";
import BallImg from "../../assets/ball.png";

export default function StartSession(){
    const auth = useAuth()
    const navigate = useNavigate()

    useEffect(() => {
        if (!auth.user) {
            navigate('/organizer-login')
            return
        }

        // check if organizer already has an active session
        (async () => {
            try {
                const res = await getSessions(auth.user!.id)
                const sessions = res.sessions || []
                if (sessions.length > 0) {
                    const s = sessions[0]
                    // store and go directly to day overview
                    localStorage.setItem('currentSessionId', s.id)
                    navigate('/day-overview')
                }
            } catch (err) {
                console.error('Failed to check sessions', err)
            }
        })()
    }, [auth.user, navigate])

    return(
        <main className="main">

            {/* 3 columns x 2 rows grid (same as HomePage) */}
            <div className="body-grid three-col">

                <div className="grid-top-left">
                    <img src={LineImg} alt="Line decoration" className="grid-img" />
                </div>

                <div className="grid-top-center">
                    <img src={StarImg} alt="Star decoration" className="grid-img" />
                </div>

                <div className="grid-top-right">
                    <img src={ShapeImg} alt="Shape decoration" className="grid-img" />
                </div>

                <div className="grid-bottom-left">
                    <img src={CurveImg} alt="Curve decoration" className="grid-img" />
                </div>

                <div className="grid-bottom-center">
                    <div className="hero-inner center-card">
                        <h1 style={{ padding: 8, marginTop: 8 }}>Klik om het QA-kamp te starten.</h1>
                        <form style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '12px', padding: '8px 12px', width: '100%' }} onSubmit={e => e.preventDefault()}>
                            <button
                                type="button"
                                aria-label="Start QA-Kamp"
                                onClick={async () => {
                                    if (!auth.user) return
                                    try {
                                        const resp = await createSession(auth.user.id, `Sessie door ${auth.user.email}`)
                                        if (resp.session && resp.session.id) {
                                            // store current session id in localStorage so DayOverview can access it
                                            localStorage.setItem('currentSessionId', resp.session.id)
                                            navigate('/day-overview')
                                        } else {
                                            alert('Kon sessie niet starten')
                                        }
                                    } catch (err) {
                                        console.error('Create session failed', err)
                                        alert('Kon sessie niet starten')
                                    }
                                }}
                                style={{
                                    backgroundColor: '#28a745',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: 6,
                                    padding: '10px 14px',
                                    fontSize: 16,
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                Starten
                            </button>
                        </form>
                    </div>
                </div>

                <div className="grid-bottom-right">
                    <img src={BallImg} alt="Ball decoration" className="grid-img" />
                </div>

            </div>
        </main>
    )
}