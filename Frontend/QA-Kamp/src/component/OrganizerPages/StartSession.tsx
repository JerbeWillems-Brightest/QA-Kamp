import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { createSession } from '../../api'
import { useSession } from '../../context/SessionContext'
import LineImg from "../../assets/Line.png";
import CurveImg from "../../assets/curve.png";
import StarImg from "../../assets/Star.png";
import ShapeImg from "../../assets/shape.png";
import BallImg from "../../assets/ball.png";

export default function StartSession(){
    const auth = useAuth()
    const navigate = useNavigate()
    const { setCurrentSessionId, refreshSessions } = useSession()

    useEffect(() => {
        if (!auth.user) {
            navigate('/organizer-login')
            return
        }

        // refresh sessions in context and navigate to latest if present
        (async () => {
            try {
                await refreshSessions()
                // getSessions was called in the context; the context will hold the latest session
                // navigate on next render if the session exists via setCurrentSessionId call after creation
            } catch (err) {
                console.error('Failed to refresh sessions', err)
            }
        })()
    }, [auth.user, navigate, refreshSessions])

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
                                            // set current session in context (avoid localStorage)
                                            setCurrentSessionId(resp.session.id)
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