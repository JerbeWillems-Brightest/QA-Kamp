import './App.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomePage from './component/LoginPages/HomePage'
import OrganiserLogin from './component/LoginPages/OrganiserLogin'
import StartSession from './component/OrganizerPages/StartSession'
import DayOverview from './component/OrganizerPages/DayOverview'
import ManagePlayers from './component/OrganizerPages/ManagePlayers'
import BrightestLogo from './assets/BrightestLogo.png'
import { AuthProvider } from './context/AuthContext'
import Navbar from './component/Navbar'

function App() {
    return (
        <AuthProvider>
        <BrowserRouter>
        <div className="page">

            {/* Navbar */}
            <Navbar />

            {/* Main content */}
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/organiser-login" element={<OrganiserLogin />} />
              <Route path="/start-session" element={<StartSession />} />
              <Route path="/day-overview" element={<DayOverview />} />
              <Route path="/manage-players" element={<ManagePlayers />} />
            </Routes>

            {/* Footer */}
            <footer className="footer">
                <div className="footer-inner">
                 <div>
                     <h3>Over QA Kamp</h3>
                     <p>Leerrijke IT minigames voor jongeren</p>
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
                     <p>Organisator login</p>
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
        </AuthProvider>
     );
}

export default App
