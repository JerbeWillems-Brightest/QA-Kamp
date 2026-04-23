import React, { useEffect } from 'react'
import './App.css'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import HomePage from './component/LoginPages/HomePage'
import OrganizerLogin from './component/LoginPages/OrganizerLogin'
import StartSession from './component/OrganizerPages/StartSession'
import DayOverview from './component/OrganizerPages/DayOverview'
import ManagePlayers from './component/OrganizerPages/ManagePlayers'
import Scoreboard from './component/OrganizerPages/Scoreboard'
import DayDashboard from './component/OrganizerPages/MinigamePages/DayDashboard.tsx'
import MinigameLoader from './component/Minigames/MinigameLoader'
import BrightestLogo from './assets/BrightestLogo.png'
import { AuthProvider } from './context/AuthContext'
import { SessionProvider } from './context/SessionContext'
import Navbar from './component/Navbar'
import WaitingRoom from './component/PlayerPages/WaitingRoom'

function App() {
    // We need to use useLocation to know the current route in order to hide
    // the footer during minigames. useLocation must be used inside a Router,
    // so create an inner component that renders the page contents.
    const InnerApp: React.FC = () => {
        const location = useLocation()
        // hide footer for any route that includes '/minigame'
        const hideFooter = location.pathname.includes('/minigame')

        useEffect(() => {
            try {
                if (hideFooter) document.body.classList.add('pz-no-footer')
                else document.body.classList.remove('pz-no-footer')
            } catch { /* ignore */ }
            return () => { try { document.body.classList.remove('pz-no-footer') } catch { /* ignore */ } }
        }, [hideFooter])

        return (
            <div className="page">
                {/* Navbar */}
                <Navbar />

                {/* Main content */}
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/organizer-login" element={<OrganizerLogin />} />
                  <Route path="/start-session" element={<StartSession />} />
                  <Route path="/day-overview" element={<DayOverview />} />
                  <Route path="/day/:day" element={<DayDashboard />} />
                  <Route path="/minigame" element={<MinigameLoader />} />
                  <Route path="/minigame/passwordzapper" element={<MinigameLoader />} />
                  <Route path="/player/waiting" element={<WaitingRoom />} />
                  <Route path="/manage-players" element={<ManagePlayers />} />
                  <Route path="/scoreboard" element={<Scoreboard />} />
                </Routes>

                {/* Footer (hidden on minigame routes) */}
                {!hideFooter && (
                  <>
                    <footer className="footer">
                        <div className="footer-inner">
                         <div>
                             <h3>Over QA kamp</h3>
                             <p>Leerrijke IT-minigames voor jongeren</p>
                             <p>tussen de 8 en 16 jaar</p>
                         </div>

                         <div>
                             <h3>Contact</h3>
                             <p>Brightest East</p>
                             <p>Thor Park André Dumontlaan 67 3600 Genk</p>
                             <p>+32 (0)8 939 59 79</p>
                             <p>info@brightest.be</p>
                         </div>

                         <div>
                             <h3>Pagina's</h3>
                             <p>Organisator Login</p>
                             <p>Overzicht Spellen</p>
                             <p>Minigames</p>
                         </div>
                        </div>
                    </footer>

                    {/* Black bottom bar */}
                    <div className="site-bottom">
                        <img src={BrightestLogo} alt="Brightest logo" className="site-bottom-logo" />
                        <span className="site-bottom-text">QA kamp | Website by Brightest</span>
                    </div>
                  </>
                )}
            </div>
        )
    }

    return (
        <AuthProvider>
        <SessionProvider>
        <BrowserRouter>
            <InnerApp />
        </BrowserRouter>
        </SessionProvider>
        </AuthProvider>
    )
}

export default App
