import './App.css'
import HomePage from './component/LoginPagina\'s/HomePage.tsx'
import QAKampLogo from './assets/QAKamp.png'
import BrightestLogo from './assets/BrightestLogo.png'

function App() {
    return (
        <div className="page">

            {/* Navbar */}
            <nav className="navbar">
                <div className="logo-container">
                    <img src={QAKampLogo} alt="QA Kamp logo"/>
                </div>
            </nav>

            {/* Main content */}
            <HomePage />

            {/* Footer */}
            <footer className="footer">
                <div className="footer-inner">
                 <div>
                     <h3>Over QA Kamp</h3>
                     <br/>
                     <br/>
                     <p>Leerrijke IT minigames voor jongeren</p>
                     <p>tussen de 8 en 16 jaar</p>
                 </div>

                 <div>
                     <h3>Contact</h3>
                     <br/>
                     <br/>
                     <p>Brightest NV - HQ</p>
                     <p>Satenrozen 10, 2550 Kontich</p>
                     <p>Tel: +32 3 450 88 42</p>
                     <p>Email: thebrightacademy@brightest.be</p>
                     <p>BTW: 0538.477.187</p>
                 </div>

                 <div>
                     <h3>Pagina's</h3>
                     <br/>
                     <br/>
                     <p>Organisator login</p>
                 </div>
                </div>
            </footer>

            {/* Black bottom bar */}
            <div className="site-bottom">
                <img src={BrightestLogo} alt="Brightest logo" className="site-bottom-logo" />
                <span className="site-bottom-text">QA kamp | Website by Brightest</span>
            </div>

        </div>
    );
}

export default App
