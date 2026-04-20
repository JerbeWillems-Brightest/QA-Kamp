import './App.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
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
    return (
        <AuthProvider>
        <SessionProvider>
        <BrowserRouter>
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

            {/* Footer */}
            <footer className="footer">
                <div className="footer-inner">
                 <div>
                     <h3>Over QA kamp</h3>
                     <p>Leerrijke IT-minigames voor jongeren</p>
                     <p>tussen de 8 en 16 jaar</p>
                 </div>

                 <div>
                     <h3>Contact</h3>
                     <p>Brightest NV - HQ</p>
                     <p>Satenrozen 10, 2550 Kontich</p>
                     <p>Tel: +32 3 450 88 42</p>
                     <p>Email: thebrightacademy@brightest.be</p>
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

        </div>
        </BrowserRouter>
        </SessionProvider>
        </AuthProvider>
     );
}

export default App
