import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Navbar from './Navbar'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'

describe('Navbar', () => {
  // Test: controleert dat het QA Kamp-logo zichtbaar is en dat er geen uitlog-knop
  // wordt weergegeven wanneer de gebruiker niet is ingelogd (AuthProvider levert geen sessie).
  it('renders logo and no logout when not logged in', () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <Navbar />
        </AuthProvider>
      </BrowserRouter>
    )

    const logo = screen.getByAltText(/QA Kamp logo/i)
    expect(logo).toBeDefined()
    // logout button should not be present when not logged in
    expect(screen.queryByLabelText(/uitloggen/i)).toBeNull()
  })
})
