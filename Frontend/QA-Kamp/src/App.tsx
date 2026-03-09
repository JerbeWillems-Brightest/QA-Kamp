import './App.css'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import HomePage from './component/LoginPaginas/HomePage'
import OrganiserLogin from './component/LoginPaginas/OrganiserLogin'
import QAKampLogo from './assets/QAKamp.png'
import BrightestLogo from './assets/BrightestLogo.png'

function App() {
    return (
        <BrowserRouter>
        <div className="page">

            {/* Navbar */}
            <nav className="navbar">
                <div className="logo-container">
                    <img src={QAKampLogo} alt="QA Kamp logo"/>
                </div>
            </nav>

            {/* Main content */}
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/organiser-login" element={<OrganiserLogin />} />
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
                     <p><Link to="/organiser-login">Organisator login</Link></p>
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
    );
}

export default App
